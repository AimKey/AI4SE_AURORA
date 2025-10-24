import { Transaction, Withdraw, Wallet, BankAccount } from "../models/transactions.model";
import { Booking } from "../models/bookings.models";
import { User } from "../models/users.models";
import { MUA } from "../models/muas.models";
import { ServicePackage } from "../models/services.models";
import { TRANSACTION_STATUS, WITHDRAW_STATUS } from "../constants/index";
import type { AdminTransactionListResponseDTO, AdminTransactionQueryDTO, AdminTransactionResponseDTO, AdminWithdrawListResponseDTO, AdminWithdrawQueryDTO, AdminWithdrawResponseDTO, TransactionSummaryDTO } from "types/admin.transaction.dto";


/**
 * Get paginated list of transactions with filtering
 */
export async function getTransactions(
  page: number = 1,
  pageSize: number = 10,
  filters: AdminTransactionQueryDTO = {}
): Promise<AdminTransactionListResponseDTO> {
  try {
    const skip = (page - 1) * pageSize;
    
    // Build filter query
    const query: any = {};
    
    if (filters.customerId) query.customerId = filters.customerId;
    if (filters.bookingId) query.bookingId = filters.bookingId;
    if (filters.status) query.status = filters.status;
    if (filters.paymentMethod) query.paymentMethod = { $regex: filters.paymentMethod, $options: 'i' };
    
    // Date range filtering
    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.createdAt.$lte = new Date(filters.toDate);
    }
    
    // Amount range filtering
    if (filters.minAmount || filters.maxAmount) {
      query.amount = {};
      if (filters.minAmount) query.amount.$gte = filters.minAmount;
      if (filters.maxAmount) query.amount.$lte = filters.maxAmount;
    }

    // Get transactions with populated data
    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate({
          path: 'customerId',
          select: 'fullName email phoneNumber',
          model: User
        })
        .populate({
          path: 'bookingId',
          select: 'muaId serviceId bookingDate totalPrice address status locationType',
          populate: [
            {
              path: 'muaId',
              select: 'location',
              model: MUA,
              populate: {
                path: 'userId',
                select: 'fullName email phoneNumber',
                model: User
              }
            },
            {
              path: 'serviceId',
              select: 'name category price',
              model: ServicePackage
            }
          ]
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Transaction.countDocuments(query)
    ]);

    // Transform data to response format
    const transformedTransactions: AdminTransactionResponseDTO[] = transactions.map(transaction => ({
      _id: transaction._id.toString(),
      bookingId: transaction.bookingId?._id?.toString() || '',
      customerId: transaction.customerId?._id?.toString() || '',
      customerName: (transaction.customerId as any)?.fullName || 'Unknown',
      customerEmail: (transaction.customerId as any)?.email || '',
      customerPhone: (transaction.customerId as any)?.phoneNumber || '',
      muaId: (transaction.bookingId as any)?.muaId?._id?.toString() || '',
      muaName: (transaction.bookingId as any)?.muaId?.userId?.fullName || 'Unknown',
      muaEmail: (transaction.bookingId as any)?.muaId?.userId?.email || '',
      serviceId: (transaction.bookingId as any)?.serviceId?._id?.toString() || '',
      serviceName: (transaction.bookingId as any)?.serviceId?.name || 'Unknown Service',
      serviceCategory: (transaction.bookingId as any)?.serviceId?.category || '',
      amount: transaction.amount || 0,
      currency: transaction.currency || 'VND',
      status: transaction.status as any,
      paymentMethod: transaction.paymentMethod || '',
      paymentReference: transaction.paymentReference || '',
      payoutId: transaction.payoutId || '',
      bookingDate: (transaction.bookingId as any)?.bookingDate || new Date(),
      bookingStatus: (transaction.bookingId as any)?.status || '',
      bookingAddress: (transaction.bookingId as any)?.address || '',
      createdAt: transaction.createdAt || new Date(),
      updatedAt: transaction.updatedAt || new Date()
    }));

    const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    return {
      transactions: transformedTransactions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore
      },
      total
    };
  } catch (error) {
    console.error('Error getting transactions:', error);
    throw error;
  }
}

/**
 * Get paginated list of withdrawals with filtering
 */
