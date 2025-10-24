/**
 * Validate Admin Middleware
 * 
 * Additional validation for admin operations
 */

import type { Request, Response, NextFunction } from 'express';
import { USER_ROLES } from '../constants/index';

/**
 * Validate that the user has admin role
 * This should be used after adminAuth middleware
 */
export const validateAdmin = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const adminUser = (req as any).adminUser;
    
    if (!adminUser) {
      res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
      return;
    }
    
    if (adminUser.role !== USER_ROLES.ADMIN) {
      res.status(403).json({
        success: false,
        message: 'Admin privileges required'
      });
      return;
    }
    
    if (adminUser.isBanned) {
      res.status(403).json({
        success: false,
        message: 'Admin account is banned'
      });
      return;
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Admin validation error'
    });
  }
};