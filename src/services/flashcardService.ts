import prisma from '../config/prismaClient';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { retrieveContext } from './geminiRagService';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface FlashcardData {
    front: string;
    back: string;
    topic: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Generate flashcards for a specific course/topic using Gemini
 */
export const generateFlashcards = async (
    userId: string,
    courseId: string,
    courseName: string,
    topic: string,
    count: number = 5
): Promise<any[]> => {
    try {
        // Retrieve context from RAG
        const context = retrieveContext(topic);
        
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

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Clean and parse JSON
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('Failed to parse JSON from AI response');
            return [];
        }
        
        const cardsData: FlashcardData[] = JSON.parse(jsonMatch[0]);

        // Save to DB
        const createdCards = await Promise.all(
            cardsData.map(card => 
                prisma.flashcard.create({
                    data: {
                        userId,
                        courseId,
                        courseName,
                        front: card.front,
                        back: card.back,
                        topic: card.topic || topic,
                        difficulty: card.difficulty || 'intermediate'
                    }
                })
            )
        );

        return createdCards;
    } catch (error) {
        console.error('Error generating flashcards:', error);
        return [];
    }
};

/**
 * Get flashcards for a user by course
 */
export const getUserFlashcards = async (userId: string, courseId?: string) => {
    const where: any = { userId, isActive: true };
    if (courseId) where.courseId = courseId;
    
    return await prisma.flashcard.findMany({
        where,
        orderBy: { createdAt: 'desc' }
    });
};

/**
 * Mark a flashcard as reviewed
 */
export const markFlashcardReviewed = async (cardId: string) => {
    return await prisma.flashcard.update({
        where: { id: cardId },
        data: { lastReviewed: new Date() }
    });
};

/**
 * Delete a flashcard (soft delete)
 */
export const deleteFlashcard = async (cardId: string) => {
    return await prisma.flashcard.update({
        where: { id: cardId },
        data: { isActive: false }
    });
};
