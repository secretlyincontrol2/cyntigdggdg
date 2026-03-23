import express from 'express';
import {
    generateCards,
    getCards,
    reviewCard,
    removeCard
} from '../controllers/flashcardController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/generate', protect, generateCards);
router.get('/', protect, getCards);
router.put('/:cardId/review', protect, reviewCard);
router.delete('/:cardId', protect, removeCard);

export default router;
