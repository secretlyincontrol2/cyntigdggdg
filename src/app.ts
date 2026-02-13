import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';

import onboardingRoutes from './routes/onboardingRoutes';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);

// Test route
app.get('/', (req, res) => {
    res.send('BUPT-AI API is running');
});

export default app;
