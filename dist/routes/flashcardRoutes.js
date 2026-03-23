"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const flashcardController_1 = require("../controllers/flashcardController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
router.post('/generate', authMiddleware_1.protect, flashcardController_1.generateCards);
router.get('/', authMiddleware_1.protect, flashcardController_1.getCards);
router.put('/:cardId/review', authMiddleware_1.protect, flashcardController_1.reviewCard);
router.delete('/:cardId', authMiddleware_1.protect, flashcardController_1.removeCard);
exports.default = router;
