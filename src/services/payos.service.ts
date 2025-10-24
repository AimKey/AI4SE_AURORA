/**
 * PayOS Service
 * 
 * This service handles all PayOS-related operations including:
 * - Payment link creation
 * - Refund/payout processing
 * - Webhook validation
 * - Utility functions for PayOS integration
 * 
 * Separated from transaction.service.ts for better code organization
 */

import { BankAccount, Transaction, Wallet, Withdraw } from "models/transactions.model";
import type { PayOSCreateLinkInput, PayOSCreateLinkResult, PaymentWebhookResponse, PayoutInput, PayoutResponseDTO, PayoutListQueryDTO, PayoutListResponseDTO, PayoutAccountDetailDTO } from "types/transaction.dto";
import { config } from "config";
import { createPayOSOutHttp, createPayOSSignedHttp, payosHttp } from "utils/payosHttp";
import crypto from "crypto";
import { BOOKING_STATUS, PAYOUT_CATEGORIES, TRANSACTION_STATUS, WITHDRAW_STATUS, type RefundReason } from "constants/index";
import { Booking } from "@models/bookings.models";
import { createPayOSPaymentSignature, createPayOSPayoutSignature } from "utils/payoutSignature";
import { MUA } from "@models/muas.models";
import { User } from "@models/users.models";
import { EmailService } from "./email.service";
import mongoose from "mongoose";

// ==================== Helper Functions ====================

/**
 * Send low balance alert to all admin users
 */
async function notifyAdminsOfLowBalance(
  requestType: 'refund' | 'withdrawal',
  requestedAmount: number,
  currentBalance: number,
  requestId: string
): Promise<void> {
  try {
    // Find all users with ADMIN role
    const adminUsers = await User.find({ role: 'ADMIN' }).exec();
    
    if (adminUsers.length === 0) {
      console.warn('No admin users found to notify about low balance');
      return;
    }

    const emailService = new EmailService();
    
    // Send email to each admin
    const emailPromises = adminUsers.map(admin => 
      emailService.sendLowBalanceAlert(
        admin.email,
        admin.fullName || 'Admin',
        requestType,
        requestedAmount,
        currentBalance,
        requestId
      ).catch(error => {
        console.error(`Failed to send low balance alert to admin ${admin.email}:`, error);
      })
    );

    await Promise.allSettled(emailPromises);
    console.log(`Low balance alerts sent to ${adminUsers.length} admin(s)`);
  } catch (error) {
    console.error('Error notifying admins of low balance:', error);
  }
}

// ==================== PayOS Payment Link ====================

/**
 * Generate a random 6-digit order code for PayOS payment
 */
export function generateOrderCode(): number {
  const random = crypto.randomInt(100000, 999999); // random 6 số
  return random;
}

/**
 * Create PayOS payment link for customer payment
 */
export async function createPayOSPaymentLink(input: PayOSCreateLinkInput): Promise<PayOSCreateLinkResult> {
  if (!config.payosClientId || !config.payosApiKey || !config.payosChecksumKey) {
    throw new Error("Missing PayOS credentials (clientId/apiKey/checksumKey)");
  }
  
  // Generate a simple 6-digit order code (similar to PayOS sample). Allow override via input.
  const orderCode = input.orderCode || generateOrderCode();
  const signature = createPayOSPaymentSignature({
    amount: input.amount,
    cancelUrl: input.cancelUrl,
    description: input.description,
    orderCode,
    returnUrl: input.returnUrl,
  });

  const payload = {
    orderCode,
    amount: input.amount,
    description: input.description,
    returnUrl: input.returnUrl,
    cancelUrl: input.cancelUrl,
    signature,
  };

  const response = await payosHttp.post("/v2/payment-requests", payload);
  const checkoutUrl = (response.data && (response.data.checkoutUrl || response.data.data?.checkoutUrl)) || "";
  return { checkoutUrl, orderCode, signature, raw: response.data };
}

// ==================== PayOS Payout/Refund ====================

/**
 * Process refund for a booking through PayOS payout
 */
