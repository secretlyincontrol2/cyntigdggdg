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
exports.getRecommendations = exports.getCoursePerformance = exports.getPerformanceTrends = exports.getUserPerformance = exports.trackPracticeResult = void 0;
const performanceTrackingService_1 = require("../services/performanceTrackingService");
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
// @desc    Track practice session results
// @route   POST /api/performance/practice-result
// @access  Private
const trackPracticeResult = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { courseId, courseName, questionsAttempted, correctAnswers, sessionDetails } = req.body;
        if (!courseId || !courseName || questionsAttempted === undefined) {
            res.status(400).json({ message: 'courseId, courseName, and questionsAttempted are required' });
            return;
        }
        const userId = req.user.id;
        const incorrectAnswers = questionsAttempted - correctAnswers;
        const accuracyPercentage = questionsAttempted > 0 ? (correctAnswers / questionsAttempted) * 100 : 0;
        // Extract weak and strong areas from session details
        const questionDetails = sessionDetails || [];
        const weakAreas = [];
        const strongAreas = [];
        const topicAccuracy = {};
        questionDetails.forEach((detail) => {
            if (!topicAccuracy[detail.topic]) {
                topicAccuracy[detail.topic] = { correct: 0, total: 0 };
            }
            topicAccuracy[detail.topic].total++;
            if (detail.isCorrect) {
                topicAccuracy[detail.topic].correct++;
            }
        });
        Object.entries(topicAccuracy).forEach(([topic, data]) => {
            const accuracy = (data.correct / data.total) * 100;
            if (accuracy < 60) {
                weakAreas.push(topic);
            }
            else if (accuracy >= 80) {
                strongAreas.push(topic);
            }
        });
        // Create practice session record
        const practiceSession = yield prismaClient_1.default.practiceSession.create({
            data: {
                userId: userId,
                courseId: courseId,
                courseName: courseName,
                questionsAttempted: questionsAttempted,
                correctAnswers: correctAnswers,
                incorrectAnswers: incorrectAnswers,
                accuracyPercentage: accuracyPercentage,
                questionDetails: questionDetails,
                sessioStatus: 'completed',
                sessionDurationMinutes: Math.round(questionsAttempted * 2), // Estimate: ~2 mins per question
                weakAreas: weakAreas,
                strongAreas: strongAreas
            }
        });
        // Calculate performance metrics
        const metrics = yield (0, performanceTrackingService_1.calculatePerformanceMetrics)(userId, courseId);
        if (metrics) {
            yield (0, performanceTrackingService_1.savePerformanceMetric)(userId, courseId, courseName, metrics);
        }
        // Log activity
        yield prismaClient_1.default.activityLog.create({
            data: {
                userId: userId,
                activityType: 'practice',
                activityDate: new Date(),
                courseId: courseId,
                courseName: courseName,
                questionsAttempted: questionsAttempted,
                score: accuracyPercentage,
                description: `Completed practice: ${questionsAttempted} questions, ${correctAnswers} correct`,
                metadata: {
                    practiceSessionId: practiceSession.id,
                    weak_areas: weakAreas,
                    strong_areas: strongAreas
                }
            }
        });
        res.status(201).json({
            success: true,
            practiceSessionId: practiceSession.id,
            results: {
                questionsAttempted: questionsAttempted,
                correctAnswers: correctAnswers,
                incorrectAnswers: incorrectAnswers,
                accuracy: parseFloat(accuracyPercentage.toFixed(2)),
                weakAreas: weakAreas,
                strongAreas: strongAreas
            },
            message: `Great work! You got ${correctAnswers}/${questionsAttempted} correct (${Math.round(accuracyPercentage)}%)`
        });
    }
    catch (error) {
        console.error('Error tracking practice result:', error);
        res.status(500).json({ message: 'Error tracking practice result' });
    }
});
exports.trackPracticeResult = trackPracticeResult;
// @desc    Get user performance metrics
// @route   GET /api/performance/me
// @access  Private
const getUserPerformance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const courseId = req.query.courseId;
        let where = { userId: userId };
        if (courseId) {
            where.courseId = courseId;
        }
        const performance = yield prismaClient_1.default.performanceMetric.findFirst({
            where: where,
            orderBy: { dateRecorded: 'desc' }
        });
        if (!performance) {
            res.status(200).json({
                success: false,
                message: 'No performance data found. Start studying to build your profile!',
                performance: null
            });
            return;
        }
        // Get leaderboard rank
        const rank = yield (0, performanceTrackingService_1.getLeaderboardRank)(userId);
        res.status(200).json({
            success: true,
            performance: {
                overallAccuracy: parseFloat(performance.overallAccuracy.toFixed(2)),
                performanceScore: parseFloat(performance.performanceScore.toFixed(2)),
                consistencyScore: parseFloat(performance.consistencyScore.toFixed(2)),
                growthScore: parseFloat(performance.growthScore.toFixed(2)),
                leaderboardPoints: performance.leaderboardPoints,
                totalStudyMinutes: performance.totalStudyMinutes,
                studySessions: performance.studySessions,
                totalQuestionsAttempted: performance.totalQuestionsAttempted,
                correctAnswers: performance.correctAnswers,
                incorrectAnswers: performance.incorrectAnswers,
                strongTopics: performance.strongTopics,
                weakTopics: performance.weakTopics,
                currentStreak: performance.currentStudyStreak,
                maxStreak: performance.maxStudyStreak,
                classRank: rank,
                percentileRank: performance.percentileRank,
                lastUpdated: performance.dateRecorded
            }
        });
    }
    catch (error) {
        console.error('Error fetching user performance:', error);
        res.status(500).json({ message: 'Error fetching performance metrics' });
    }
});
exports.getUserPerformance = getUserPerformance;
// @desc    Get performance trends (last 30 days)
// @route   GET /api/performance/trends
// @access  Private
const getPerformanceTrends = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const metrics = yield prismaClient_1.default.performanceMetric.findMany({
            where: {
                userId: userId,
                dateRecorded: { gte: startDate }
            },
            orderBy: { dateRecorded: 'asc' }
        });
        if (metrics.length === 0) {
            res.status(200).json({
                success: false,
                message: 'No performance trends available yet'
            });
            return;
        }
        const trends = metrics.map((m) => ({
            date: m.dateRecorded,
            accuracy: m.overallAccuracy,
            performanceScore: m.performanceScore,
            questionsAttempted: m.totalQuestionsAttempted,
            leaderboardPoints: m.leaderboardPoints
        }));
        res.status(200).json({
            success: true,
            trendDays: days,
            totalDataPoints: trends.length,
            trends: trends
        });
    }
    catch (error) {
        console.error('Error fetching performance trends:', error);
        res.status(500).json({ message: 'Error fetching performance trends' });
    }
});
exports.getPerformanceTrends = getPerformanceTrends;
// @desc    Get course-specific performance
// @route   GET /api/performance/course/:courseId
// @access  Private
const getCoursePerformance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const courseId = req.params.courseId;
        const performance = yield prismaClient_1.default.performanceMetric.findFirst({
            where: {
                userId: userId,
                courseId: courseId
            },
            orderBy: { dateRecorded: 'desc' }
        });
        if (!performance) {
            res.status(200).json({
                success: false,
                message: `No performance data for course ${courseId}`
            });
            return;
        }
        // Get all practice sessions for this course
        const practiceSessions = yield prismaClient_1.default.practiceSession.findMany({
            where: {
                userId: userId,
                courseId: courseId
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        res.status(200).json({
            success: true,
            coursePerformance: {
                courseId: courseId,
                courseName: performance.courseName,
                overallAccuracy: parseFloat(performance.overallAccuracy.toFixed(2)),
                totalQuestionsAttempted: performance.totalQuestionsAttempted,
                correctAnswers: performance.correctAnswers,
                totalStudyMinutes: performance.totalStudyMinutes,
                strongTopics: performance.strongTopics,
                weakTopics: performance.weakTopics
            },
            recentPracticeSessions: practiceSessions.map((ps) => ({
                date: ps.createdAt,
                questionsAttempted: ps.questionsAttempted,
                accuracy: parseFloat(ps.accuracyPercentage.toFixed(2)),
                weakAreas: ps.weakAreas
            }))
        });
    }
    catch (error) {
        console.error('Error fetching course performance:', error);
        res.status(500).json({ message: 'Error fetching course performance' });
    }
});
exports.getCoursePerformance = getCoursePerformance;
// @desc    Get weak areas recommendations
// @route   GET /api/performance/recommendations
// @access  Private
const getRecommendations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const performance = yield prismaClient_1.default.performanceMetric.findFirst({
            where: { userId: userId },
            orderBy: { dateRecorded: 'desc' }
        });
        if (!performance) {
            res.status(200).json({
                success: false,
                recommendations: []
            });
            return;
        }
        const recommendations = {};
        if (performance.weakTopics && performance.weakTopics.length > 0) {
            recommendations.focus = `Focus on ${performance.weakTopics[0]} - This is your weakest area. Try practicing 10+ problems daily.`;
        }
        if (performance.overallAccuracy < 60) {
            recommendations.pace = 'Slow down and focus on understanding concepts before rushing into practice.';
        }
        if (performance.currentStudyStreak < 3) {
            recommendations.consistency = 'Build a consistent study habit. Study at least 3 days a week!';
        }
        else if (performance.currentStudyStreak >= 7) {
            recommendations.streak = `Amazing! You're on a ${performance.currentStudyStreak}-day streak. Keep it up! 🔥`;
        }
        if (performance.totalStudyMinutes < 300) {
            recommendations.volume = 'Increase your study duration. Aim for at least 30 minutes daily.';
        }
        res.status(200).json({
            success: true,
            recommendations: recommendations
        });
    }
    catch (error) {
        console.error('Error generating recommendations:', error);
        res.status(500).json({ message: 'Error generating recommendations' });
    }
});
exports.getRecommendations = getRecommendations;
