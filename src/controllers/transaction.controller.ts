import type { Request, Response } from "express";
import type { ApiResponseDTO } from "types";
import { createPayOSPaymentLink, getMUAWallet, getTransactionsByMuaId, getWithdrawalsByMuaId, handlePayOSWebhook, handleRefundBookingBeforeConfirm, handleWithdrawalMUA, makeRefund } from "../services/transaction.service";
import type { PaymentWebhookResponse, PayOSCreateLinkInput } from "types/transaction.dto";
import type { TransactionStatus } from "constants/index";
export class TransactionController {
  // Create a new transaction
  async createTransactionLink(req: Request, res: Response): Promise<void> {
    try {
      const { amount, description, returnUrl, cancelUrl ,orderCode} = req.body as PayOSCreateLinkInput;

      if (
        amount === undefined ||
        amount === null ||
        Number.isNaN(Number(amount)) ||
        !description ||
        !returnUrl ||
        !cancelUrl
      ) {
        const response: ApiResponseDTO = {
          status: 400,
          success: false,
          message: "Missing or invalid fields: amount, description, returnUrl, cancelUrl"
        };
        res.status(400).json(response);
        return;
      }

      const data = await createPayOSPaymentLink({
        amount: Number(amount),
        description,
        returnUrl,
        cancelUrl,
        orderCode
      });

      const response: ApiResponseDTO = {
        status: 201,
        success: true,
        message: "Payment link created successfully",
        data: {
          checkoutUrl: data.checkoutUrl,
          orderCode: data.orderCode,
          signature: data.signature,
        }
      };
      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create payment link'
      };
      res.status(500).json(response);
    }
  }
 
 async webhookHandler(req: Request, res: Response): Promise<void> {
  try {
    //get redis pending booking
    //if success -> create booking, create transaction hold
    //if fail -> remove redis pending booking
    const data = req.body as PaymentWebhookResponse;
    console.log("Received PayOS webhook:", data);

    const transaction =  await handlePayOSWebhook(data);

    const response: ApiResponseDTO = {
      status: 200,
      success: true,
      data: transaction,
      message: transaction
        ? 'Webhook processed successfully'
        : 'Booking not found, ignored webhook'
    };
    res.status(200).json(response);

  } catch (error) {
    console.error("Webhook error:", error);
    // vẫn trả 200 để PayOS không retry hoài
    res.status(200).json({
      status: 200,
      success: false,
      message: "Webhook received but failed internally"
    });
  }
}
async makeRefundBeforeConfirm(req: Request, res: Response): Promise<void> {
  try {
    const { bookingId } = req.params as { bookingId: string };
    const { bookingStatus } = req.query as { bookingStatus: string };
    if (!bookingId) {
      res.status(400).json({
        status: 400,
        success: false,
        message: "Missing bookingId"
      }); 
      return;
    }
    // const data = await makeRefund(bookingId);
    const data = await handleRefundBookingBeforeConfirm(bookingId,bookingStatus);
    const response: ApiResponseDTO = {
      status: 200,
      success: true,
      data: data,
      message: 'Refund successfully'
    };
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponseDTO = {
      status: 500,
      success: false,
      message: error instanceof Error ? error.message : 'Failed to process refund'
      };
      res.status(500).json(response);
    }
  }
async makeWithdrawal(req: Request, res: Response): Promise<void> {
    try {
      const { muaId } = req.params as { muaId: string };
      if (!muaId) {
        res.status(400).json({
          status: 400,
          success: false,
          message: "Missing muaId"
        }); 
        return;
      }
      const data = await handleWithdrawalMUA(muaId);
      const response: ApiResponseDTO = {
        status: 200,
        success: true,
        data: data,
        message: 'Withdrawal successfully'
      };
      res.status(200).json(response);
    }
    catch (error) {
      const response: ApiResponseDTO = {
        status: 500,
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process withdrawal'
      };
      res.status(500).json(response);
    }
  }

async fetchTransactionsByMuaId(req: Request, res: Response): Promise<void> {
  try {
    const { muaId } = req.params as { muaId: string };
    const {page, pageSize, status} = req.query as {page?: string, pageSize?: string, status?: TransactionStatus};
    if (!muaId) {
      res.status(400).json({
        status: 400,
        success: false,
        message: "Missing muaId"
      }); 
      return;
    }
    const data = await getTransactionsByMuaId(muaId, page ? parseInt(page) : 1, pageSize ? parseInt(pageSize) : 10, status);
    const response: ApiResponseDTO = {
      status: 200,
      success: true,
      data: data,
      message: 'Get transaction successfully'
    };
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponseDTO = {
      status: 500,
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get transaction'
    };
    res.status(500).json(response);
  }
}
async fetchWalletByMuaId(req: Request, res: Response): Promise<void> {
  try {
    const { muaId } = req.params as { muaId: string };
    const data = await getMUAWallet(muaId);
    if (!data) {
      res.status(404).json({
        status: 404,
        success: false,
        message: "Wallet not found"
      });
      return;
    }
    const response: ApiResponseDTO = {
      status: 200,
      success: true,
      data: data,
      message: 'Get wallet successfully'
    };
    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponseDTO = {
      status: 500,
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get wallet'
    };
    res.status(500).json(response);
  }
}
async fetchWithdrawalsByMuaId(req: Request, res: Response): Promise<void> {
  try {
    const { muaId } = req.params as { muaId: string };
    const {page, pageSize, status} = req.query as {page?: string, pageSize?: string, status?: string};
    if (!muaId) {
      res.status(400).json({
        status: 400,
        success: false,
        message: "Missing muaId"
      }); 
      return;
    }
    const data = await getWithdrawalsByMuaId(muaId, page ? parseInt(page) : 1, pageSize ? parseInt(pageSize) : 10, status);
    const response: ApiResponseDTO = {
      status: 200,
      success: true,
      data: data,
      message: 'Get withdrawal successfully'
    };
    res.status(200).json(response);
  }
  catch (error) {
    const response: ApiResponseDTO = {
      status: 500,
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get withdrawal'
    };
    res.status(500).json(response);
  }
}
}

