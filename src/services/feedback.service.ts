import { Types } from 'mongoose'; 
import { Booking } from '../models/bookings.models'; 
import { Feedback } from '../models/feedbacks.models'; 
import { ServicePackage } from '../models/services.models'; 
import { MUA } from '../models/muas.models';

const allowedStatuses = new Set(['COMPLETED', 'DONE', 'FINISHED']); 

const httpError = (status: number, code: string, message: string) => { 
  const e: any = new Error(message); 
  e.status = status; 
  e.code = code; 
  return e; 
}; 

export class FeedbackService { 
  constructor() { 
    // Ensure unique index at runtime to satisfy 1 booking -> 1 feedback 
    Feedback.collection.createIndex({ bookingId: 1 }, { unique: true }).catch(() => {}); 
  } 

  private async assertOwnershipAndStatus(userId: string, bookingId: string) { 
    if (!Types.ObjectId.isValid(bookingId)) { 
      throw httpError(400, 'invalid_booking_id', 'Invalid bookingId'); 
    } 
    const booking = await Booking.findById(bookingId); 
    if (!booking) { 
      throw httpError(404, 'booking_not_found', 'Booking not found'); 
    } 
    if (booking.customerId?.toString() !== userId) { 
      throw httpError(403, 'not_owner', 'You are not the owner of this booking'); 
    } 
    const status = (booking.status || '').toString().toUpperCase(); 
    if (!allowedStatuses.has(status)) { 
      throw httpError(409, 'invalid_status', 'Booking must be completed to leave feedback'); 
    } 
    return booking; 
  } 

  // Recalculate and persist MUA ratingAverage and feedbackCount
  private async recalcMuaRating(muaId: Types.ObjectId | string) {
    if (!muaId) {
    return; 
    }
    const _muaId = typeof muaId === 'string' ? new Types.ObjectId(muaId) : muaId;
    const agg = await Feedback.aggregate([
      { $match: { muaId: _muaId } },
      {
        $group: {
          _id: '$muaId',
          avg: { $avg: '$rating' },
          cnt: { $sum: 1 }
        }
      }
    ]);

    const avg = agg[0]?.avg ?? 0;
    const cnt = agg[0]?.cnt ?? 0;

    await MUA.updateOne({ _id: _muaId }, {
      $set: {
        ratingAverage: Math.round(avg * 10) / 10,
        feedbackCount: cnt
      }
    });
  }

  async getMine(userId: string, bookingId: string) { 
    await this.assertOwnershipAndStatus(userId, bookingId); 
    const feedback = await Feedback.findOne({ bookingId: new Types.ObjectId(bookingId) }); 
    return feedback; 
  } 

  async getRecentByMua(muaId: string, limit = 5) {
    if (!Types.ObjectId.isValid(muaId)) {
      throw httpError(400, 'invalid_mua_id', 'Invalid muaId');
    }
    const items = await Feedback.find({ muaId: new Types.ObjectId(muaId) })
      .sort({ createdAt: -1 })
      .limit(Math.max(1, Math.min(50, limit)))
      .populate({ path: 'userId', select: { fullName: 1, avatarUrl: 1 } })
      .lean();

    // Map to a flatter shape for frontend convenience while maintaining backward compatibility
    return items.map((it: any) => ({
      _id: it._id,
      rating: it.rating,
      comment: it.comment,
      createdAt: it.createdAt,
      reviewerName: it.userId?.fullName || 'Customer',
      reviewerAvatarUrl: it.userId?.avatarUrl || '',
    }));
  }

  async create(userId: string, payload: { bookingId: string; rating: number; comment?: string }) { 
    const booking = await this.assertOwnershipAndStatus(userId, payload.bookingId); 

    const existing = await Feedback.findOne({ bookingId: booking._id }); 
    if (existing) { 
      throw httpError(409, 'duplicate_feedback', 'Feedback already exists for this booking'); 
    } 

    const created = await Feedback.create({ 
      bookingId: booking._id, 
      userId: new Types.ObjectId(userId), 
      muaId: booking.muaId, 
      rating: payload.rating, 
      comment: payload.comment ?? '' 
    }); 

    // Link to booking if field exists 
    if ('feedbackId' in booking) { 
      (booking as any).feedbackId = created._id; 
      await booking.save(); 
    } 

    // Recalculate MUA rating after creation
    if (booking.muaId) {
      await this.recalcMuaRating(booking.muaId);
    }

    return created; 
  } 

  async update(userId: string, feedbackId: string, patch: { rating?: number; comment?: string }) { 
    if (!Types.ObjectId.isValid(feedbackId)) { 
      throw httpError(400, 'invalid_feedback_id', 'Invalid feedbackId'); 
    } 
    const feedback = await Feedback.findById(feedbackId); 
    if (!feedback) { 
      throw httpError(404, 'feedback_not_found', 'Feedback not found'); 
    } 
    if (feedback.userId.toString() !== userId) { 
      throw httpError(403, 'not_owner', 'You are not the owner of this feedback'); 
    } 

    if (typeof patch.rating !== 'undefined') (feedback as any).rating = patch.rating; 
    if (typeof patch.comment !== 'undefined') (feedback as any).comment = patch.comment; 
    await feedback.save(); 

    // Recalculate MUA rating after update
    if (feedback.muaId) {
  await this.recalcMuaRating(feedback.muaId);
}
    return feedback; 
  } 

