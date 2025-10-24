/**
 * Admin Withdrawal DTOs
 * 
 * Types for withdrawal management operations
 */

// ==================== QUERY DTOs ====================

export interface AdminWithdrawalQueryDTO {
  page?: number;
  pageSize?: number;
  status?: 'all' | 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  muaName?: string;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

// ==================== RESPONSE DTOs ====================

export interface AdminWithdrawalResponseDTO {
  _id: string;
  muaId: string;
  muaName: string;
  muaEmail: string;
  muaPhone?: string;
  muaLocation?: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  reference?: string;
  bankInfo?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    bankCode: string;
    bankBin: string;
  };
  requestedAt: Date | string;
  processedAt?: Date | string;
  processingFee: number;
  netAmount: number;
  transactionIds: string[];
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AdminWithdrawalListResponseDTO {
  withdrawals: AdminWithdrawalResponseDTO[];
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

export interface WithdrawalSummaryDTO {
  totalWithdrawals: number;
  totalWithdrawalAmount: number;
  byStatus: {
    PENDING: {
      count: number;
      amount: number;
    };
    PROCESSING: {
      count: number;
      amount: number;
    };
    SUCCESS: {
      count: number;
      amount: number;
    };
    FAILED: {
      count: number;
      amount: number;
    };
  };
}

// ==================== ACTION DTOs ====================

export interface ProcessWithdrawalDTO {
  withdrawalId: string;
  adminNote?: string;
}

export interface RejectWithdrawalDTO {
  withdrawalId: string;
  reason: string;
  adminNote?: string;
}

export interface BulkProcessWithdrawalDTO {
  withdrawalIds: string[];
  adminNote?: string;
}

export interface WithdrawalProcessResponseDTO {
  withdrawalId: string;
  reference?: string;
  amount: number;
  processedAt: Date;
}