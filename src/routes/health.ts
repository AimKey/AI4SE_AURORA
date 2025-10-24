import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
