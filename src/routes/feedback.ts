import { Router } from 'express'; 
import { authenticateToken } from '../middleware/auth.middleware'; 
import { FeedbackController } from '../controllers/feedback.controller'; 


const router = Router(); 
const controller = new FeedbackController(); 

// Public route: recent feedback by MUA (no auth)
router.get('/mua/:muaId/recent', (req, res) => controller.getRecentByMua(req, res));

// Apply auth to the remaining feedback routes
router.use(authenticateToken);

// Routes as specified
router.get('/mine', (req, res) => controller.getMine(req, res));
router.post('/', (req, res) => controller.create(req, res));
router.patch('/:id', (req, res) => controller.update(req, res));
router.delete('/:id', (req, res) => controller.remove(req, res));

// Routes for MUA Feedback Page (authenticated)
router.get('/mua/summary', (req, res) => controller.getFeedbackSummaryByMua(req, res));
router.get('/mua/service/:serviceId', (req, res) => controller.getFeedbackForService(req, res));

export default router; 
