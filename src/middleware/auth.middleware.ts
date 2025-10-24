import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    // Verify token
    const decoded = authService.verifyToken(token);
    
    // Add user info to request
    (req as any).user = decoded;
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

export const requireEmailVerification = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    // Check if email is verified
    authService.isEmailVerified(userId).then(isVerified => {
      if (!isVerified) {
        res.status(403).json({
          success: false,
          message: 'Email verification required'
        });
        return;
      }
      next();
    }).catch(error => {
      res.status(500).json({
        success: false,
        message: 'Failed to verify email status'
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const user = await authService.getUserById(userId);
      
      if (!user || !roles.includes(user.role)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }
      
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = authService.verifyToken(token);
        (req as any).user = decoded;
      } catch (error) {
        // Token is invalid, but we continue without user info
        (req as any).user = null;
      }
    } else {
      (req as any).user = null;
    }
    
    next();
  } catch (error) {
    (req as any).user = null;
    next();
  }
};
