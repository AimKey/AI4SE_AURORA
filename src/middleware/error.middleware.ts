import type { Request, Response, NextFunction } from 'express';

// Express error handling middleware: always place after all routes
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({
    status: statusCode,
    success: false,
    message,
  });
}