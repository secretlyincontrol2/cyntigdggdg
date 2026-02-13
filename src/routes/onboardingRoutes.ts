import express from 'express';
import { updateOnboarding } from '../controllers/onboardingController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/', protect, updateOnboarding);

export default router;
