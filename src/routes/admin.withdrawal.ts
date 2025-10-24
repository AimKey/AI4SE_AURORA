/**
 * Admin Withdrawal Routes
 * 
 * Routes for withdrawal management operations
 */

import { Router } from 'express';
import {
  getWithdrawalsController,
  getWithdrawalByIdController,
  getWithdrawalSummaryController,
  processWithdrawalController,
  rejectWithdrawalController,
  bulkProcessWithdrawalsController,
  updateWithdrawalStatusController
} from '../controllers/admin.withdrawal.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

// ==================== WITHDRAWAL ROUTES ====================

/**
 * GET /admin/withdrawals
 * Get withdrawal requests with filtering and pagination
 */
router.get('/', getWithdrawalsController);

/**
 * GET /admin/withdrawals/summary
 * Get withdrawal summary statistics
 */
router.get('/summary', getWithdrawalSummaryController);

/**
 * GET /admin/withdrawals/:withdrawalId
 * Get withdrawal details by ID
 */
router.get('/:withdrawalId', getWithdrawalByIdController);

/**
 * POST /admin/withdrawals/:withdrawalId/process
 * Process (approve) a withdrawal request
 */
router.post('/:withdrawalId/process', processWithdrawalController);

/**
 * POST /admin/withdrawals/:withdrawalId/reject
 * Reject a withdrawal request
 */
router.post('/:withdrawalId/reject', rejectWithdrawalController);

/**
 * POST /admin/withdrawals/bulk-process
 * Process multiple withdrawal requests
 */
router.post('/bulk-process', bulkProcessWithdrawalsController);

/**
 * PATCH /admin/withdrawals/:withdrawalId/status
 * Update withdrawal status manually
 */
router.patch('/:withdrawalId/status', updateWithdrawalStatusController);

export default router;