/**
 * Admin Refund Service
 * 
 * Service for managing refund requests and processing refunds
 */

import { Transaction, BankAccount, Withdraw } from '../models/transactions.model';
import { Booking } from '../models/bookings.models';
import { User } from '../models/users.models';
import { ServicePackage } from '../models/services.models';
import { REFUND_REASON, TRANSACTION_STATUS, WITHDRAW_STATUS } from '../constants/index';
import { handleRefundBookingBeforeConfirm, handleWithdrawalMUA, makeRefund } from './transaction.service';
import mongoose from 'mongoose';
import type {
  AdminRefundQueryDTO,
  AdminRefundResponseDTO,
  AdminRefundListResponseDTO,
  RefundSummaryDTO
} from '../types/admin.refund.dto';

// ==================== HELPER FUNCTIONS ====================

function buildRefundQuery(filters: AdminRefundQueryDTO) {
  const query: any = {};

  // Always filter for refund-related statuses first
  if (filters.status && filters.status !== 'all') {
    // If specific status is requested, use only that status
    query.status = filters.status;
  } else {
    // Default: get all refund-related transactions
    query.status = { $in: [TRANSACTION_STATUS.PENDING_REFUND, TRANSACTION_STATUS.REFUNDED] };
  }

  if (filters.fromDate || filters.toDate) {
    query.createdAt = {};
    if (filters.fromDate) {
      query.createdAt.$gte = new Date(filters.fromDate);
    }
    if (filters.toDate) {
      query.createdAt.$lte = new Date(filters.toDate);
    }
  }

  if (filters.minAmount || filters.maxAmount) {
    query.amount = {};
    if (filters.minAmount) {
      query.amount.$gte = filters.minAmount;
    }
    if (filters.maxAmount) {
      query.amount.$lte = filters.maxAmount;
    }
  }

  return query;
}

// ==================== MAIN FUNCTIONS ====================

/**
 * Get refund transactions with filtering and pagination
 */
