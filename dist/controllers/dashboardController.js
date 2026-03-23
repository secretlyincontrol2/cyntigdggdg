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
exports.getPerformanceOverview = exports.getActivityHistory = exports.getDashboard = void 0;
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
// @desc    Get user dashboard data
// @route   GET /api/dashboard
// @access  Private
const getDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // Get user data
        const user = yield prismaClient_1.default.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        // Get today's activity
        const todayActivity = yield prismaClient_1.default.activityLog.findMany({
            where: {
                userId: userId,
                activityDate: { gte: today, lt: tomorrow }
            },
            orderBy: { activityDate: 'desc' },
            take: 10
        });
        // Get recent activity (last 7 days)
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentActivity = yield prismaClient_1.default.activityLog.findMany({
            where: {
                userId: userId,
                activityDate: { gte: sevenDaysAgo }
            },
            orderBy: { activityDate: 'desc' },
            take: 20
        });
        // Get today's goals
        const todayGoals = yield prismaClient_1.default.studentGoal.findMany({
            where: {
                userId: userId,
                goalType: 'daily',
                dueDate: { gte: today, lt: tomorrow },
                status: { in: ['pending', 'in_progress'] }
            },
            orderBy: { priority: 'desc' }
        });
        // Aggregate today's stats
        const todayStats = {
            questionsAttempted: 0,
            correctAnswers: 0,
            accuracyScore: 0,
            studyMinutes: 0,
            goalsCompleted: 0
        };
        // Calculate stats from activity logs
        for (const activity of todayActivity) {
            if (activity.activityType === 'practice') {
                todayStats.questionsAttempted += activity.questionsAttempted || 0;
                if (activity.score) {
                    todayStats.correctAnswers += Math.round((activity.questionsAttempted || 0) * (activity.score / 100));
                    todayStats.accuracyScore = activity.score; // Taking the latest accuracy score for the day
                }
            }
            if (activity.activityType === 'study_session') {
                todayStats.studyMinutes += activity.duration || 0;
            }
            if (activity.activityType === 'goal_completed') {
                todayStats.goalsCompleted += 1;
            }
        }
        // Get latest performance metric (Prisma uses findFirst for sort results)
        const latestPerformance = yield prismaClient_1.default.performanceMetric.findFirst({
            where: { userId: userId },
            orderBy: { dateRecorded: 'desc' }
        });
        // Get active courses
        const activeCourses = user.courses || [];
        // Build dashboard response
        const dashboard = {
            welcomeMessage: `Welcome back, ${user.firstname}! 👋`,
            userInfo: {
                _id: user.id,
                name: `${user.firstname} ${user.lastname}`,
                email: user.schoolEmail,
                matricNumber: user.matricNumber,
                department: user.department,
                level: user.level
            },
            todayStats: {
                questionsAttempted: todayStats.questionsAttempted,
                correctAnswers: todayStats.correctAnswers,
                accuracyScore: todayStats.accuracyScore,
                studyMinutes: todayStats.studyMinutes,
                goalsCompleted: todayStats.goalsCompleted
            },
            performanceSnapshot: {
                overallAccuracy: (latestPerformance === null || latestPerformance === void 0 ? void 0 : latestPerformance.overallAccuracy) || 0,
                performanceScore: (latestPerformance === null || latestPerformance === void 0 ? void 0 : latestPerformance.performanceScore) || 0,
                leaderboardPoints: (latestPerformance === null || latestPerformance === void 0 ? void 0 : latestPerformance.leaderboardPoints) || 0,
                currentStreak: (latestPerformance === null || latestPerformance === void 0 ? void 0 : latestPerformance.currentStudyStreak) || 0,
                classRank: (latestPerformance === null || latestPerformance === void 0 ? void 0 : latestPerformance.classRank) || 'N/A'
            },
            todayGoals: todayGoals.map((goal) => ({
                _id: goal.id,
                goalTitle: goal.goalTitle,
                description: goal.goalDescription,
                targetValue: goal.targetValue,
                currentProgress: goal.currentProgress,
                unit: goal.unit,
                priority: goal.priority,
                status: goal.status,
                motivationalMessage: goal.motivationalMessage
            })),
            recentActivities: recentActivity.map((activity) => ({
                date: activity.activityDate,
                type: activity.activityType,
                course: activity.courseName,
                description: activity.description,
                duration: activity.duration,
                questionsAttempted: activity.questionsAttempted,
                score: activity.score
            })),
            activeCourses: activeCourses,
            personalizedSettings: {
                studyCapacity: user.studyHours,
                breakDuration: user.readDuration,
                preferredTime: user.dayOrNight,
                communicationMode: user.audioOrText,
                studyPreference: user.studyPreference
            }
        };
        res.status(200).json(dashboard);
    }
    catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Server error while fetching dashboard' });
    }
});
exports.getDashboard = getDashboard;
// @desc    Get activity history
// @route   GET /api/dashboard/activities
// @access  Private
const getActivityHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const days = req.query.days || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        const activities = yield prismaClient_1.default.activityLog.findMany({
            where: {
                userId: userId,
                activityDate: { gte: startDate }
            },
            orderBy: { activityDate: 'desc' }
        });
        res.status(200).json({
            totalActivities: activities.length,
            activities: activities
        });
    }
    catch (error) {
        console.error('Activity history error:', error);
        res.status(500).json({ message: 'Server error while fetching activity history' });
    }
});
exports.getActivityHistory = getActivityHistory;
// @desc    Get performance overview
// @route   GET /api/dashboard/performance
// @access  Private
const getPerformanceOverview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const performance = yield prismaClient_1.default.performanceMetric.findFirst({
            where: { userId: userId },
            orderBy: { dateRecorded: 'desc' }
        });
        if (!performance) {
            res.status(200).json({
                message: 'No performance data yet. Start studying to build your profile!',
                performance: null
            });
            return;
        }
        res.status(200).json({
            overallAccuracy: performance.overallAccuracy,
            performanceScore: performance.performanceScore,
            consistencyScore: performance.consistencyScore,
            growthScore: performance.growthScore,
            leaderboardPoints: performance.leaderboardPoints,
            strongTopics: performance.strongTopics,
            weakTopics: performance.weakTopics,
            classRank: performance.classRank,
            percentileRank: performance.percentileRank,
            currentStreak: performance.currentStudyStreak,
            maxStreak: performance.maxStudyStreak
        });
    }
    catch (error) {
        console.error('Performance overview error:', error);
        res.status(500).json({ message: 'Server error while fetching performance' });
    }
});
exports.getPerformanceOverview = getPerformanceOverview;
