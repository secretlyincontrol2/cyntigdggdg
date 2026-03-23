import express from 'express';
import {
    generateDailyGoalsEndpoint,
    generateWeeklyGoalsEndpoint,
    getTodayGoals,
    updateGoalProgressEndpoint,
    getGoalRecommendations,
    abandonGoal,
    getAllGoals
} from '../controllers/goalController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Goal generation
router.post('/generate-daily', protect, generateDailyGoalsEndpoint);
router.post('/generate-weekly', protect, generateWeeklyGoalsEndpoint);

// Goal retrieval
router.get('/today', protect, getTodayGoals);
router.get('/recommendations', protect, getGoalRecommendations);
router.get('/', protect, getAllGoals);

// Goal management
router.put('/:goalId/progress', protect, updateGoalProgressEndpoint);
router.put('/:goalId/abandon', protect, abandonGoal);

export default router;
