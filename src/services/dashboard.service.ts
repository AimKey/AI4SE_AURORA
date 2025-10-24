import mongoose from "mongoose";
import { Booking } from "models/bookings.models";
import { MUA } from "@models/muas.models";
import { ServicePackage } from "@models/services.models";
import { BOOKING_STATUS } from "constants/index";
import type { BookingResponseDTO } from "types/booking.dtos";
import { formatBookingResponse } from "./booking.service";

export async function getMuaDashboardSummary(muaId: string): Promise<{
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  averageRating: number;
  totalReviews: number;
  newCustomersThisMonth: number;
  monthlyBookings: number;
  revenueGrowthPercent: number;
  bookingsGrowthPercent: number;
  customersGrowthPercent: number;
}> {
  try {
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const startOfPrevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);

    const [
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      revenueAgg,
      monthlyRevenueAgg,
      prevMonthlyRevenueAgg,
      monthlyBookingsCount,
      prevMonthlyBookingsCount,
      monthlyBookingsAgg,
      prevMonthlyBookingsAgg,
      muaDoc
    ] = await Promise.all([
      Booking.countDocuments({ muaId }),
      Booking.countDocuments({ muaId, status: BOOKING_STATUS.PENDING }),
      Booking.countDocuments({ muaId, status: BOOKING_STATUS.CONFIRMED }),
      Booking.countDocuments({ muaId, status: BOOKING_STATUS.COMPLETED }),
      Booking.aggregate([
        { $match: { muaId: new mongoose.Types.ObjectId(muaId), status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED] } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$totalPrice", 0] } } } }
      ]),
      Booking.aggregate([
        { 
          $match: { 
            muaId: new mongoose.Types.ObjectId(muaId), 
            status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED] },
            bookingDate: { $gte: startOfMonth, $lte: endOfMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$totalPrice", 0] } } } }
      ]),
      Booking.aggregate([
        { 
          $match: { 
            muaId: new mongoose.Types.ObjectId(muaId), 
            status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED] },
            bookingDate: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$totalPrice", 0] } } } }
      ]),
      Booking.countDocuments({ 
        muaId, 
        bookingDate: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      Booking.countDocuments({ 
        muaId, 
        bookingDate: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
      }),
      Booking.aggregate([
        { 
          $match: { 
            muaId: new mongoose.Types.ObjectId(muaId),
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
          } 
        },
        { $group: { _id: "$customerId" } },
        { $count: "uniqueCustomers" }
      ]),
      Booking.aggregate([
        { 
          $match: { 
            muaId: new mongoose.Types.ObjectId(muaId),
            createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
          } 
        },
        { $group: { _id: "$customerId" } },
        { $count: "uniqueCustomers" }
      ]),
      MUA.findById(muaId).lean()
    ]);

    const totalRevenue = revenueAgg?.[0]?.total || 0;
    const monthlyRevenue = monthlyRevenueAgg?.[0]?.total || 0;
    const prevMonthlyRevenue = prevMonthlyRevenueAgg?.[0]?.total || 0;
    const newCustomersThisMonth = monthlyBookingsAgg?.[0]?.uniqueCustomers || 0;
    const prevMonthCustomers = prevMonthlyBookingsAgg?.[0]?.uniqueCustomers || 0;
    const averageRating = (muaDoc as any)?.ratingAverage || 0;
    const totalReviews = (muaDoc as any)?.feedbackCount || 0;

    const monthlyBookings = monthlyBookingsCount || 0;
    const prevMonthlyBookings = prevMonthlyBookingsCount || 0;

    const revenueGrowthPercent = prevMonthlyRevenue === 0
      ? (monthlyRevenue > 0 ? 100 : 0)
      : ((monthlyRevenue - prevMonthlyRevenue) / prevMonthlyRevenue) * 100;

    const bookingsGrowthPercent = prevMonthlyBookings === 0
      ? (monthlyBookings > 0 ? 100 : 0)
      : ((monthlyBookings - prevMonthlyBookings) / prevMonthlyBookings) * 100;

    const customersGrowthPercent = prevMonthCustomers === 0
      ? (newCustomersThisMonth > 0 ? 100 : 0)
      : ((newCustomersThisMonth - prevMonthCustomers) / prevMonthCustomers) * 100;

    return {
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      totalRevenue,
      monthlyRevenue,
      averageRating,
      totalReviews,
      newCustomersThisMonth,
      monthlyBookings,
      revenueGrowthPercent,
      bookingsGrowthPercent,
      customersGrowthPercent,
    };
  } catch (error) {
    throw new Error(`Failed to get MUA dashboard summary: ${error}`);
  }
}

export async function getRecentBookingsByMUA(
  muaId: string,
  limit: number = 5
): Promise<BookingResponseDTO[]> {
  try {
    const bookings = await Booking.find({ muaId })
      .populate("customerId serviceId")
      .sort({ bookingDate: -1 })
      .limit(limit)
      .exec();

    return bookings.map((b) => formatBookingResponse(b));
  } catch (error) {
    throw new Error(`Failed to get recent bookings for MUA: ${error}`);
  }
}

export async function getMuaServices(muaId: string): Promise<any[]> {
  try {
    const services = await ServicePackage.find({ muaId })
      .sort({ createdAt: -1 })
      .lean();

    return services.map(service => ({
      id: service._id,
      name: service.name,
      category: service.category || 'General',
      duration: `${service.duration} minutes`,
      price: service.price ? service.price.toLocaleString('vi-VN') + ' VND' : 'Liên hệ',
      isActive: service.isAvailable ?? true
    }));
  } catch (error) {
    throw new Error(`Failed to get MUA services: ${error}`);
  }
}

export async function getMuaCalendarEvents(muaId: string, year: number, month: number): Promise<any[]> {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const bookings = await Booking.find({
      muaId: new mongoose.Types.ObjectId(muaId),
      bookingDate: { $gte: startDate, $lte: endDate },
      status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING, BOOKING_STATUS.COMPLETED] }
    })
      .populate('serviceId customerId')
      .lean();

    return bookings.map((booking: any) => {
      const date: Date | null = booking.bookingDate ? new Date(booking.bookingDate) : null;
      const day: number = date ? date.getDate() : 1;
      // Prefer explicit startTime if available, fallback to bookingDate time, else default
      const time: string = booking.startTime
        ? booking.startTime
        : (date
            ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
            : '09:00');
      const status: string = (booking.status || '').toString().toLowerCase();

      return {
        day,
        status,
        customerName: booking.customerId?.fullName || 'Unknown',
        serviceName: booking.serviceId?.name || 'Unknown Service',
        time
      };
    });
  } catch (error) {
    throw new Error(`Failed to get MUA calendar events: ${error}`);
  }
}

