// apps/backend/src/controllers/admin.transaction.controller.ts
import type { Request, Response } from "express";
import type { ApiResponseDTO } from "../types/common.dtos";
import { 
  getPayoutList, 
  getPayoutDetail, 
  buildPayoutListQuery 
} from "../services/payos.service";
import { 
  getTransactions as getTransactionsService,
  getWithdrawals,
  getTransactionSummary,
  getTransactionById as getTransactionByIdService,
  getWithdrawalById
} from "../services/admin.transaction.service";
import type {
  AdminTransactionQueryDTO,
  AdminWithdrawQueryDTO,
  TransactionSummaryDTO
} from "../types/admin.transaction.dto";

// Helper functions for consistent response format
const successResponse = <T>(res: Response, data: T, message: string = 'Success', statusCode: number = 200) => {
  const response: ApiResponseDTO<T> = {
    status: statusCode,
    success: true,
    message,
    data
  };
  return res.status(statusCode).json(response);
};

const errorResponse = (res: Response, message: string = 'An error occurred', statusCode: number = 500, error?: string) => {
  const response: ApiResponseDTO = {
    status: statusCode,
    success: false,
    message,
    error
  };
  return res.status(statusCode).json(response);
};

export class AdminTransactionController {

  // ==================== PAYOUT MANAGEMENT ====================

  /**
   * GET /admin/payouts
   * Get list of payouts with filtering and pagination
   */
  async getPayouts(req: Request, res: Response) {
    try {
      const {
        page = "1",
        pageSize = "10",
        referenceId,
        approvalState,
        categories,
        fromDate,
        toDate
      } = req.query as Record<string, string>;

      // Build query using helper function
      const query = buildPayoutListQuery({
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        referenceId,
        approvalState: approvalState as "APPROVED" | "PENDING" | "REJECTED",
        categories: categories ? categories.split(',') : undefined,
        fromDate,
        toDate
      });

      const data = await getPayoutList(query);

      return successResponse(res, data, "Payouts retrieved successfully");
    } catch (error) {
      return errorResponse(res, error instanceof Error ? error.message : "Failed to get payouts", 500);
    }
  }

  /**
   * GET /admin/payouts/:payoutId
   * Get detailed information about a specific payout
   */
  async getPayoutById(req: Request, res: Response) {
    try {
      const { payoutId } = req.params;

      if (!payoutId) {
        return errorResponse(res, "Payout ID is required", 400);
      }

      const data = await getPayoutDetail(payoutId);

      return successResponse(res, data, "Payout detail retrieved successfully");
    } catch (error) {
      return errorResponse(res, error instanceof Error ? error.message : "Failed to get payout detail", 500);
    }
  }

  // ==================== TRANSACTION MANAGEMENT ====================

  /**
   * GET /admin/transactions
   * Get list of transactions with filtering and pagination
   */
  async getTransactions(req: Request, res: Response) {
    try {
      const {
        page = "1",
        pageSize = "10",
        customerId,
        bookingId,
        status,
        paymentMethod,
        fromDate,
        toDate,
        minAmount,
        maxAmount,
        customerName,
        muaName,
        serviceName
      } = req.query as Record<string, string>;

      const filters: AdminTransactionQueryDTO = {
        customerId,
        bookingId,
        status: status as any,
        paymentMethod,
        fromDate,
        toDate,
        minAmount: minAmount ? parseFloat(minAmount) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
        customerName,
        muaName,
        serviceName
      };

      const data = await getTransactionsService(
        parseInt(page),
        parseInt(pageSize),
        filters
      );

      return successResponse(res, data, "Transactions retrieved successfully");
    } catch (error) {
      return errorResponse(res, error instanceof Error ? error.message : "Failed to get transactions", 500);
    }
  }

  /**
   * GET /admin/transactions/:transactionId
   * Get detailed information about a specific transaction
   */
  async getTransactionById(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        return errorResponse(res, "Transaction ID is required", 400);
      }

      const data = await getTransactionByIdService(transactionId);

      if (!data) {
        return errorResponse(res, "Transaction not found", 404);
      }

      return successResponse(res, data, "Transaction retrieved successfully");
    } catch (error) {
      return errorResponse(res, error instanceof Error ? error.message : "Failed to get transaction", 500);
    }
  }

  /**
   * GET /admin/withdrawals
   * Get list of withdrawals with filtering and pagination
   */
  async getWithdrawals(req: Request, res: Response) {
    try {
      const {
        page = "1",
        pageSize = "10",
        muaId,
        status,
        reference,
        fromDate,
        toDate,
        minAmount,
        maxAmount,
        muaName
      } = req.query as Record<string, string>;

      const filters: AdminWithdrawQueryDTO = {
        muaId,
        status: status as any,
        reference,
        fromDate,
        toDate,
        minAmount: minAmount ? parseFloat(minAmount) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
        muaName
      };

      const data = await getWithdrawals(
        parseInt(page),
        parseInt(pageSize),
        filters
      );

      return successResponse(res, data, "Withdrawals retrieved successfully");
    } catch (error) {
      return errorResponse(res, error instanceof Error ? error.message : "Failed to get withdrawals", 500);
    }
  }

  /**
   * GET /admin/withdrawals/:withdrawalId
   * Get detailed information about a specific withdrawal
   */
  async getWithdrawalById(req: Request, res: Response) {
    try {
      const { withdrawalId } = req.params;

      if (!withdrawalId) {
        return errorResponse(res, "Withdrawal ID is required", 400);
      }

      const data = await getWithdrawalById(withdrawalId);

      if (!data) {
        return errorResponse(res, "Withdrawal not found", 404);
      }

      return successResponse(res, data, "Withdrawal retrieved successfully");
    } catch (error) {
      return errorResponse(res, error instanceof Error ? error.message : "Failed to get withdrawal", 500);
    }
  }

  // ==================== ADMIN SUMMARY ROUTES ====================

  /**
   * GET /admin/transactions/summary
   * Get summary statistics for admin dashboard
   */
  async getTransactionSummary(req: Request, res: Response) {
    try {
      const {
        fromDate,
        toDate
      } = req.query as Record<string, string>;

      const summary = await getTransactionSummary(fromDate, toDate);

      return successResponse(res, summary, "Transaction summary retrieved successfully");
    } catch (error) {
      return errorResponse(res, error instanceof Error ? error.message : "Failed to get transaction summary", 500);
    }
  }

}
