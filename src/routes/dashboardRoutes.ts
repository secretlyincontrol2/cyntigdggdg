import express from 'express';
import {
    getDashboard,
    getActivityHistory,
    getPerformanceOverview
} from '../controllers/dashboardController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Dashboard endpoints (all protected)
router.get('/', protect, getDashboard);
router.get('/activities', protect, getActivityHistory);
router.get('/performance', protect, getPerformanceOverview);

export default router;
