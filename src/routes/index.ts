import { Router } from 'express';
import authRoutes from './auth';
import artistsRoutes from "./artists";
import artistScheduleRoutes from "./artist-schedule";
import transactionRoutes from "./transaction";
import bookingRoutes from "./booking";
import communityRoutes from "./community";
import uploadRoutes from "./upload";
import dashboardRoutes from "./dashboard";
import profileRoutes from "./profile";
import feedbackRoutes from "./feedback"; 
import serviceRoutes from "./services";
import portfolioRoutes from "./portfolio.routes";
import certificateRoutes from "./certificate.routes";

import adminTransactionRoutes from "./admin.transaction";
import adminUserRoutes from "./admin.user";
import refundRoutes from "./admin.refund";
import withdrawalRoutes from "./admin.withdrawal";
const router = Router();

// API routes
router.get('/', (req, res) => {
  res.json({ 
    message: 'AURA API is running!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      health: '/health'
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use("/artists", artistsRoutes);
router.use("/artist-schedule", artistScheduleRoutes);
router.use("/booking",bookingRoutes);
router.use("/transaction", transactionRoutes);
router.use("/community", communityRoutes);
router.use('/upload', uploadRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/profile', profileRoutes);
router.use('/feedback', feedbackRoutes); 
router.use("/services", serviceRoutes);
router.use("/portfolios", portfolioRoutes);
router.use("/certificates", certificateRoutes);
router.use('/admin/transactions', adminTransactionRoutes);
router.use('/admin', adminUserRoutes);
router.use('/admin/refunds', refundRoutes);
router.use('/admin/withdrawals', withdrawalRoutes);

export default router;
