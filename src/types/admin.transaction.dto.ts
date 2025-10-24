/**
 * Admin Transaction DTOs
 * 
 * Data Transfer Objects for admin transaction and withdrawal management
 */

import type { TransactionStatus } from "constants/index";
import type { RefundReason } from "constants/index";

// ==================== QUERY DTOs ====================

export interface AdminTransactionQueryDTO {
  page?: number;
  pageSize?: number;
  customerId?: string;
  bookingId?: string;
  status?: TransactionStatus;
  paymentMethod?: string;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
  customerName?: string;
  muaName?: string;
  serviceName?: string;
}

export interface AdminWithdrawQueryDTO {
  page?: number;
  pageSize?: number;
  muaId?: string;
  status?: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  reference?: string;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
  muaName?: string;
}

// ==================== RESPONSE DTOs ====================

export interface AdminTransactionResponseDTO {
  _id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  muaId: string;
  muaName: string;
  muaEmail: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  refundReason?: RefundReason;
  paymentMethod: string;
  paymentReference: string;
  payoutId?: string;
  bookingDate: Date;
  bookingStatus: string;
  bookingAddress: string;
  bookingNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminWithdrawResponseDTO {
  _id: string;
  muaId: string;
  muaName: string;
  muaEmail: string;
  muaPhone: string;
  muaLocation: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  reference: string;
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    bankCode: string;
    bankBin: string;
  };
  requestedAt: Date;
  processedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== LIST RESPONSE DTOs ====================

export interface AdminTransactionListResponseDTO {
  transactions: AdminTransactionResponseDTO[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  total: number;
}

export interface AdminWithdrawListResponseDTO {
  withdrawals: AdminWithdrawResponseDTO[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  total: number;
}

// ==================== SUMMARY DTOs ====================

export interface TransactionSummaryDTO {
  transactions: {
    total: number;
    totalAmount: number;
    byStatus: {
      HOLD: number;
      CAPTURED: number;
      PENDING_REFUND: number;
      REFUNDED: number;
    };
    amountByStatus: {
      HOLD: number;
      CAPTURED: number;
      PENDING_REFUND: number;
      REFUNDED: number;
    };
  };
  withdrawals: {
    total: number;
    totalAmount: number;
    byStatus: {
      PENDING: number;
      PROCESSING: number;
      SUCCESS: number;
      FAILED: number;
    };
    amountByStatus: {
      PENDING: number;
      PROCESSING: number;
      SUCCESS: number;
      FAILED: number;
    };
  };
  summary: {
    totalRevenue: number;
    totalWithdrawn: number;
    platformBalance: number;
    pendingPayouts: number;
    refundsPending: number;
  };
}

// ==================== ACTION DTOs ====================

export interface ProcessRefundDTO {
  transactionId: string;
  reason?: string;
  adminNotes?: string;
}

export interface ApproveWithdrawalDTO {
  withdrawalId: string;
  reference?: string;
  adminNotes?: string;
}

export interface RejectWithdrawalDTO {
  withdrawalId: string;
  reason: string;
  adminNotes?: string;
}

export interface BulkProcessTransactionsDTO {
  transactionIds: string[];
  action: 'CAPTURE' | 'REFUND';
  reason?: string;
  adminNotes?: string;
}

export interface BulkProcessWithdrawalsDTO {
  withdrawalIds: string[];
  action: 'APPROVE' | 'REJECT';
  reason?: string;
  adminNotes?: string;
}

// ==================== STATISTICS DTOs ====================

export interface TransactionStatisticsDTO {
  totalTransactions: number;
  totalAmount: number;
  totalRevenue: number; // CAPTURED transactions
  totalRefunded: number;
  pendingRefunds: number;
  averageTransactionAmount: number;
  statusBreakdown: {
    HOLD: { count: number; amount: number; percentage: number };
    CAPTURED: { count: number; amount: number; percentage: number };
    PENDING_REFUND: { count: number; amount: number; percentage: number };
    REFUNDED: { count: number; amount: number; percentage: number };
  };
  monthlyTrends: {
    month: string;
    transactions: number;
    amount: number;
    revenue: number;
  }[];
  topMUAs: {
    muaId: string;
    muaName: string;
    transactions: number;
    totalAmount: number;
  }[];
  topCustomers: {
    customerId: string;
    customerName: string;
    transactions: number;
    totalAmount: number;
  }[];
}

export interface WithdrawalStatisticsDTO {
  totalWithdrawals: number;
  totalAmount: number;
  totalProcessed: number; // SUCCESS withdrawals
  totalPending: number;
  averageWithdrawalAmount: number;
  statusBreakdown: {
    PENDING: { count: number; amount: number; percentage: number };
    PROCESSING: { count: number; amount: number; percentage: number };
    SUCCESS: { count: number; amount: number; percentage: number };
    FAILED: { count: number; amount: number; percentage: number };
  };
  monthlyTrends: {
    month: string;
    withdrawals: number;
    amount: number;
    processed: number;
  }[];
  topMUAs: {
    muaId: string;
    muaName: string;
    withdrawals: number;
    totalAmount: number;
  }[];
  averageProcessingTime: number; // in hours
}

// ==================== FILTER OPTIONS ====================

export interface TransactionFilterOptionsDTO {
  statuses: { value: string; label: string; count: number }[];
  paymentMethods: { value: string; label: string; count: number }[];
  serviceCategories: { value: string; label: string; count: number }[];
  dateRanges: {
    today: { from: string; to: string };
    yesterday: { from: string; to: string };
    thisWeek: { from: string; to: string };
    lastWeek: { from: string; to: string };
    thisMonth: { from: string; to: string };
    lastMonth: { from: string; to: string };
    thisYear: { from: string; to: string };
  };
  amountRanges: {
    under100k: { min: number; max: number };
    from100kTo500k: { min: number; max: number };
    from500kTo1m: { min: number; max: number };
    from1mTo5m: { min: number; max: number };
    over5m: { min: number; max?: number };
  };
}

export interface WithdrawalFilterOptionsDTO {
  statuses: { value: string; label: string; count: number }[];
  bankNames: { value: string; label: string; count: number }[];
  dateRanges: {
    today: { from: string; to: string };
    yesterday: { from: string; to: string };
    thisWeek: { from: string; to: string };
    lastWeek: { from: string; to: string };
    thisMonth: { from: string; to: string };
    lastMonth: { from: string; to: string };
    thisYear: { from: string; to: string };
  };
  amountRanges: {
    under1m: { min: number; max: number };
    from1mTo5m: { min: number; max: number };
    from5mTo10m: { min: number; max: number };
    from10mTo50m: { min: number; max: number };
    over50m: { min: number; max?: number };
  };
}

// ==================== EXPORT DTOs ====================

export interface ExportTransactionsDTO {
  format: 'CSV' | 'EXCEL' | 'PDF';
  filters: AdminTransactionQueryDTO;
  columns: string[];
  includeDetails: boolean;
}

export interface ExportWithdrawalsDTO {
  format: 'CSV' | 'EXCEL' | 'PDF';
  filters: AdminWithdrawQueryDTO;
  columns: string[];
  includeDetails: boolean;
}

// ==================== AUDIT DTOs ====================

export interface TransactionAuditLogDTO {
  transactionId: string;
  action: string;
  adminId: string;
  adminName: string;
  oldStatus?: string;
  newStatus?: string;
  reason?: string;
  notes?: string;
  timestamp: Date;
}

export interface WithdrawalAuditLogDTO {
  withdrawalId: string;
  action: string;
  adminId: string;
  adminName: string;
  oldStatus?: string;
  newStatus?: string;
  reason?: string;
  notes?: string;
  timestamp: Date;
}