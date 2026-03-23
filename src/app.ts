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

import axios from 'axios';

const app = express();

app.use(cors());
app.use(express.json());

// Initialize AI system
initializeAI().catch(err => console.error('AI initialization error:', err));

// Proxy to Python AI Server (running on 3002 inside Docker)
app.post('/api/ai/*', async (req, res) => {
    try {
        const aiPath = req.originalUrl.replace('/api/ai', '');
        const response = await axios({
            method: 'post',
            url: `http://localhost:3002/api/ai${aiPath}`,
            data: req.body,
            headers: { 'Content-Type': 'application/json' }
        });
        res.status(response.status).json(response.data);
    } catch (error: any) {
        console.error('AI Proxy Error:', error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { message: 'AI Server Error' });
    }
});

app.get('/api/ai/*', async (req, res) => {
    try {
        const aiPath = req.originalUrl.replace('/api/ai', '');
        const response = await axios({
            method: 'get',
            url: `http://localhost:3002/api/ai${aiPath}`,
            params: req.query
        });
        res.status(response.status).json(response.data);
    } catch (error: any) {
        res.status(error.response?.status || 500).json(error.response?.data || { message: 'AI Server Error' });
    }
});

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