export async function setServiceAvailability(serviceId: string, isAvailable: boolean) {
  try {
    const updated = await ServicePackage.findByIdAndUpdate(
      serviceId,
      { $set: { isAvailable } },
      { new: true }
    ).lean();
    return updated;
  } catch (error) {
    throw new Error(`Failed to set service availability: ${error}`);
  }
}

export async function getServiceInsights(muaId: string, limit: number = 5): Promise<Array<{ serviceId: string; name: string; category: string; bookings: number }>> {
  try {
    const agg = await Booking.aggregate([
      { $match: { muaId: new mongoose.Types.ObjectId(muaId), status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED] } } },
      { $group: { _id: "$serviceId", bookings: { $sum: 1 } } },
      { $sort: { bookings: -1 } },
      { $limit: limit },
      { $lookup: { from: ServicePackage.collection.name, localField: "_id", foreignField: "_id", as: "service" } },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, serviceId: "$_id", name: { $ifNull: ["$service.name", "Unknown Service"] }, category: { $ifNull: ["$service.category", "UNKNOWN"] }, bookings: 1 } }
    ]);

    return agg.map((r: any) => ({
      serviceId: r.serviceId?.toString?.() || "",
      name: r.name,
      category: r.category,
      bookings: r.bookings || 0,
    }));
  } catch (error) {
    throw new Error(`Failed to get service insights: ${error}`);
  }
}

