import { Router } from 'express';
import disasterRoutes from './disasterRoutes.js';
import resourceRoutes from './resourceRoutes.js';

const router = Router();

// Health check route
router.get('/', (req, res) => {
  res.json({ message: 'Disaster Response API is running!' });
});

router.use('/disasters', disasterRoutes);
router.use('/resources',resourceRoutes)


export default router;