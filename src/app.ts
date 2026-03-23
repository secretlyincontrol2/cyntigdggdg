import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import onboardingRoutes from './routes/onboardingRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import tutorRoutes from './routes/tutorRoutes';
import performanceRoutes from './routes/performanceRoutes';
import goalRoutes from './routes/goalRoutes';
import leaderboardRoutes from './routes/leaderboardRoutes';
import flashcardRoutes from './routes/flashcardRoutes';
import { initializeAI } from './controllers/tutorController';

const app = express();

app.use(cors());
app.use(express.json());

// Initialize AI system
initializeAI().catch(err => console.error('AI initialization error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/flashcards', flashcardRoutes);

// Test route
app.get('/', (req, res) => {
    res.send('BUPT-AI API is running ✅');
});

export default app;
