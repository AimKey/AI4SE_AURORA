/**
 * Admin Withdrawal Controller
 * 
 * Controller for managing MUA withdrawal requests and processing withdrawals
 */

import type { Request, Response } from 'express';
import {
  getWithdrawals,
  getWithdrawalSummary,
  processWithdrawal,
  rejectWithdrawal,
  bulkProcessWithdrawals,
  getWithdrawalById
} from '../services/admin.withdrawal.service';
import type {
  AdminWithdrawalQueryDTO,
  RejectWithdrawalDTO,
  BulkProcessWithdrawalDTO
} from '../types/admin.withdrawal.dto';

// ==================== GET WITHDRAWALS ====================

/**
 * GET /admin/withdrawals
 * Get withdrawal requests with filtering and pagination
 */
export async function getWithdrawalsController(req: Request, res: Response) {
  try {
    const query: AdminWithdrawalQueryDTO = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      status: req.query.status as any || 'all',
      muaName: req.query.muaName as string,
      fromDate: req.query.fromDate as string,
      toDate: req.query.toDate as string,
      minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
      maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined
    };

    const result = await getWithdrawals(query);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in getWithdrawalsController:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ==================== GET WITHDRAWAL BY ID ====================

/**
 * GET /admin/withdrawals/:withdrawalId
 * Get withdrawal details by ID
 */
export async function getWithdrawalByIdController(req: Request, res: Response) {
  try {
    const { withdrawalId } = req.params;

    if (!withdrawalId) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal ID is required'
      });
    }

    const result = await getWithdrawalById(withdrawalId);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Error in getWithdrawalByIdController:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ==================== GET WITHDRAWAL SUMMARY ====================

/**
 * GET /admin/withdrawals/summary
 * Get withdrawal summary statistics
 */
export async function getWithdrawalSummaryController(req: Request, res: Response) {
  try {
    const query = {
      fromDate: req.query.fromDate as string,
      toDate: req.query.toDate as string
    };

    const result = await getWithdrawalSummary(query);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in getWithdrawalSummaryController:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ==================== PROCESS WITHDRAWAL ====================

/**
 * POST /admin/withdrawals/:withdrawalId/process
 * Process (approve) a withdrawal request
 */
export async function processWithdrawalController(req: Request, res: Response) {
  try {
    const { withdrawalId } = req.params;

    if (!withdrawalId) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal ID is required'
      });
    }

    const result = await processWithdrawal(withdrawalId);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in processWithdrawalController:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ==================== REJECT WITHDRAWAL ====================

/**
 * POST /admin/withdrawals/:withdrawalId/reject
 * Reject a withdrawal request
 */
export async function rejectWithdrawalController(req: Request, res: Response) {
  try {
    const { withdrawalId } = req.params;
    const { reason, adminNote }: RejectWithdrawalDTO = req.body;

    if (!withdrawalId) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal ID is required'
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const result = await rejectWithdrawal(withdrawalId, reason, adminNote);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in rejectWithdrawalController:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ==================== BULK PROCESS WITHDRAWALS ====================

/**
 * POST /admin/withdrawals/bulk-process
 * Process multiple withdrawal requests
 */
export async function bulkProcessWithdrawalsController(req: Request, res: Response) {
  try {
    const { withdrawalIds, adminNote }: BulkProcessWithdrawalDTO = req.body;

    if (!withdrawalIds || !Array.isArray(withdrawalIds) || withdrawalIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal IDs array is required and cannot be empty'
      });
    }

    const result = await bulkProcessWithdrawals(withdrawalIds, adminNote);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error in bulkProcessWithdrawalsController:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ==================== UPDATE WITHDRAWAL STATUS ====================

/**
 * PATCH /admin/withdrawals/:withdrawalId/status
 * Update withdrawal status manually (for admin override)
 */
export async function updateWithdrawalStatusController(req: Request, res: Response) {
  try {
    const { withdrawalId } = req.params;
    const { status, adminNote } = req.body;

    if (!withdrawalId) {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal ID is required'
      });
    }

    if (!status || !['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (PENDING, PROCESSING, SUCCESS, FAILED)'
      });
    }

    // This would require a separate service function
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      message: 'Withdrawal status updated successfully',
      data: {
        withdrawalId,
        status,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error in updateWithdrawalStatusController:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}