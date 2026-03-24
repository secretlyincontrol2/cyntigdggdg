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

import { execSync } from 'child_process';
import axios from 'axios';

const app = express();

app.use(cors());
app.use(express.json());

// Initialize AI system
initializeAI().catch(err => console.error('AI initialization error:', err));

// Proxy to Python AI Server (running on 3002 inside Docker)
app.all('/api/ai/test', (req, res) => {
    res.json({ message: 'AI Proxy Route is active 🤖', originalUrl: req.originalUrl });
});

app.post(/^\/api\/ai\/(.*)/, async (req, res) => {
    try {
        const aiPath = req.originalUrl.replace('/api/ai', '');
        console.log(`[PROXY] POST ${req.originalUrl} -> http://127.0.0.1:3002/api/ai${aiPath}`);
        
        const response = await axios({
            method: 'post',
            url: `http://127.0.0.1:3002/api/ai${aiPath}`,
            data: req.body,
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000 // 30s timeout for AI
        });
        res.status(response.status).json(response.data);
    } catch (error: any) {
        console.error('AI Proxy POST Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ message: 'AI Server is offline or starting up' });
        }
        res.status(error.response?.status || 500).json(error.response?.data || { message: 'AI Server Error' });
    }
});

app.get(/^\/api\/ai\/(.*)/, async (req, res) => {
    try {
        const aiPath = req.originalUrl.replace('/api/ai', '');
        console.log(`[PROXY] GET ${req.originalUrl} -> http://127.0.0.1:3002/api/ai${aiPath}`);

        const response = await axios({
            method: 'get',
            url: `http://127.0.0.1:3002/api/ai${aiPath}`,
            params: req.query,
            timeout: 10000
        });
        res.status(response.status).json(response.data);
    } catch (error: any) {
        console.error('AI Proxy GET Error:', error.message);
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ message: 'AI Server is offline or starting up' });
        }
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

// Debug route to see container diagnostics
app.get('/api/admin/debug', (req, res) => {
    try {
        const fs = require('fs');
        const log = fs.existsSync('python.log') ? fs.readFileSync('python.log', 'utf8') : 'Log not found';
        const files = execSync('ls -R').toString();
        res.json({ log, files });
    } catch (err: any) {
        res.status(500).json({ error: err.message, stderr: err.stderr?.toString() });
    }
});

// Test route
app.get('/', (req, res) => {
    res.send('BUPT-AI API is running v1.0.10-PROXY-FIX ✅ (Proxy Active)');
});

export default app;