export async function getPayoutDetail(payoutId: string): Promise<PayoutResponseDTO> {
  if (!config.payosPOClientId || !config.payosPOApiKey || !config.payosPOChecksumKey) {
    throw new Error("Missing PayOS payout credentials (clientId/apiKey/checksumKey)");
  }
  const payoutHttp = await createPayOSOutHttp();
  const response = await payoutHttp.get(`/v1/payouts/${payoutId}`);
  return response.data;
}
export async function makeRefund(bookingId: string, refundReason: RefundReason): Promise<PayoutResponseDTO> {
  if (!config.payosPOClientId || !config.payosPOApiKey || !config.payosPOChecksumKey) {
    throw new Error("Missing PayOS payout credentials (clientId/apiKey/checksumKey)");
  }
  
  const bookingData = await Booking.findById(bookingId).exec();
  if (!bookingData) {
    throw new Error(`Booking with ID ${bookingId} not found.`);
  }
  
  if (bookingData.status !== BOOKING_STATUS.PENDING) {
    throw new Error(`Booking with ID ${bookingId} is not in PENDING status.`);
  }
  
  const bankAccount = await BankAccount.findOne({ userId: bookingData.customerId }).exec();
  if (!bankAccount) {
    throw new Error(`Bank account for user with ID ${bookingData.customerId} not found.`);
  }
  
  const transaction = await Transaction.findOne({ bookingId: bookingId }).exec();
  if (!transaction) {
    throw new Error(`Transaction with bookingId ${bookingId} not found.`);
  }
  
  if (transaction.status !== TRANSACTION_STATUS.HOLD && transaction.status !== TRANSACTION_STATUS.PENDING_REFUND) {
    throw new Error(`Transaction with bookingId ${bookingId} is not in HOLD status.`);
  }
  const payoutAccount = await getPayoutAccountDetail();
  if(payoutAccount.code ==='00' && payoutAccount.data.balance < (transaction.amount || 0)) {
    // Notify admins about insufficient balance
    transaction.status = TRANSACTION_STATUS.PENDING_REFUND;
    transaction.refundReason = refundReason;
    await transaction.save();
    await notifyAdminsOfLowBalance(
      'refund',
      transaction.amount || 0,
      payoutAccount.data.balance,
      bookingId
    );
    throw new Error(`Refund feature is temporarily unavailable due to insufficient payout account balance. Please wait for admin send notification email and try it later!`);
  }
  const payload: PayoutInput = {
    referenceId: transaction.paymentReference || '',
    amount: transaction.amount || 0,
    description: `AURA: REFUND FOR ${bookingId.slice(0, 6)}`,
    toBin: bankAccount?.bankBin || '',
    toAccountNumber: bankAccount?.accountNumber || '',
    category: [PAYOUT_CATEGORIES.REFUND]
  };

  console.info("makePayout called", { payload });
  
  // Create signature using the correct PayOS payout signature method
  const signature = createPayOSPayoutSignature(payload, config.payosPOChecksumKey);
  
  const signedHttp = await createPayOSSignedHttp(
    crypto.randomUUID(),
    signature
  );
  
  const response = await signedHttp.post("/v1/payouts", payload);
  console.info("makePayout response", { responseData: response.data });
  return response.data;
}

export async function makeWithdrawal(muaId: string): Promise<PayoutResponseDTO> {
  if (!config.payosPOClientId || !config.payosPOApiKey || !config.payosPOChecksumKey) {
    throw new Error("Missing PayOS payout credentials (clientId/apiKey/checksumKey)");
  }
  
  const muaData = await MUA.findById(muaId).exec();
  if (!muaData) {
    throw new Error(`MUA with ID ${muaId} not found.`);
  }
  const bankAccount = await BankAccount.findOne({ userId: muaData.userId }).exec();
  if (!bankAccount) {
    throw new Error(`Bank account for user with ID ${muaData.userId} not found.`);
  }
  const wallet = await Wallet.findOne({ muaId: muaId }).exec();
  if (!wallet) {
    throw new Error(`Wallet for MUA with ID ${muaId} not found.`);
  }
  if(wallet.balance <= 0) {
    throw new Error(`Wallet for MUA with ID ${muaId} has insufficient balance.`);
  }
   const payoutAccount = await getPayoutAccountDetail();
  if(payoutAccount.code ==='00' && payoutAccount.data.balance < (wallet.balance || 0)) {
    const existingPendingWithdraw = await Withdraw.findOne({ muaId: muaId, status: WITHDRAW_STATUS.PENDING }).exec(); 
    if(existingPendingWithdraw) {
      throw new Error(`You already have a pending withdrawal request. Please wait for it to be processed before making a new one.`);
    }
    const withdrawRecord = new Withdraw({
        muaId: new mongoose.Types.ObjectId(muaId),
        amount: wallet.balance,
        currency: wallet.currency,
        status: WITHDRAW_STATUS.PENDING,
      });
      await withdrawRecord.save();
    await notifyAdminsOfLowBalance(
      'withdrawal',
      wallet.balance || 0,
      payoutAccount.data.balance,
      muaId
    );
    throw new Error(`Withdrawal feature is temporarily unavailable due to insufficient payout account balance. Please wait for admin send notification email and try it later!`);
  }
  const payload: PayoutInput = {
    referenceId: '',
    amount: wallet.balance || 0,
    description: `AURA: PAYOUT FOR ${muaId.slice(0, 6)}`,
    toBin: bankAccount?.bankBin || '',
    toAccountNumber: bankAccount?.accountNumber || '',
    category: [PAYOUT_CATEGORIES.WITHDRAWAL]
  };

  console.info("makePayout called", { payload });
  
  // Create signature using the correct PayOS payout signature method
  const signature = createPayOSPayoutSignature(payload, config.payosPOChecksumKey);
  
  const signedHttp = await createPayOSSignedHttp(
    crypto.randomUUID(),
    signature
  );
  
  const response = await signedHttp.post("/v1/payouts", payload);
  console.info("makePayout response", { responseData: response.data });
  return response.data;
}
export async function getPayoutAccountDetail(): Promise<PayoutAccountDetailDTO> {
  if (!config.payosPOClientId || !config.payosPOApiKey || !config.payosPOChecksumKey) {
    throw new Error("Missing PayOS payout credentials (clientId/apiKey/checksumKey)");
  }
  const payoutHttp = await createPayOSOutHttp();
  const response = await payoutHttp.get(`/v1/payouts-account/balance`);
  return response.data;
}

