/**
 * Admin User Controller
 * 
 * Handles HTTP requests for admin user and MUA management operations
 */

import type { Request, Response } from "express";
import type { ApiResponseDTO } from "../types/common.dtos";
import * as AdminUserService from "../services/admin.user.service";

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

// ==================== USER MANAGEMENT ====================

/**
 * GET /admin/users
 * Get paginated list of users with filtering
 */
export async function getUsers(req: Request, res: Response) {
  try {
    const query = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      role: req.query.role as any,
      status: req.query.status as any,
      search: req.query.search as string,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
      fromDate: req.query.fromDate as string,
      toDate: req.query.toDate as string
    };

    const result = await AdminUserService.getUsers(query);
    
    return successResponse(res, result, 'Users retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * GET /admin/users/:id
 * Get user by ID
 */
export async function getUserById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const user = await AdminUserService.getUserById(id);
    
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    
    return successResponse(res, user, 'User retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * PUT /admin/users/:id/ban
 * Ban a user
 */
export async function banUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const banData = req.body;
    
    const user = await AdminUserService.banUser(id, banData);
    
    return successResponse(res, user, 'User banned successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * PUT /admin/users/:id/unban
 * Unban a user
 */
export async function unbanUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const user = await AdminUserService.unbanUser(id);
    
    return successResponse(res, user, 'User unbanned successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * PUT /admin/users/bulk-ban
 * Ban multiple users
 */
export async function bulkBanUsers(req: Request, res: Response) {
  try {
    const bulkData = req.body;
    
    if (!bulkData.userIds || !Array.isArray(bulkData.userIds) || bulkData.userIds.length === 0) {
      return errorResponse(res, 'User IDs array is required', 400);
    }
    
    const result = await AdminUserService.bulkBanUsers(bulkData);
    
    return successResponse(res, result, `Bulk ban completed: ${result.successful} successful, ${result.failed} failed`);
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * PUT /admin/users/bulk-unban
 * Unban multiple users
 */
export async function bulkUnbanUsers(req: Request, res: Response) {
  try {
    const bulkData = req.body;
    
    if (!bulkData.userIds || !Array.isArray(bulkData.userIds) || bulkData.userIds.length === 0) {
      return errorResponse(res, 'User IDs array is required', 400);
    }
    
    const result = await AdminUserService.bulkUnbanUsers(bulkData);
    
    return successResponse(res, result, `Bulk unban completed: ${result.successful} successful, ${result.failed} failed`);
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}

// ==================== MUA MANAGEMENT ====================

/**
 * GET /admin/muas
 * Get paginated list of MUAs with filtering
 */
export async function getMUAs(req: Request, res: Response) {
  try {
    const query = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 10,
      status: req.query.status as any,
      search: req.query.search as string,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
      fromDate: req.query.fromDate as string,
      toDate: req.query.toDate as string
    };

    const result = await AdminUserService.getMUAs(query);
    
    return successResponse(res, result, 'MUAs retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * GET /admin/muas/:id
 * Get MUA by ID
 */
export async function getMUAById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const mua = await AdminUserService.getMUAById(id);
    
    if (!mua) {
      return errorResponse(res, 'MUA not found', 404);
    }
    
    return successResponse(res, mua, 'MUA retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * PUT /admin/muas/:id/approve
 * Approve a MUA application
 */
export async function approveMUA(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const approveData = req.body;
    
    const mua = await AdminUserService.approveMUA(id, approveData);
    
    return successResponse(res, mua, 'MUA approved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * PUT /admin/muas/:id/reject
 * Reject a MUA application
 */
export async function rejectMUA(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const rejectData = req.body;
    
    if (!rejectData.reason) {
      return errorResponse(res, 'Rejection reason is required', 400);
    }
    
    const mua = await AdminUserService.rejectMUA(id, rejectData);
    
    return successResponse(res, mua, 'MUA rejected successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * PUT /admin/muas/bulk-approve
 * Approve multiple MUA applications
 */
export async function bulkApproveMUAs(req: Request, res: Response) {
  try {
    const bulkData = req.body;
    
    if (!bulkData.muaIds || !Array.isArray(bulkData.muaIds) || bulkData.muaIds.length === 0) {
      return errorResponse(res, 'MUA IDs array is required', 400);
    }
    
    const result = await AdminUserService.bulkApproveMUAs(bulkData);
    
    return successResponse(res, result, `Bulk approval completed: ${result.successful} successful, ${result.failed} failed`);
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * PUT /admin/muas/bulk-reject
 * Reject multiple MUA applications
 */
export async function bulkRejectMUAs(req: Request, res: Response) {
  try {
    const bulkData = req.body;
    
    if (!bulkData.muaIds || !Array.isArray(bulkData.muaIds) || bulkData.muaIds.length === 0) {
      return errorResponse(res, 'MUA IDs array is required', 400);
    }
    
    if (!bulkData.reason) {
      return errorResponse(res, 'Rejection reason is required', 400);
    }
    
    const result = await AdminUserService.bulkRejectMUAs(bulkData);
    
    return successResponse(res, result, `Bulk rejection completed: ${result.successful} successful, ${result.failed} failed`);
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * PUT /admin/muas/:id/ban
 * Ban a MUA (ban the associated user)
 */
export async function banMUA(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const banData = req.body;
    
    const result = await AdminUserService.banMUA(id, banData);
    
    return successResponse(res, result, 'MUA banned successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * PUT /admin/muas/:id/unban
 * Unban a MUA (unban the associated user)
 */
export async function unbanMUA(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const result = await AdminUserService.unbanMUA(id);
    
    return successResponse(res, result, 'MUA unbanned successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}

// ==================== STATISTICS ====================

/**
 * GET /admin/users/statistics
 * Get user statistics
 */
export async function getUserStatistics(req: Request, res: Response) {
  try {
    const statistics = await AdminUserService.getUserStatistics();
    
    return successResponse(res, statistics, 'User statistics retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * GET /admin/muas/statistics  
 * Get MUA statistics
 */
export async function getMUAStatistics(req: Request, res: Response) {
  try {
    const statistics = await AdminUserService.getMUAStatistics();
    
    return successResponse(res, statistics, 'MUA statistics retrieved successfully');
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
}