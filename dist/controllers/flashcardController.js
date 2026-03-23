"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeCard = exports.reviewCard = exports.getCards = exports.generateCards = void 0;
const flashcardService = __importStar(require("../services/flashcardService"));
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
const generateCards = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { courseId, courseName, topic, count } = req.body;
        const userId = req.user.id;
        if (!courseId || !topic) {
            res.status(400).json({ message: 'courseId and topic are required' });
            return;
        }
        const cards = yield flashcardService.generateFlashcards(userId, courseId, courseName || 'General', topic, count || 5);
        // Log activity
        yield prismaClient_1.default.activityLog.create({
            data: {
                userId,
                activityType: 'flashcard_generation',
                courseId,
                courseName: courseName || 'General',
                description: `Generated ${cards.length} flashcards for ${topic}`,
                metadata: { topic, count: cards.length }
            }
        });
        res.status(201).json({
            success: true,
            count: cards.length,
            flashcards: cards
        });
    }
    catch (error) {
        console.error('Error in generateCards controller:', error);
        res.status(500).json({ message: 'Error generating flashcards' });
    }
});
exports.generateCards = generateCards;
const getCards = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { courseId } = req.query;
        const cards = yield flashcardService.getUserFlashcards(userId, courseId);
        res.status(200).json({
            success: true,
            flashcards: cards
        });
    }
    catch (error) {
        console.error('Error in getCards controller:', error);
        res.status(500).json({ message: 'Error fetching flashcards' });
    }
});
exports.getCards = getCards;
const reviewCard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { cardId } = req.params;
        const updated = yield flashcardService.markFlashcardReviewed(cardId);
        res.status(200).json({
            success: true,
            flashcard: updated
        });
    }
    catch (error) {
        console.error('Error in reviewCard controller:', error);
        res.status(500).json({ message: 'Error updating flashcard' });
    }
});
exports.reviewCard = reviewCard;
const removeCard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { cardId } = req.params;
        yield flashcardService.deleteFlashcard(cardId);
        res.status(200).json({
            success: true,
            message: 'Flashcard deleted'
        });
    }
    catch (error) {
        console.error('Error in removeCard controller:', error);
        res.status(500).json({ message: 'Error deleting flashcard' });
    }
});
exports.removeCard = removeCard;
