"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const goalController_1 = require("../controllers/goalController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Goal generation
router.post('/generate-daily', authMiddleware_1.protect, goalController_1.generateDailyGoalsEndpoint);
router.post('/generate-weekly', authMiddleware_1.protect, goalController_1.generateWeeklyGoalsEndpoint);
// Goal retrieval
router.get('/today', authMiddleware_1.protect, goalController_1.getTodayGoals);
router.get('/recommendations', authMiddleware_1.protect, goalController_1.getGoalRecommendations);
router.get('/', authMiddleware_1.protect, goalController_1.getAllGoals);
// Goal management
router.put('/:goalId/progress', authMiddleware_1.protect, goalController_1.updateGoalProgressEndpoint);
router.put('/:goalId/abandon', authMiddleware_1.protect, goalController_1.abandonGoal);
exports.default = router;
