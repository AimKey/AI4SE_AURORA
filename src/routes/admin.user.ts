/**
 * Admin User Routes
 * 
 * Routes for admin user and MUA management operations
 * Requires admin authentication and proper permissions
 */

import { Router } from "express";
import * as AdminUserController from "../controllers/admin.user.controller";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";

const router = Router();

// Apply admin authentication to all routes
router.use(authenticateToken);
router.use(requireRole(['ADMIN']));

// ==================== USER MANAGEMENT ROUTES ====================

/**
 * GET /admin/users
 * Get paginated list of users with filtering
 * Query params: page, pageSize, role, status, search, sortBy, sortOrder, fromDate, toDate
 */
router.get('/users', AdminUserController.getUsers);

/**
 * GET /admin/users/statistics
 * Get user statistics
 */
router.get('/users/statistics', AdminUserController.getUserStatistics);

/**
 * GET /admin/users/:id
 * Get user by ID
 */
router.get('/users/:id', AdminUserController.getUserById);

/**
 * PUT /admin/users/:id/ban
 * Ban a user
 * Body: { reason?: string }
 */
router.put('/users/:id/ban', AdminUserController.banUser);

/**
 * PUT /admin/users/:id/unban
 * Unban a user
 */
router.put('/users/:id/unban', AdminUserController.unbanUser);

/**
 * PUT /admin/users/bulk-ban
 * Ban multiple users
 * Body: { userIds: string[], reason?: string }
 */
router.put('/users/bulk-ban', AdminUserController.bulkBanUsers);

/**
 * PUT /admin/users/bulk-unban
 * Unban multiple users
 * Body: { userIds: string[] }
 */
router.put('/users/bulk-unban', AdminUserController.bulkUnbanUsers);

// ==================== MUA MANAGEMENT ROUTES ====================

/**
 * GET /admin/muas
 * Get paginated list of MUAs with filtering
 * Query params: page, pageSize, status, search, sortBy, sortOrder, fromDate, toDate
 */
router.get('/muas', AdminUserController.getMUAs);

/**
 * GET /admin/muas/statistics
 * Get MUA statistics
 */
router.get('/muas/statistics', AdminUserController.getMUAStatistics);

/**
 * GET /admin/muas/:id
 * Get MUA by ID
 */
router.get('/muas/:id', AdminUserController.getMUAById);

/**
 * PUT /admin/muas/:id/approve
 * Approve a MUA application
 * Body: { adminNotes?: string }
 */
router.put('/muas/:id/approve', AdminUserController.approveMUA);

/**
 * PUT /admin/muas/:id/reject
 * Reject a MUA application
 * Body: { reason: string }
 */
router.put('/muas/:id/reject', AdminUserController.rejectMUA);

/**
 * PUT /admin/muas/bulk-approve
 * Approve multiple MUA applications
 * Body: { muaIds: string[], adminNotes?: string }
 */
router.put('/muas/bulk-approve', AdminUserController.bulkApproveMUAs);

/**
 * PUT /admin/muas/bulk-reject
 * Reject multiple MUA applications
 * Body: { muaIds: string[], reason: string }
 */
router.put('/muas/bulk-reject', AdminUserController.bulkRejectMUAs);

/**
 * PUT /admin/muas/:id/ban
 * Ban a MUA (ban the associated user)
 * Body: { reason?: string }
 */
router.put('/muas/:id/ban', AdminUserController.banMUA);

/**
 * PUT /admin/muas/:id/unban
 * Unban a MUA (unban the associated user)
 */
router.put('/muas/:id/unban', AdminUserController.unbanMUA);

export default router;