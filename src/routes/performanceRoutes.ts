import express from 'express';
import {
    trackPracticeResult,
    getUserPerformance,
    getPerformanceTrends,
    getCoursePerformance,
    getRecommendations
} from '../controllers/performanceController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Performance tracking
router.post('/practice-result', protect, trackPracticeResult);
router.get('/me', protect, getUserPerformance);
router.get('/trends', protect, getPerformanceTrends);
router.get('/course/:courseId', protect, getCoursePerformance);
router.get('/recommendations', protect, getRecommendations);

export default router;