export async function getWithdrawals(
  page: number = 1,
  pageSize: number = 10,
  filters: AdminWithdrawQueryDTO = {}
): Promise<AdminWithdrawListResponseDTO> {
  try {
    const skip = (page - 1) * pageSize;
    
    // Build filter query
    const query: any = {};
    
    if (filters.muaId) query.muaId = filters.muaId;
    if (filters.status) query.status = filters.status;
    if (filters.reference) query.reference = { $regex: filters.reference, $options: 'i' };
    
    // Date range filtering
    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.createdAt.$lte = new Date(filters.toDate);
    }
    
    // Amount range filtering
    if (filters.minAmount || filters.maxAmount) {
      query.amount = {};
      if (filters.minAmount) query.amount.$gte = filters.minAmount;
      if (filters.maxAmount) query.amount.$lte = filters.maxAmount;
    }

    // Get withdrawals with populated data
    const [withdrawals, total] = await Promise.all([
      Withdraw.find(query)
        .populate({
          path: 'muaId',
          select: ' location userId',
          model: MUA,
          populate: {
            path: 'userId',
            select: 'fullName email phoneNumber',
            model: User
          }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Withdraw.countDocuments(query)
    ]);

    // Get bank account info for each MUA
    const muaIds = withdrawals.map(w => (w.muaId as any)?._id).filter(Boolean);
    const bankAccounts = await BankAccount.find({ 
      userId: { $in: muaIds.map(id => (withdrawals.find(w => (w.muaId as any)?._id?.toString() === id?.toString())?.muaId as any)?.userId) }
    }).lean();

    // Transform data to response format
    const transformedWithdrawals: AdminWithdrawResponseDTO[] = withdrawals.map(withdrawal => {
      const mua = withdrawal.muaId as any;
      const bankAccount = bankAccounts.find(ba => ba.userId?.toString() === mua?.userId?._id?.toString());
      
      return {
        _id: withdrawal._id.toString(),
        muaId: mua?._id?.toString() || '',
        muaName: mua?.userId?.fullName || 'Unknown',
        muaEmail: mua?.userId?.email || '',
        muaPhone: mua?.userId?.phoneNumber || '',
        muaLocation: mua?.location || '',
        amount: withdrawal.amount || 0,
        currency: withdrawal.currency || 'VND',
        status: withdrawal.status as any,
        reference: withdrawal.reference || '',
        bankInfo: bankAccount ? {
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber,
          accountName: bankAccount.accountName,
          bankCode: bankAccount.bankCode,
          bankBin: bankAccount.bankBin
        } : undefined,
        requestedAt: withdrawal.createdAt || new Date(),
        processedAt: withdrawal.updatedAt || new Date(),
        createdAt: withdrawal.createdAt || new Date(),
        updatedAt: withdrawal.updatedAt || new Date()
      };
    });

    const totalPages = Math.ceil(total / pageSize);
    const hasMore = page < totalPages;

    return {
      withdrawals: transformedWithdrawals,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore
      },
      total
    };
  } catch (error) {
    console.error('Error getting withdrawals:', error);
    throw error;
  }
}

/**
 * Get transaction summary statistics
 */
