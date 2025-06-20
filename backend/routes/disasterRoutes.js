import { Router } from 'express';
import * as disasterController from '../controllers/disasterController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Public routes
router.get('/', disasterController.getAllDisasters);


// Protected routes
router.post('/', authMiddleware, disasterController.createDisaster);
router.put('/:id', authMiddleware, disasterController.updateDisaster);
router.delete('/:id', authMiddleware, disasterController.deleteDisaster);

export default router;