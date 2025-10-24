/**
 * Admin Refund DTOs
 * 
 * Types for refund management operations
 */

// ==================== QUERY DTOs ====================

export interface AdminRefundQueryDTO {
  page?: number;
  pageSize?: number;
  status?: 'all' | 'PENDING_REFUND' | 'REFUNDED';
  customerName?: string;
  muaName?: string;
  bookingId?: string;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

// ==================== RESPONSE DTOs ====================

export interface AdminRefundResponseDTO {
  _id: string;
  originalTransactionId: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  muaId: string;
  muaName: string;
  muaEmail: string;
  originalAmount: number;
  refundAmount: number;
  refundReason: string;
  status: 'PENDING_REFUND' | 'REFUNDED';
  requestedAt: Date | string;
  processedAt?: Date | string;
  refundMethod: 'original_payment' | 'bank_transfer' | 'wallet';
  processingFee: number;
  netRefundAmount: number;
  paymentReference?: string;
  payoutId?: string;
  serviceName?: string;
  serviceCategory?: string;
  bookingDate?: Date | string;
  bookingStatus?: string;
  bookingAddress?: string;
  bookingNote?: string;
  notes?: string;
}

export interface AdminRefundListResponseDTO {
  refunds: AdminRefundResponseDTO[];
  total: number;
  pagination: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ==================== SUMMARY DTOs ====================

export interface RefundSummaryDTO {
  totalRefunds: number;
  totalRefundAmount: number;
  byStatus: {
    PENDING_REFUND: {
      count: number;
      amount: number;
    };
    REFUNDED: {
      count: number;
      amount: number;
    };
  };
}

// ==================== ACTION DTOs ====================

export interface ProcessRefundDTO {
  transactionId: string;
  adminNote?: string;
}

export interface BulkProcessRefundDTO {
  transactionIds: string[];
  adminNote?: string;
}

export interface RefundProcessResponseDTO {
  transactionId: string;
  payoutId?: string;
  amount: number;
  processedAt: Date;
}