export async function getRefunds(query: AdminRefundQueryDTO = {}) {
  try {
    const {
      page = 1,
      pageSize = 10,
      customerName,
      muaName,
      bookingId,
      ...filters
    } = query;

    const skip = (page - 1) * pageSize;
    const matchQuery = buildRefundQuery(filters);
    
    // Debug: log the match query to ensure it's filtering correctly
    console.log('Refund query matchQuery:', JSON.stringify(matchQuery, null, 2));

    // Build aggregation pipeline similar to admin.transaction.service.ts
    const pipeline: any[] = [
      { $match: matchQuery },
      
      // Join with Booking
      {
        $lookup: {
          from: 'bookings',
          localField: 'bookingId',
          foreignField: '_id',
          as: 'booking'
        }
      },
      { $unwind: '$booking' },
      
      // Join with Customer (User)
      {
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' },
      
      // Join with MUA
      {
        $lookup: {
          from: 'muas',
          localField: 'booking.muaId',
          foreignField: '_id',
          as: 'muaDoc'
        }
      },
      { $unwind: '$muaDoc' },
      
      // Join with MUA User info
      {
        $lookup: {
          from: 'users',
          localField: 'muaDoc.userId',
          foreignField: '_id',
          as: 'mua'
        }
      },
      { $unwind: '$mua' },
      
      // Join with Service
      {
        $lookup: {
          from: 'servicepackages',
          localField: 'booking.serviceId',
          foreignField: '_id',
          as: 'service'
        }
      },
      { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } }
    ];

    // Apply text search filters
    if (customerName || muaName || bookingId) {
      pipeline.push({
        $match: {
          $and: [
            ...(customerName ? [{ 'customer.fullName': { $regex: customerName, $options: 'i' } }] : []),
            ...(muaName ? [{ 'mua.fullName': { $regex: muaName, $options: 'i' } }] : []),
            ...(bookingId ? [{ 'booking._id': new mongoose.Types.ObjectId(bookingId) }] : [])
          ]
        }
      });
    }

    // Sort by creation date (newest first)
    pipeline.push({ $sort: { createdAt: -1 } });

    // Pagination
    pipeline.push({
      $facet: {
        data: [
          { $skip: skip },
          { $limit: pageSize }
        ],
        totalCount: [
          { $count: 'count' }
        ]
      }
    });

    const result = await Transaction.aggregate(pipeline);
    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    // Map to response DTOs
    const refunds: AdminRefundResponseDTO[] = data.map((item: any) => ({
      _id: item._id.toString(),
      originalTransactionId: item._id.toString(),
      bookingId: item.bookingId.toString(),
      customerId: item.customerId.toString(),
      customerName: item.customer?.fullName || 'Unknown',
      customerEmail: item.customer?.email || '',
      customerPhone: item.customer?.phoneNumber || '',
      muaId: item.muaDoc?._id?.toString() || '',
      muaName: item.mua?.fullName || 'Unknown',
      muaEmail: item.mua?.email || '',
      originalAmount: item.amount || 0,
      refundAmount: item.amount || 0, // Full refund for now
      refundReason: item.refundReason,
      status: item.status as 'PENDING_REFUND' | 'REFUNDED',
      requestedAt: item.createdAt,
      processedAt: item.status === TRANSACTION_STATUS.REFUNDED ? item.updatedAt : undefined,
      refundMethod: 'original_payment',
      processingFee: calculateProcessingFee(item.amount || 0),
      netRefundAmount: (item.amount || 0) - calculateProcessingFee(item.amount || 0),
      paymentReference: item.paymentReference || '',
      payoutId: item.payoutId || '',
      serviceName: item.service?.name || 'Unknown Service',
      serviceCategory: item.service?.category || '',
      bookingDate: item.booking?.bookingDate,
      bookingStatus: item.booking?.status || '',
      bookingAddress: item.booking?.address || '',
      bookingNote: item.booking?.note || '',
      notes: generateRefundNotes(item)
    }));

    return {
      success: true,
      message: 'Refunds retrieved successfully',
      data: {
        refunds,
        total,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / pageSize),
          pageSize,
          hasNext: page < Math.ceil(total / pageSize),
          hasPrev: page > 1
        }
      }
    };

  } catch (error) {
    console.error('Error getting refunds:', error);
    return {
      success: false,
      message: 'Failed to get refunds',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get refund summary statistics
 */
export async function getRefundSummary(query: { fromDate?: string; toDate?: string } = {}) {
  try {
    const matchQuery: any = {
      // Only get transactions with refund-related statuses
      status: { $in: [TRANSACTION_STATUS.PENDING_REFUND, TRANSACTION_STATUS.REFUNDED] }
    };

    if (query.fromDate || query.toDate) {
      matchQuery.createdAt = {};
      if (query.fromDate) {
        matchQuery.createdAt.$gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        matchQuery.createdAt.$lte = new Date(query.toDate);
      }
    }

    const pipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ];

    const result = await Transaction.aggregate(pipeline);

    const summary: RefundSummaryDTO = {
      totalRefunds: 0,
      totalRefundAmount: 0,
      byStatus: {
        PENDING_REFUND: { count: 0, amount: 0 },
        REFUNDED: { count: 0, amount: 0 }
      }
    };

    result.forEach((item) => {
      summary.totalRefunds += item.count;
      summary.totalRefundAmount += item.totalAmount;
      
      if (item._id === TRANSACTION_STATUS.PENDING_REFUND) {
        summary.byStatus.PENDING_REFUND = {
          count: item.count,
          amount: item.totalAmount
        };
      } else if (item._id === TRANSACTION_STATUS.REFUNDED) {
        summary.byStatus.REFUNDED = {
          count: item.count,
          amount: item.totalAmount
        };
      }
    });

    return {
      success: true,
      message: 'Refund summary retrieved successfully',
      data: summary
    };

  } catch (error) {
    console.error('Error getting refund summary:', error);
    return {
      success: false,
      message: 'Failed to get refund summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process refund for a transaction
 */
export async function processRefund(transactionId: string) {
  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return {
        success: false,
        message: 'Transaction not found'
      };
    }

    if (transaction.status !== TRANSACTION_STATUS.PENDING_REFUND) {
      return {
        success: false,
        message: 'Transaction is not in pending refund status'
      };
    }
    const bookingNewStatus = transaction.refundReason === REFUND_REASON.CANCELLED ? 'CANCELLED' : 'REJECTED';
    // Process refund through PayOS
    const bookingId = (transaction.bookingId as any)._id.toString();
    const refundResponse = await handleRefundBookingBeforeConfirm(bookingId,bookingNewStatus);

    return {
      success: true,
      message: 'Refund processed successfully',
      data: {
        transactionId,
        amount: transaction.amount,
        refundResponse,
        processedAt: new Date()
      }
    };

  } catch (error) {
    console.error('Error processing refund:', error);
    return {
      success: false,
      message: 'Failed to process refund',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}


/**
 * Bulk process refunds
 */


// ==================== UTILITY FUNCTIONS ====================

function calculateProcessingFee(amount: number): number {
  // 1% processing fee, minimum 5000 VND
  return Math.max(amount * 0.01, 5000);
}



function generateRefundNotes(transaction: any): string {
  const notes = [];
  
  if (transaction.status === TRANSACTION_STATUS.PENDING_REFUND) {
    notes.push('Refund request pending admin approval');
  }
  
  if (transaction.payoutId) {
    notes.push(`PayOS Payout ID: ${transaction.payoutId}`);
  }
  
  return notes.join('. ');
}