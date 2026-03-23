"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dashboardController_1 = require("../controllers/dashboardController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Dashboard endpoints (all protected)
router.get('/', authMiddleware_1.protect, dashboardController_1.getDashboard);
router.get('/activities', authMiddleware_1.protect, dashboardController_1.getActivityHistory);
router.get('/performance', authMiddleware_1.protect, dashboardController_1.getPerformanceOverview);
exports.default = router;
