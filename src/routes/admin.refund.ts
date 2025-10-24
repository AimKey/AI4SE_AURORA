/**
 * Admin Refund Routes
 * 
 * Routes for refund management operations
 */

import { Router } from 'express';
import {
  getRefundsController,
  getRefundSummaryController,
  processRefundController,
} from '../controllers/admin.refund.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

// ==================== REFUND ROUTES ====================

/**
 * GET /admin/refunds
 * Get refund transactions with filtering and pagination
 */
router.get('/', getRefundsController);

/**
 * GET /admin/refunds/summary
 * Get refund summary statistics
 */
router.get('/summary', getRefundSummaryController);

/**
 * POST /admin/refunds/:transactionId/process
 * Process a single refund request
 */
router.post('/:transactionId/process', processRefundController);


export default router;