"use strict";
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
exports.deleteFlashcard = exports.markFlashcardReviewed = exports.getUserFlashcards = exports.generateFlashcards = void 0;
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
const generative_ai_1 = require("@google/generative-ai");
const geminiRagService_1 = require("./geminiRagService");
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
/**
 * Generate flashcards for a specific course/topic using Gemini
 */
const generateFlashcards = (userId_1, courseId_1, courseName_1, topic_1, ...args_1) => __awaiter(void 0, [userId_1, courseId_1, courseName_1, topic_1, ...args_1], void 0, function* (userId, courseId, courseName, topic, count = 5) {
    try {
        // Retrieve context from RAG
        const context = (0, geminiRagService_1.retrieveContext)(topic);
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
        });
        const prompt = `
            You are an expert AI tutor. Generate ${count} high-quality flashcards for the topic: "${topic}".
            Course: ${courseName}
            
            ${context.chunks.length > 0 ? `Reference Materials:\n${context.chunks.join('\n\n')}` : ''}
            
            Return the flashcards as a JSON array of objects. Each object must have:
            - front: A clear, concise question or concept.
            - back: A brief, accurate answer or explanation.
            - topic: The specific sub-topic.
            - difficulty: One of "beginner", "intermediate", "advanced".
            
            Format: JSON only.
        `;
        const result = yield model.generateContent(prompt);
        const responseText = result.response.text();
        // Clean and parse JSON
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('Failed to parse JSON from AI response');
            return [];
        }
        const cardsData = JSON.parse(jsonMatch[0]);
        // Save to DB
        const createdCards = yield Promise.all(cardsData.map(card => prismaClient_1.default.flashcard.create({
            data: {
                userId,
                courseId,
                courseName,
                front: card.front,
                back: card.back,
                topic: card.topic || topic,
                difficulty: card.difficulty || 'intermediate'
            }
        })));
        return createdCards;
    }
    catch (error) {
        console.error('Error generating flashcards:', error);
        return [];
    }
});
exports.generateFlashcards = generateFlashcards;
/**
 * Get flashcards for a user by course
 */
const getUserFlashcards = (userId, courseId) => __awaiter(void 0, void 0, void 0, function* () {
    const where = { userId, isActive: true };
    if (courseId)
        where.courseId = courseId;
    return yield prismaClient_1.default.flashcard.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    });
});
exports.getUserFlashcards = getUserFlashcards;
/**
 * Mark a flashcard as reviewed
 */
const markFlashcardReviewed = (cardId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prismaClient_1.default.flashcard.update({
        where: { id: cardId },
        data: { lastReviewed: new Date() }
    });
});
exports.markFlashcardReviewed = markFlashcardReviewed;
/**
 * Delete a flashcard (soft delete)
 */
const deleteFlashcard = (cardId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prismaClient_1.default.flashcard.update({
        where: { id: cardId },
        data: { isActive: false }
    });
});
exports.deleteFlashcard = deleteFlashcard;
