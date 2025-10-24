import { Router } from 'express';
import * as servicesController from '@controllers/services.controller';
import { authenticateToken } from '../middleware/auth.middleware'; 

const router = Router();

// Get all services for an MUA
router.get('/mua/:muaId', servicesController.getAllByMua);

// Create a new service - Protected
router.post('/mua/:muaId', authenticateToken, servicesController.create);

// Update a service - Protected
router.put('/:serviceId', authenticateToken, servicesController.update);

// Delete a service - Protected
router.delete('/:serviceId', authenticateToken, servicesController.remove);

export default router;