export async function getTransactionSummary(
  fromDate?: string,
  toDate?: string
): Promise<TransactionSummaryDTO> {
  try {
    // Build date filter
    const dateFilter: any = {};
    if (fromDate || toDate) {
      dateFilter.createdAt = {};
      if (fromDate) dateFilter.createdAt.$gte = new Date(fromDate);
      if (toDate) dateFilter.createdAt.$lte = new Date(toDate);
    }

    // Get transaction aggregations
    const [transactionStats, withdrawalStats] = await Promise.all([
      Transaction.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            holdCount: { $sum: { $cond: [{ $eq: ['$status', TRANSACTION_STATUS.HOLD] }, 1, 0] } },
            capturedCount: { $sum: { $cond: [{ $eq: ['$status', TRANSACTION_STATUS.CAPTURED] }, 1, 0] } },
            pendingRefundCount: { $sum: { $cond: [{ $eq: ['$status', TRANSACTION_STATUS.PENDING_REFUND] }, 1, 0] } },
            refundedCount: { $sum: { $cond: [{ $eq: ['$status', TRANSACTION_STATUS.REFUNDED] }, 1, 0] } },
            holdAmount: { $sum: { $cond: [{ $eq: ['$status', TRANSACTION_STATUS.HOLD] }, '$amount', 0] } },
            capturedAmount: { $sum: { $cond: [{ $eq: ['$status', TRANSACTION_STATUS.CAPTURED] }, '$amount', 0] } },
            pendingRefundAmount: { $sum: { $cond: [{ $eq: ['$status', TRANSACTION_STATUS.PENDING_REFUND] }, '$amount', 0] } },
            refundedAmount: { $sum: { $cond: [{ $eq: ['$status', TRANSACTION_STATUS.REFUNDED] }, '$amount', 0] } }
          }
        }
      ]),
      Withdraw.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalWithdrawals: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            pendingCount: { $sum: { $cond: [{ $eq: ['$status', WITHDRAW_STATUS.PENDING] }, 1, 0] } },
            processingCount: { $sum: { $cond: [{ $eq: ['$status', WITHDRAW_STATUS.PROCESSING] }, 1, 0] } },
            successCount: { $sum: { $cond: [{ $eq: ['$status', WITHDRAW_STATUS.SUCCESS] }, 1, 0] } },
            failedCount: { $sum: { $cond: [{ $eq: ['$status', WITHDRAW_STATUS.FAILED] }, 1, 0] } },
            pendingAmount: { $sum: { $cond: [{ $eq: ['$status', WITHDRAW_STATUS.PENDING] }, '$amount', 0] } },
            processingAmount: { $sum: { $cond: [{ $eq: ['$status', WITHDRAW_STATUS.PROCESSING] }, '$amount', 0] } },
            successAmount: { $sum: { $cond: [{ $eq: ['$status', WITHDRAW_STATUS.SUCCESS] }, '$amount', 0] } },
            failedAmount: { $sum: { $cond: [{ $eq: ['$status', WITHDRAW_STATUS.FAILED] }, '$amount', 0] } }
          }
        }
      ])
    ]);

    const transactionData = transactionStats[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      holdCount: 0,
      capturedCount: 0,
      pendingRefundCount: 0,
      refundedCount: 0,
      holdAmount: 0,
      capturedAmount: 0,
      pendingRefundAmount: 0,
      refundedAmount: 0
    };

    const withdrawalData = withdrawalStats[0] || {
      totalWithdrawals: 0,
      totalAmount: 0,
      pendingCount: 0,
      processingCount: 0,
      successCount: 0,
      failedCount: 0,
      pendingAmount: 0,
      processingAmount: 0,
      successAmount: 0,
      failedAmount: 0
    };

    return {
      transactions: {
        total: transactionData.totalTransactions,
        totalAmount: transactionData.totalAmount,
        byStatus: {
          HOLD: transactionData.holdCount,
          CAPTURED: transactionData.capturedCount,
          PENDING_REFUND: transactionData.pendingRefundCount,
          REFUNDED: transactionData.refundedCount
        },
        amountByStatus: {
          HOLD: transactionData.holdAmount,
          CAPTURED: transactionData.capturedAmount,
          PENDING_REFUND: transactionData.pendingRefundAmount,
          REFUNDED: transactionData.refundedAmount
        }
      },
      withdrawals: {
        total: withdrawalData.totalWithdrawals,
        totalAmount: withdrawalData.totalAmount,
        byStatus: {
          PENDING: withdrawalData.pendingCount,
          PROCESSING: withdrawalData.processingCount,
          SUCCESS: withdrawalData.successCount,
          FAILED: withdrawalData.failedCount
        },
        amountByStatus: {
          PENDING: withdrawalData.pendingAmount,
          PROCESSING: withdrawalData.processingAmount,
          SUCCESS: withdrawalData.successAmount,
          FAILED: withdrawalData.failedAmount
        }
      },
      summary: {
        totalRevenue: transactionData.capturedAmount,
        totalWithdrawn: withdrawalData.successAmount,
        platformBalance: transactionData.capturedAmount - withdrawalData.successAmount,
        pendingPayouts: withdrawalData.pendingAmount + withdrawalData.processingAmount,
        refundsPending: transactionData.pendingRefundAmount
      }
    };
  } catch (error) {
    console.error('Error getting transaction summary:', error);
    throw error;
  }
}

