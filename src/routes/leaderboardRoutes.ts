import express from 'express';
import {
    getLeaderboard,
    getCourseLeaderboardEndpoint,
    getDepartmentLeaderboardEndpoint,
    getMyRank,
    getAchievements,
    getLeaderboardFilters,
    compareWithCompetitors
} from '../controllers/leaderboardController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Public leaderboard endpoints
router.get('/', getLeaderboard);
router.get('/filters', getLeaderboardFilters);
router.get('/course/:courseId', getCourseLeaderboardEndpoint);
router.get('/department/:department', getDepartmentLeaderboardEndpoint);

// Protected user-specific endpoints
router.get('/me', protect, getMyRank);
router.get('/achievements', protect, getAchievements);
router.get('/compare', protect, compareWithCompetitors);

export default router;
