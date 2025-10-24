/**
 * Admin Refund Controller
 * 
 * Controller for managing refund requests and processing refunds
 */

import type { Request, Response } from 'express';
import {
  getRefunds,
  getRefundSummary,
  processRefund,
} from '../services/admin.refund.service';
import type {
  AdminRefundQueryDTO,
  BulkProcessRefundDTO
} from '../types/admin.refund.dto';

// ==================== GET REFUNDS ====================

/**
 * GET /admin/refunds
 * Get refund transactions with filtering and pagination
 */
export async function getRefundsController(req: Request, res: Response) {
  try {
    const query: AdminRefundQueryDTO = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      status: req.query.status as any || 'all',
      customerName: req.query.customerName as string,
      muaName: req.query.muaName as string,
      bookingId: req.query.bookingId as string,
      fromDate: req.query.fromDate as string,
      toDate: req.query.toDate as string,
      minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
      maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined
    };

    const result = await getRefunds(query);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in getRefundsController:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ==================== GET REFUND SUMMARY ====================

/**
 * GET /admin/refunds/summary
 * Get refund summary statistics
 */
export async function getRefundSummaryController(req: Request, res: Response) {
  try {
    const query = {
      fromDate: req.query.fromDate as string,
      toDate: req.query.toDate as string
    };

    const result = await getRefundSummary(query);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in getRefundSummaryController:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ==================== PROCESS REFUND ====================

/**
 * POST /admin/refunds/:transactionId/process
 * Process a single refund request
 */
export async function processRefundController(req: Request, res: Response) {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    const result = await processRefund(transactionId);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in processRefundController:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ==================== BULK PROCESS REFUNDS ====================

/**
 * POST /admin/refunds/bulk-process
 * Process multiple refund requests
 */


// ==================== UPDATE REFUND STATUS ====================

/**
 * PATCH /admin/refunds/:transactionId/status
 * Update refund status manually (for admin override)
 */
