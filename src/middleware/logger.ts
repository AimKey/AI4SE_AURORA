import type { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export const logger = (req: Request, res: Response, next: NextFunction) => {
  if (config.isDevelopment) {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  }
  next();
};