import { Router } from 'express';
import disasterRoutes from './disasterRoutes.js';
import resourceRoutes from './resourceRoutes.js';
import * as aggregationController from '../controllers/aggregationController.js';

const router = Router();

// Health check route
router.get('/', (req, res) => {
  res.json({ message: 'Disaster Response API is running!' });
});

router.use('/disasters', disasterRoutes);
router.use('/resources',resourceRoutes)

router.get('/disasters/:id/social-media', aggregationController.getSocialMedia);
router.get('/official-updates', aggregationController.getOfficialUpdates);
router.post('/verify-image', aggregationController.verifyImage);


export default router;