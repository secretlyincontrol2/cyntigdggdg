import { Request, Response } from 'express';
import * as flashcardService from '../services/flashcardService';
import prisma from '../config/prismaClient';

export const generateCards = async (req: any, res: Response) => {
    try {
        const { courseId, courseName, topic, count } = req.body;
        const userId = req.user.id;

        if (!courseId || !topic) {
            res.status(400).json({ message: 'courseId and topic are required' });
            return;
        }

        const cards = await flashcardService.generateFlashcards(
            userId,
            courseId,
            courseName || 'General',
            topic,
            count || 5
        );

        // Log activity
        await prisma.activityLog.create({
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
    } catch (error) {
        console.error('Error in generateCards controller:', error);
        res.status(500).json({ message: 'Error generating flashcards' });
    }
};

export const getCards = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const { courseId } = req.query;

        const cards = await flashcardService.getUserFlashcards(userId, courseId as string);

        res.status(200).json({
            success: true,
            flashcards: cards
        });
    } catch (error) {
        console.error('Error in getCards controller:', error);
        res.status(500).json({ message: 'Error fetching flashcards' });
    }
};

export const reviewCard = async (req: any, res: Response) => {
    try {
        const { cardId } = req.params;
        const updated = await flashcardService.markFlashcardReviewed(cardId);

        res.status(200).json({
            success: true,
            flashcard: updated
        });
    } catch (error) {
        console.error('Error in reviewCard controller:', error);
        res.status(500).json({ message: 'Error updating flashcard' });
    }
};

export const removeCard = async (req: any, res: Response) => {
    try {
        const { cardId } = req.params;
        await flashcardService.deleteFlashcard(cardId);

        res.status(200).json({
            success: true,
            message: 'Flashcard deleted'
        });
    } catch (error) {
        console.error('Error in removeCard controller:', error);
        res.status(500).json({ message: 'Error deleting flashcard' });
    }
};
