import { Request, Response } from 'express';
import { generateTutorResponse, generateExplanation, initializeRAG } from '../services/geminiRagService';
import { validateTranscribedText, evaluateTranscriptionQuality, createAudioSessionLog } from '../services/audioService';
import prisma from '../config/prismaClient';

// Initialize RAG on server start
export const initializeAI = async () => {
    await initializeRAG();
};

// @desc    Ask AI tutor a question during study session
// @route   POST /api/tutor/study
// @access  Private
export const askStudyQuestion = async (req: any, res: Response) => {
    try {
        const { question, courseId, courseName, sessionId } = req.body;

        if (!question || !courseId) {
            res.status(400).json({ message: 'Question and courseId are required' });
            return;
        }

        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Determine communication mode
        const communicationMode = user.audioOrText === 'audio' ? 'casual' : 'formal';

        // Generate AI response using RAG
        const tutorResponse = await generateTutorResponse(
            question,
            user.firstname,
            communicationMode as 'formal' | 'casual' | 'friendly',
            courseName,
            undefined
        );

        // Log the activity
        await prisma.activityLog.create({
            data: {
                userId: userId,
                activityType: 'ai_question',
                activityDate: new Date(),
                courseId: courseId,
                courseName: courseName || 'General',
                description: `Asked: ${question.substring(0, 100)}...`,
                metadata: {
                    question: question,
                    sessionId: sessionId
                }
            }
        });

        // If session ID provided, update session
        if (sessionId) {
            await prisma.studySession.update({
                where: { id: sessionId },
                data: { status: 'active' }
            });
        }

        res.status(200).json({
            success: true,
            question: question,
            answer: tutorResponse.answer,
            sources: tutorResponse.sources,
            relatedTopics: tutorResponse.relatedTopics,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error in study question:', error);
        res.status(500).json({ message: 'Error processing question' });
    }
};

// @desc    Get explanation for difficult concept
// @route   POST /api/tutor/explain
// @access  Private
export const requestExplanation = async (req: any, res: Response) => {
    try {
        const { concept, difficultyLevel, courseId, courseName } = req.body;

        if (!concept) {
            res.status(400).json({ message: 'Concept is required' });
            return;
        }

        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const communicationMode = user.audioOrText === 'audio' ? 'casual' : 'formal';

        // Generate explanation
        const explanation = await generateExplanation(
            concept,
            user.firstname,
            (difficultyLevel as 'beginner' | 'intermediate' | 'advanced') || 'intermediate',
            communicationMode as 'formal' | 'casual' | 'friendly'
        );

        // Log activity
        await prisma.activityLog.create({
            data: {
                userId: userId,
                activityType: 'ai_explanation',
                activityDate: new Date(),
                courseId: courseId || 'general',
                courseName: courseName || 'General',
                description: `Requested explanation for: ${concept}`,
                metadata: {
                    concept: concept,
                    difficultyLevel: difficultyLevel || 'intermediate'
                }
            }
        });

        res.status(200).json({
            success: true,
            concept: concept,
            explanation: explanation.answer,
            sources: explanation.sources,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error in explanation request:', error);
        res.status(500).json({ message: 'Error generating explanation' });
    }
};

// @desc    Process audio question from student
// @route   POST /api/tutor/audio-question
// @access  Private
export const askAudioQuestion = async (req: any, res: Response) => {
    try {
        const { transcribedText, audioConfidence, durationSeconds, courseId, courseName, sessionId } = req.body;

        if (!transcribedText) {
            res.status(400).json({ message: 'Transcribed text is required' });
            return;
        }

        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Validate transcribed text
        const validation = validateTranscribedText(transcribedText);

        if (!validation.isValid) {
            res.status(400).json({
                success: false,
                message: validation.message
            });
            return;
        }

        // Evaluate transcription quality
        const qualityEval = evaluateTranscriptionQuality(transcribedText, audioConfidence || 0.8);

        const cleanedText = validation.cleanedText || transcribedText;

        // Generate AI response
        const tutorResponse = await generateTutorResponse(
            cleanedText,
            user.firstname,
            'casual',
            courseName || 'General',
            undefined
        );

        // Log audio session
        const audioLog = createAudioSessionLog(
            userId,
            'question',
            durationSeconds || 0,
            transcribedText,
            audioConfidence || 0.8
        );

        // Log activity
        await prisma.activityLog.create({
            data: {
                userId: userId,
                activityType: 'ai_question',
                activityDate: new Date(),
                courseId: courseId || 'general',
                courseName: courseName || 'General',
                duration: durationSeconds,
                description: `Audio question: ${cleanedText.substring(0, 100)}...`,
                metadata: {
                    audioQuestion: cleanedText,
                    transcriptionConfidence: audioConfidence,
                    sessionId: sessionId,
                    ...audioLog
                }
            }
        });

        res.status(200).json({
            success: true,
            originalAudio: transcribedText,
            cleanedText: cleanedText,
            transcriptionQuality: qualityEval,
            answer: tutorResponse.answer,
            sources: tutorResponse.sources,
            relatedTopics: tutorResponse.relatedTopics,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Error processing audio question:', error);
        res.status(500).json({ message: 'Error processing audio question' });
    }
};

// @desc    Start a study session
// @route   POST /api/tutor/study-session/start
// @access  Private
export const startStudySession = async (req: any, res: Response) => {
    try {
        const { courseId, courseName, topicsCovered, sessionType } = req.body;

        if (!courseId || !courseName) {
            res.status(400).json({ message: 'courseId and courseName are required' });
            return;
        }

        const userId = req.user.id;

        const session = await prisma.studySession.create({
            data: {
                userId: userId,
                courseId: courseId,
                courseName: courseName,
                startTime: new Date(),
                topicsCovered: topicsCovered || [],
                status: 'active',
                sessionType: sessionType || 'concept_study',
                durationMinutes: 0
            }
        });

        res.status(201).json({
            success: true,
            sessionId: session.id,
            message: 'Study session started',
            session: {
                _id: session.id,
                courseId: session.courseId,
                courseName: session.courseName,
                startTime: session.startTime,
                status: session.status
            }
        });
    } catch (error) {
        console.error('Error starting study session:', error);
        res.status(500).json({ message: 'Error starting study session' });
    }
};

// @desc    End a study session
// @route   POST /api/tutor/study-session/end
// @access  Private
export const endStudySession = async (req: any, res: Response) => {
    try {
        const { sessionId, notes } = req.body;

        if (!sessionId) {
            res.status(400).json({ message: 'sessionId is required' });
            return;
        }

        const userId = req.user.id;

        const session = await prisma.studySession.findFirst({
            where: {
                id: sessionId,
                userId: userId
            }
        });

        if (!session) {
            res.status(404).json({ message: 'Study session not found' });
            return;
        }

        const endTime = new Date();
        const durationMinutes = Math.round(
            (endTime.getTime() - session.startTime.getTime()) / (1000 * 60)
        );

        const updatedSession = await prisma.studySession.update({
            where: { id: sessionId },
            data: {
                endTime: endTime,
                status: 'completed',
                durationMinutes: durationMinutes,
                notes: notes || session.notes
            }
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                userId: userId,
                activityType: 'study_session',
                activityDate: new Date(),
                courseId: updatedSession.courseId,
                courseName: updatedSession.courseName,
                duration: updatedSession.durationMinutes,
                description: `Completed study session on ${updatedSession.courseName}`,
                metadata: {
                    sessionId: sessionId,
                    sessionType: updatedSession.sessionType
                }
            }
        });

        res.status(200).json({
            success: true,
            message: 'Study session ended',
            session: {
                _id: updatedSession.id,
                durationMinutes: updatedSession.durationMinutes,
                endTime: updatedSession.endTime,
                status: updatedSession.status
            }
        });
    } catch (error) {
        console.error('Error ending study session:', error);
        res.status(500).json({ message: 'Error ending study session' });
    }
};

// @desc    Get session history
// @route   GET /api/tutor/sessions
// @access  Private
export const getSessionHistory = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit as string) || 10;
        const courseId = req.query.courseId as string;

        let where: any = { userId: userId };
        if (courseId) {
            where.courseId = courseId;
        }

        const sessions = await prisma.studySession.findMany({
            where: where,
            orderBy: { startTime: 'desc' },
            take: limit
        });

        res.status(200).json({
            success: true,
            totalSessions: sessions.length,
            sessions: sessions
        });
    } catch (error) {
        console.error('Error fetching session history:', error);
        res.status(500).json({ message: 'Error fetching sessions' });
    }
};