/**
 * Get list of payouts with optional filtering and pagination
 */
export async function getPayoutList(query: PayoutListQueryDTO = {}): Promise<PayoutListResponseDTO> {
  if (!config.payosPOClientId || !config.payosPOApiKey || !config.payosPOChecksumKey) {
    throw new Error("Missing PayOS payout credentials (clientId/apiKey/checksumKey)");
  }

  const payoutHttp = await createPayOSOutHttp();
  
  // Build query parameters
  const params: Record<string, any> = {
    limit: query.limit || 10,
    offset: query.offset || 0,
  };

  // Add optional filters
  if (query.referenceId) params.referenceId = query.referenceId;
  if (query.approvalState) params.approvalState = query.approvalState;
  if (query.category) params.category = query.category;
  if (query.fromDate) params.fromDate = query.fromDate;
  if (query.toDate) params.toDate = query.toDate;

  console.info("getPayoutList called", { query, params });
  
  const response = await payoutHttp.get("/v1/payouts", { params });
  console.info("getPayoutList response", { responseData: response.data });
  
  return response.data;
}

// ==================== PayOS Webhook Validation ====================

export function validatePayOSWebhook(data: PaymentWebhookResponse): boolean {
  // Add webhook signature validation logic here if needed
  // For now, basic validation
  return !!(data?.data?.orderCode && data?.data?.reference && data?.data?.amount);
}

// }
// ==================== PayOS Utility Functions ====================

/**
 * Check if PayOS payment credentials are configured
 */
export function isPayOSPaymentConfigured(): boolean {
  return !!(config.payosClientId && config.payosApiKey && config.payosChecksumKey);
}

/**
 * Check if PayOS payout credentials are configured
 */
export function isPayOSPayoutConfigured(): boolean {
  return !!(config.payosPOClientId && config.payosPOApiKey && config.payosPOChecksumKey);
}

/**
 * Parse PayOS webhook response and extract key information
 */
export function parsePayOSWebhookData(data: PaymentWebhookResponse) {
  return {
    orderCode: data?.data?.orderCode,
    reference: data?.data?.reference,
    amount: data?.data?.amount,
    description: data?.data?.description,
    accountNumber: data?.data?.accountNumber,
    currency: data?.data?.currency || 'VND',
    paymentLinkId: data?.data?.paymentLinkId,
  };
}

/**
 * Helper function to build payout list query parameters
 */
export function buildPayoutListQuery(
  options: {
    page?: number;
    pageSize?: number;
    referenceId?: string;
    approvalState?: "APPROVED" | "PENDING" | "REJECTED";
    categories?: string[];
    fromDate?: Date | string;
    toDate?: Date | string;
  } = {}
): PayoutListQueryDTO {
  const query: PayoutListQueryDTO = {};

  // Pagination
  if (options.page && options.pageSize) {
    query.limit = options.pageSize;
    query.offset = (options.page - 1) * options.pageSize;
  } else {
    if (options.pageSize) query.limit = options.pageSize;
  }

  // Filters
  if (options.referenceId) query.referenceId = options.referenceId;
  if (options.approvalState) query.approvalState = options.approvalState;
  if (options.categories && options.categories.length > 0) {
    query.category = options.categories.join(',');
  }

  // Date filters
  if (options.fromDate) {
    query.fromDate = options.fromDate instanceof Date 
      ? options.fromDate.toISOString() 
      : options.fromDate;
  }
  if (options.toDate) {
    query.toDate = options.toDate instanceof Date 
      ? options.toDate.toISOString() 
      : options.toDate;
  }

  return query;
}