/**
 * Get transaction by ID with full details
 */
export async function getTransactionById(transactionId: string): Promise<AdminTransactionResponseDTO | null> {
  try {
    const transaction = await Transaction.findById(transactionId)
      .populate({
        path: 'customerId',
        select: 'fullName email phoneNumber',
        model: User
      })
      .populate({
        path: 'bookingId',
        select: 'muaId serviceId bookingDate totalPrice address status locationType note',
        populate: [
          {
            path: 'muaId',
            select: ' location userId',
            model: MUA,
            populate: {
              path: 'userId',
              select: 'fullName email phoneNumber',
              model: User
            }
          },
          {
            path: 'serviceId',
            select: 'name category price description',
            model: ServicePackage
          }
        ]
      })
      .lean();

    if (!transaction) return null;

    return {
      _id: transaction._id.toString(),
      bookingId: transaction.bookingId?._id?.toString() || '',
      customerId: transaction.customerId?._id?.toString() || '',
      customerName: (transaction.customerId as any)?.fullName || 'Unknown',
      customerEmail: (transaction.customerId as any)?.email || '',
      customerPhone: (transaction.customerId as any)?.phoneNumber || '',
      muaId: (transaction.bookingId as any)?.muaId?._id?.toString() || '',
      muaName: (transaction.bookingId as any)?.muaId?.userId?.fullName || 'Unknown',
      muaEmail: (transaction.bookingId as any)?.muaId?.userId?.email || '',
      serviceId: (transaction.bookingId as any)?.serviceId?._id?.toString() || '',
      serviceName: (transaction.bookingId as any)?.serviceId?.name || 'Unknown Service',
      serviceCategory: (transaction.bookingId as any)?.serviceId?.category || '',
      amount: transaction.amount || 0,
      currency: transaction.currency || 'VND',
      status: transaction.status as any,
      paymentMethod: transaction.paymentMethod || '',
      paymentReference: transaction.paymentReference || '',
      payoutId: transaction.payoutId || '',
      bookingDate: (transaction.bookingId as any)?.bookingDate || new Date(),
      bookingStatus: (transaction.bookingId as any)?.status || '',
      bookingAddress: (transaction.bookingId as any)?.address || '',
      bookingNote: (transaction.bookingId as any)?.note || '',
      createdAt: transaction.createdAt || new Date(),
      updatedAt: transaction.updatedAt || new Date()
    };
  } catch (error) {
    console.error('Error getting transaction by ID:', error);
    throw error;
  }
}

/**
 * Get withdrawal by ID with full details
 */
export async function getWithdrawalById(withdrawalId: string): Promise<AdminWithdrawResponseDTO | null> {
  try {
    const withdrawal = await Withdraw.findById(withdrawalId)
      .populate({
        path: 'muaId',
        select: 'name email phone location userId',
        model: MUA,
        populate: {
          path: 'userId',
          select: 'name email phone',
          model: User
        }
      })
      .lean();

    if (!withdrawal) return null;

    const mua = withdrawal.muaId as any;
    const bankAccount = await BankAccount.findOne({ userId: mua?.userId?._id }).lean();

    return {
      _id: withdrawal._id.toString(),
      muaId: mua?._id?.toString() || '',
      muaName: mua?.userId?.fullName || 'Unknown',
      muaEmail: mua?.userId?.email || '',
      muaPhone: mua?.userId?.phoneNumber || '',
      muaLocation: mua?.location || '',
      amount: withdrawal.amount || 0,
      currency: withdrawal.currency || 'VND',
      status: withdrawal.status as any,
      reference: withdrawal.reference || '',
      bankInfo: bankAccount ? {
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        accountName: bankAccount.accountName,
        bankCode: bankAccount.bankCode,
        bankBin: bankAccount.bankBin
      } : undefined,
      requestedAt: withdrawal.createdAt || new Date(),
      processedAt: withdrawal.updatedAt || new Date(),
      createdAt: withdrawal.createdAt || new Date(),
      updatedAt: withdrawal.updatedAt || new Date()
    };
  } catch (error) {
    console.error('Error getting withdrawal by ID:', error);
    throw error;
  }
}