  async remove(userId: string, feedbackId: string) { 
    if (!Types.ObjectId.isValid(feedbackId)) { 
      throw httpError(400, 'invalid_feedback_id', 'Invalid feedbackId'); 
    } 
    const feedback = await Feedback.findById(feedbackId); 
    if (!feedback) { 
      throw httpError(404, 'feedback_not_found', 'Feedback not found'); 
    } 
    if (feedback.userId.toString() !== userId) { 
      throw httpError(403, 'not_owner', 'You are not the owner of this feedback'); 
    } 

    // Unlink booking if linked 
    await Booking.updateOne({ feedbackId: feedback._id }, { $unset: { feedbackId: '' } }); 

    await Feedback.deleteOne({ _id: feedback._id }); 

    // Recalculate MUA rating after deletion if muaId exists
    if (feedback.muaId) {
      await this.recalcMuaRating(feedback.muaId);
    }
  }   

  async getFeedbackSummaryByMua(muaId: string) {
    if (!Types.ObjectId.isValid(muaId)) {
      throw httpError(400, 'invalid_mua_id', 'Invalid MUA ID');
    }

    // Step 1: Lấy tất cả các dịch vụ của MUA
    const services = await ServicePackage.find({ muaId: new Types.ObjectId(muaId) }).lean();
    
    // Step 2: Lấy tất cả feedback của MUA
    const feedbacks = await Feedback.aggregate([
      { $match: { muaId: new Types.ObjectId(muaId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'bookings',
          localField: 'bookingId',
          foreignField: '_id',
          as: 'bookingInfo',
        },
      },
      { $unwind: '$bookingInfo' },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$bookingInfo.serviceId',
          serviceId: { $first: '$bookingInfo.serviceId' },
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
          reviews: {
            $push: {
              _id: '$_id',
              rating: '$rating',
              comment: '$comment',
              createdAt: '$createdAt',
              reviewerName: { $ifNull: ['$userInfo.fullName', 'Anonymous'] },
              reviewerAvatarUrl: { $ifNull: ['$userInfo.avatarUrl', ''] },
            },
          },
        },
      },
    ]);

    // Tạo một bản đồ để dễ dàng tra cứu feedback theo serviceId
    const feedbackMap = new Map();
    feedbacks.forEach(fb => {
      feedbackMap.set(fb._id.toString(), {
        averageRating: fb.averageRating,
        reviewCount: fb.reviewCount,
        reviews: fb.reviews.slice(0, 2), // Chỉ lấy 2 đánh giá gần nhất
      });
    });

    // Kết hợp thông tin dịch vụ với feedback (nếu có)
    const result = services.map(service => {
      const feedback = feedbackMap.get(service._id.toString());
      return {
        serviceId: service._id,
        serviceName: service.name,
        serviceImageUrl: service.imageUrl,
        averageRating: feedback ? Math.round(feedback.averageRating * 10) / 10 : 0,
        reviewCount: feedback ? feedback.reviewCount : 0,
        reviews: feedback ? feedback.reviews : [],
      };
    });

    // Sắp xếp theo số lượng đánh giá giảm dần
    return result.sort((a, b) => b.reviewCount - a.reviewCount);
  }

  async getFeedbackForService(muaId: string, serviceId: string, page = 1, limit = 5) {
    if (!Types.ObjectId.isValid(muaId)) {
      throw httpError(400, 'invalid_mua_id', 'Invalid MUA ID');
    }
    if (!Types.ObjectId.isValid(serviceId)) {
      throw httpError(400, 'invalid_service_id', 'Invalid Service ID');
    }

    // Find bookings for the specific service and MUA
    const bookings = await Booking.find({
      muaId: new Types.ObjectId(muaId),
      serviceId: new Types.ObjectId(serviceId),
    }).select('_id');

    const bookingIds = bookings.map(b => b._id);

    if (bookingIds.length === 0) {
      return { data: [], total: 0, page, limit };
    }

    const skip = (page - 1) * limit;
    const total = await Feedback.countDocuments({ bookingId: { $in: bookingIds } });

    const feedbacks = await Feedback.find({ bookingId: { $in: bookingIds } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'userId', select: 'fullName avatarUrl' })
      .lean();

    // Map to a flatter shape for frontend convenience
    const data = feedbacks.map((it: any) => ({
      _id: it._id,
      rating: it.rating,
      comment: it.comment,
      createdAt: it.createdAt,
      reviewerName: it.userId?.fullName || 'Anonymous Customer',
      reviewerAvatarUrl: it.userId?.avatarUrl || '',
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
