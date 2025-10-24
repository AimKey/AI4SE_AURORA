/**
 * Admin Withdrawal Service
 * 
 * Service for managing MUA withdrawal requests and processing withdrawals
 */

import { Withdraw, Wallet, BankAccount } from '../models/transactions.model';
import { User } from '../models/users.models';
import { MUA } from '../models/muas.models';
import { WITHDRAW_STATUS } from '../constants/index';
import { handleWithdrawalMUA, makeWithdrawal } from './transaction.service';
import mongoose from 'mongoose';
import type {
  AdminWithdrawalQueryDTO,
  AdminWithdrawalResponseDTO,
  AdminWithdrawalListResponseDTO,
  WithdrawalSummaryDTO
} from '../types/admin.withdrawal.dto';

// ==================== HELPER FUNCTIONS ====================

function buildWithdrawalQuery(filters: AdminWithdrawalQueryDTO) {
  const query: any = {};

  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
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
 * Get withdrawal requests with filtering and pagination
 */
export async function getWithdrawals(query: AdminWithdrawalQueryDTO = {}) {
  try {
    const {
      page = 1,
      pageSize = 10,
      muaName,
      ...filters
    } = query;

    const skip = (page - 1) * pageSize;
    const matchQuery = buildWithdrawalQuery(filters);

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: matchQuery },
      
      // Join with MUA
      {
        $lookup: {
          from: 'muas',
          localField: 'muaId',
          foreignField: '_id',
          as: 'muaDoc'
        }
      },
      { $unwind: '$muaDoc' },
      
      // Join with User through MUA.userId
      {
        $lookup: {
          from: 'users',
          localField: 'muaDoc.userId',
          foreignField: '_id',
          as: 'mua'
        }
      },
      { $unwind: '$mua' },
      
      // Join with BankAccount using muaDoc.userId
      {
        $lookup: {
          from: 'bankaccounts',
          localField: 'muaDoc.userId',
          foreignField: 'userId',
          as: 'bankAccount'
        }
      },
      { $unwind: { path: '$bankAccount', preserveNullAndEmptyArrays: true } }
    ];

    // Apply text search filters
    if (muaName) {
      pipeline.push({
        $match: {
          'mua.fullName': { $regex: muaName, $options: 'i' }
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

    const result = await Withdraw.aggregate(pipeline);
    const data = result[0]?.data || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    // Map to response DTOs
    const withdrawals: AdminWithdrawalResponseDTO[] = data.map((item: any) => ({
      _id: item._id.toString(),
      muaId: item.muaId.toString(),
      muaName: item.mua?.fullName || 'Unknown',
      muaEmail: item.mua?.email || '',
      muaPhone: item.mua?.phoneNumber || '',
      muaLocation: item.muaDoc?.location || '',
      amount: item.amount || 0,
      currency: item.currency || 'VND',
      status: item.status as 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED',
      reference: item.reference || '',
      bankInfo: item.bankAccount ? {
        bankName: item.bankAccount.bankName,
        accountNumber: maskAccountNumber(item.bankAccount.accountNumber),
        accountName: item.bankAccount.accountName,
        bankCode: item.bankAccount.bankCode,
        bankBin: item.bankAccount.bankBin
      } : undefined,
      requestedAt: item.createdAt,
      processedAt: item.updatedAt !== item.createdAt ? item.updatedAt : undefined,
      processingFee: calculateWithdrawalFee(item.amount || 0),
      netAmount: (item.amount || 0) - calculateWithdrawalFee(item.amount || 0),
      transactionIds: [], // Related transaction IDs can be added if needed for audit trail
      notes: generateWithdrawalNotes(item),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    return {
      success: true,
      message: 'Withdrawals retrieved successfully',
      data: {
        withdrawals,
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
    console.error('Error getting withdrawals:', error);
    return {
      success: false,
      message: 'Failed to get withdrawals',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get withdrawal summary statistics
 */
export async function getWithdrawalSummary(query: { fromDate?: string; toDate?: string } = {}) {
  try {
    const matchQuery: any = {};

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

    const result = await Withdraw.aggregate(pipeline);

    const summary: WithdrawalSummaryDTO = {
      totalWithdrawals: 0,
      totalWithdrawalAmount: 0,
      byStatus: {
        PENDING: { count: 0, amount: 0 },
        PROCESSING: { count: 0, amount: 0 },
        SUCCESS: { count: 0, amount: 0 },
        FAILED: { count: 0, amount: 0 }
      }
    };

    result.forEach((item) => {
      summary.totalWithdrawals += item.count;
      summary.totalWithdrawalAmount += item.totalAmount;
      
      if (summary.byStatus[item._id as keyof typeof summary.byStatus]) {
        summary.byStatus[item._id as keyof typeof summary.byStatus] = {
          count: item.count,
          amount: item.totalAmount
        };
      }
    });

    return {
      success: true,
      message: 'Withdrawal summary retrieved successfully',
      data: summary
    };

  } catch (error) {
    console.error('Error getting withdrawal summary:', error);
    return {
      success: false,
      message: 'Failed to get withdrawal summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process withdrawal request (approve and execute)
 */
export async function processWithdrawal(withdrawId: string) {
  try {
    const withdraw = await Withdraw.findById(withdrawId);
    if (!withdraw) {
      return {
        success: false,
        message: 'Withdraw request not found'
      };
    }

    if (withdraw.status !== WITHDRAW_STATUS.PENDING) {
      return {
        success: false,
        message: 'Withdraw request is not in pending status'
      };
    }
    const muaId = (withdraw.muaId as any)._id.toString();
    // Process refund through PayOS
    const withdrawResponse = await handleWithdrawalMUA(muaId);

    return {
      success: true,
      message: 'Refund processed successfully',
      data: {
        withdrawId,
        amount: withdraw.amount,
        withdrawResponse,
        processedAt: new Date()
      }
    };

  } catch (error) {
    console.error('Error processing withdraw:', error);
    return {
      success: false,
      message: 'Failed to process withdraw',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
/**
 * Reject withdrawal request
 */
export async function rejectWithdrawal(withdrawalId: string, reason: string, adminNote?: string) {
  try {
    const withdrawal = await Withdraw.findById(withdrawalId);
    if (!withdrawal) {
      return {
        success: false,
        message: 'Withdrawal request not found'
      };
    }

    if (withdrawal.status !== WITHDRAW_STATUS.PENDING) {
      return {
        success: false,
        message: 'Withdrawal is not in pending status'
      };
    }

    // Update withdrawal status
    withdrawal.status = WITHDRAW_STATUS.FAILED;
    await withdrawal.save();

    return {
      success: true,
      message: 'Withdrawal rejected successfully',
      data: {
        withdrawalId,
        reason,
        rejectedAt: new Date()
      }
    };

  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    return {
      success: false,
      message: 'Failed to reject withdrawal',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Bulk process withdrawals
 */
export async function bulkProcessWithdrawals(withdrawalIds: string[], adminNote?: string) {
  try {
    const results = await Promise.allSettled(
      withdrawalIds.map(id => processWithdrawal(id))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return {
      success: true,
      message: `Bulk withdrawal processing completed: ${successful} successful, ${failed} failed`,
      data: {
        total: results.length,
        successful,
        failed,
        results: results.map((result, index) => ({
          withdrawalId: withdrawalIds[index],
          success: result.status === 'fulfilled' && result.value.success,
          message: result.status === 'fulfilled' ? result.value.message : 'Processing failed'
        }))
      }
    };

  } catch (error) {
    console.error('Error bulk processing withdrawals:', error);
    return {
      success: false,
      message: 'Failed to bulk process withdrawals',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get withdrawal by ID
 */
export async function getWithdrawalById(withdrawalId: string) {
  try {
    const pipeline: any[] = [
      { $match: { _id: new mongoose.Types.ObjectId(withdrawalId) } },
      
      // Join with MUA
      {
        $lookup: {
          from: 'muas',
          localField: 'muaId',
          foreignField: '_id',
          as: 'muaDoc'
        }
      },
      { $unwind: '$muaDoc' },
      
      // Join with User through MUA.userId
      {
        $lookup: {
          from: 'users',
          localField: 'muaDoc.userId',
          foreignField: '_id',
          as: 'mua'
        }
      },
      { $unwind: '$mua' },
      
      // Join with BankAccount using muaDoc.userId
      {
        $lookup: {
          from: 'bankaccounts',
          localField: 'muaDoc.userId',
          foreignField: 'userId',
          as: 'bankAccount'
        }
      },
      { $unwind: { path: '$bankAccount', preserveNullAndEmptyArrays: true } }
    ];

    const result = await Withdraw.aggregate(pipeline);
    const item = result[0];

    if (!item) {
      return {
        success: false,
        message: 'Withdrawal not found'
      };
    }

    const withdrawal: AdminWithdrawalResponseDTO = {
      _id: item._id.toString(),
      muaId: item.muaId.toString(),
      muaName: item.mua?.fullName || 'Unknown',
      muaEmail: item.mua?.email || '',
      muaPhone: item.mua?.phoneNumber || '',
      muaLocation: item.muaDoc?.location || '',
      amount: item.amount || 0,
      currency: item.currency || 'VND',
      status: item.status,
      reference: item.reference || '',
      bankInfo: item.bankAccount ? {
        bankName: item.bankAccount.bankName,
        accountNumber: item.bankAccount.accountNumber, // Full number for admin view
        accountName: item.bankAccount.accountName,
        bankCode: item.bankAccount.bankCode,
        bankBin: item.bankAccount.bankBin
      } : undefined,
      requestedAt: item.createdAt,
      processedAt: item.updatedAt !== item.createdAt ? item.updatedAt : undefined,
      processingFee: calculateWithdrawalFee(item.amount || 0),
      netAmount: (item.amount || 0) - calculateWithdrawalFee(item.amount || 0),
      transactionIds: [],
      notes: generateWithdrawalNotes(item),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };

    return {
      success: true,
      message: 'Withdrawal retrieved successfully',
      data: withdrawal
    };

  } catch (error) {
    console.error('Error getting withdrawal by ID:', error);
    return {
      success: false,
      message: 'Failed to get withdrawal',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ==================== UTILITY FUNCTIONS ====================

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  return '****' + accountNumber.slice(-4);
}

function calculateWithdrawalFee(amount: number): number {
  // 1% processing fee, minimum 10000 VND, maximum 50000 VND
  return Math.min(Math.max(amount * 0.01, 10000), 50000);
}

function generateWithdrawalNotes(withdrawal: any): string {
  const notes = [];
  
  if (withdrawal.status === WITHDRAW_STATUS.PENDING) {
    notes.push('Withdrawal request pending admin approval');
  } else if (withdrawal.status === WITHDRAW_STATUS.PROCESSING) {
    notes.push('Withdrawal is being processed');
  } else if (withdrawal.status === WITHDRAW_STATUS.SUCCESS) {
    notes.push('Withdrawal completed successfully');
  } else if (withdrawal.status === WITHDRAW_STATUS.FAILED) {
    notes.push('Withdrawal failed - requires admin attention');
  }
  
  if (withdrawal.reference) {
    notes.push(`PayOS Reference: ${withdrawal.reference}`);
  }
  
  return notes.join('. ');
}