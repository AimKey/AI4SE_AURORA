import type { PaymentMethod, PayoutCategory, RefundReason, TransactionStatus } from "constants/index";

export interface CreateTransactionDTO {
  bookingId: string;
  customerId: string;
  status?: TransactionStatus; // default HOLD
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentReference: string;
}
export interface UpdateTransactionDTO {
  amount?: number;
  currency?: string;
  status?: TransactionStatus;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
}
export interface TransactionResponseDTO {
    _id: string;
    payoutId?: string;   // id của lệnh payout nếu có
    bookingId: string;
    customerId: string;
    customerName:string;
    serviceName:string;
    bookingTime:string;
    bookingDate?: string; 
    amount: number;
    currency: string;
    refundReason?:RefundReason;
    status: TransactionStatus;
    paymentMethod: PaymentMethod;
}
// Withdraw dtos
export interface CreateWithdrawDTO {
  muaId: string;
  amount: number;
  currency?: string; // default 'VND'
}
export interface UpdateWithdrawDTO {
  amount?: number;
  currency?: string;
  status?: string;
}
export interface WithdrawResponseDTO {
  _id: string;
  muaId: string;
  amount: number;
  currency: string;
  status: string;
  withdrawTime: string;
  withdrawDate?: string;
}

export interface WalletResponseDTO {
  _id: string;
  muaId: string;
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface PayOSCreateLinkInput {
  amount: number;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  orderCode?: number;
};

export interface PayOSCreateLinkResult {
  checkoutUrl: string;
  orderCode: number;
  signature: string;
  raw: any;
};

export interface PaymentWebhookResponse {
  code: string;
  desc: string;
  success: boolean;
  data: {
    accountNumber: string;
    amount: number;
    description: string;
    reference: string;
    transactionDateTime: string;       // ISO date string "YYYY-MM-DD HH:mm:ss"
    virtualAccountNumber: string;
    counterAccountBankId: string;
    counterAccountBankName: string;
    counterAccountName: string;
    counterAccountNumber: string;
    virtualAccountName: string;
    currency: string;
    orderCode: number;
    paymentLinkId: string;
    code: string;
    desc: string;
  };
  signature: string;
}

export interface PayoutInput{
  referenceId: string;
  amount: number;
  description: string;
  toBin: string;
  toAccountNumber: string;
  category: PayoutCategory[];
}

// ===== Payout Response DTOs =====
export interface PayoutTransactionDTO {
  id: string;
  referenceId: string;
  amount: number;
  description: string;
  toBin: string;
  toAccountNumber: string;
  toAccountName: string;
  reference: string;
  transactionDatetime: string; // ISO string
  errorMessage?: string;
  errorCode?: string;
  // State from provider (e.g., SUCCEEDED, FAILED, etc.)
  state: string;
}

export interface PayoutResponseDataDTO {
  id: string;
  referenceId: string;
  transactions: PayoutTransactionDTO[];
  category: PayoutCategory[];
  approvalState: string;
  createdAt: string; // ISO string
}

export interface PayoutResponseDTO {
  code: string; // e.g. "00"
  desc: string; // e.g. "Success"
  data: PayoutResponseDataDTO;
}

// ===== Payout List DTOs =====
export interface PayoutListQueryDTO {
  limit?: number; // Default: 10
  offset?: number; // Default: 0
  referenceId?: string; // Mã tham chiếu để lọc
  approvalState?: "APPROVED" | "PENDING" | "REJECTED"; // Trạng thái phê duyệt để lọc
  category?: string; // Danh mục để lọc (phân cách bằng dấu phẩy)
  fromDate?: string; // ISO date-time string
  toDate?: string; // ISO date-time string
}

export interface PayoutListTransactionDTO {
  id: string;
  referenceId: string;
  amount: number;
  description: string;
  toBin: string;
  toAccountNumber: string;
  toAccountName: string;
  reference: string;
  transactionDatetime: string; // ISO string
  errorMessage?: string;
  errorCode?: string;
  state: "SUCCEEDED" | "FAILED" | "PENDING" | "PROCESSING";
}

export interface PayoutListItemDTO {
  id: string;
  referenceId: string;
  transactions: PayoutListTransactionDTO[];
  category: string[];
  approvalState: "APPROVED" | "PENDING" | "REJECTED";
  createdAt: string; // ISO string
}

export interface PayoutListPaginationDTO {
  limit: number;
  offset: number;
  total: number;
  count: number;
  hasMore: boolean;
}

export interface PayoutListDataDTO {
  payouts: PayoutListItemDTO[];
  pagination: PayoutListPaginationDTO;
}

export interface PayoutListResponseDTO {
  code: string; // e.g. "00"
  desc: string; // e.g. "Success"
  data: PayoutListDataDTO;
}

export interface PayoutAccountDetailDTO {
  code: string; // e.g. "00"
  desc: string; // e.g. "Success"
  data: {
    accountNumber: string;
    accountName: string;
    currency: string;
    balance:number;
  }
}