import express from 'express';
import {
    askStudyQuestion,
    requestExplanation,
    askAudioQuestion,
    startStudySession,
    endStudySession,
    getSessionHistory
} from '../controllers/tutorController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Study session routes
router.post('/study-session/start', protect, startStudySession);
router.post('/study-session/end', protect, endStudySession);
router.get('/sessions', protect, getSessionHistory);

// Q&A routes
router.post('/study', protect, askStudyQuestion);
router.post('/explain', protect, requestExplanation);
router.post('/audio-question', protect, askAudioQuestion);

export default router;
