"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const leaderboardController_1 = require("../controllers/leaderboardController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Public leaderboard endpoints
router.get('/', leaderboardController_1.getLeaderboard);
router.get('/filters', leaderboardController_1.getLeaderboardFilters);
router.get('/course/:courseId', leaderboardController_1.getCourseLeaderboardEndpoint);
router.get('/department/:department', leaderboardController_1.getDepartmentLeaderboardEndpoint);
// Protected user-specific endpoints
router.get('/me', authMiddleware_1.protect, leaderboardController_1.getMyRank);
router.get('/achievements', authMiddleware_1.protect, leaderboardController_1.getAchievements);
router.get('/compare', authMiddleware_1.protect, leaderboardController_1.compareWithCompetitors);
exports.default = router;
