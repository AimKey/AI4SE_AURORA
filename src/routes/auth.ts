import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken, requireEmailVerification } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Public routes (no authentication required)
router.post('/register', authController.register.bind(authController));
router.post('/register-mua', authController.registerAsMua.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/google-login', authController.googleLogin.bind(authController));
router.post('/send-verification', authController.sendEmailVerification.bind(authController));
router.post('/verify-email', authController.verifyEmail.bind(authController));
router.post('/forgot-password', authController.forgotPassword.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));
router.post('/refresh', authController.refresh.bind(authController));

// Protected routes (authentication required)
router.get('/profile', authenticateToken, authController.getProfile.bind(authController));
router.put('/profile', authenticateToken, authController.updateProfile.bind(authController));
router.get('/booking-history', authenticateToken, authController.getBookingHistory.bind(authController));
router.get('/stats', authenticateToken, authController.getUserStats.bind(authController));
router.post('/resend-verification', authenticateToken, authController.resendVerificationEmail.bind(authController));
router.get('/check-verification', authenticateToken, authController.checkEmailVerification.bind(authController));

export default router;
