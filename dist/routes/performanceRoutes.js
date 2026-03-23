"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const performanceController_1 = require("../controllers/performanceController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Performance tracking
router.post('/practice-result', authMiddleware_1.protect, performanceController_1.trackPracticeResult);
router.get('/me', authMiddleware_1.protect, performanceController_1.getUserPerformance);
router.get('/trends', authMiddleware_1.protect, performanceController_1.getPerformanceTrends);
router.get('/course/:courseId', authMiddleware_1.protect, performanceController_1.getCoursePerformance);
router.get('/recommendations', authMiddleware_1.protect, performanceController_1.getRecommendations);
exports.default = router;
