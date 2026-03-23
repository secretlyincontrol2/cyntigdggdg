"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const onboardingRoutes_1 = __importDefault(require("./routes/onboardingRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const tutorRoutes_1 = __importDefault(require("./routes/tutorRoutes"));
const performanceRoutes_1 = __importDefault(require("./routes/performanceRoutes"));
const goalRoutes_1 = __importDefault(require("./routes/goalRoutes"));
const leaderboardRoutes_1 = __importDefault(require("./routes/leaderboardRoutes"));
const flashcardRoutes_1 = __importDefault(require("./routes/flashcardRoutes"));
const tutorController_1 = require("./controllers/tutorController");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize AI system
(0, tutorController_1.initializeAI)().catch(err => console.error('AI initialization error:', err));
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/onboarding', onboardingRoutes_1.default);
app.use('/api/dashboard', dashboardRoutes_1.default);
app.use('/api/tutor', tutorRoutes_1.default);
app.use('/api/performance', performanceRoutes_1.default);
app.use('/api/goals', goalRoutes_1.default);
app.use('/api/leaderboard', leaderboardRoutes_1.default);
app.use('/api/flashcards', flashcardRoutes_1.default);
// Test route
app.get('/', (req, res) => {
    res.send('BUPT-AI API is running ✅');
});
exports.default = app;
