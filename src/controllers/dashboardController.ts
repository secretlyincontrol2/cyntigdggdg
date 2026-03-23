import { Request, Response } from 'express';
import prisma from '../config/prismaClient';

// @desc    Get user dashboard data
// @route   GET /api/dashboard
// @access  Private
export const getDashboard = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;

        // Get user data
        const user = await prisma.user.findUnique({
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
        const todayActivity = await prisma.activityLog.findMany({
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
        const recentActivity = await prisma.activityLog.findMany({
            where: {
                userId: userId,
                activityDate: { gte: sevenDaysAgo }
            },
            orderBy: { activityDate: 'desc' },
            take: 20
        });

        // Get today's goals
        const todayGoals = await prisma.studentGoal.findMany({
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
        const latestPerformance = await prisma.performanceMetric.findFirst({
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
                overallAccuracy: latestPerformance?.overallAccuracy || 0,
                performanceScore: latestPerformance?.performanceScore || 0,
                leaderboardPoints: latestPerformance?.leaderboardPoints || 0,
                currentStreak: latestPerformance?.currentStudyStreak || 0,
                classRank: latestPerformance?.classRank || 'N/A'
            },
            todayGoals: todayGoals.map((goal: any) => ({
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
            recentActivities: recentActivity.map((activity: any) => ({
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
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Server error while fetching dashboard' });
    }
};

// @desc    Get activity history
// @route   GET /api/dashboard/activities
// @access  Private
export const getActivityHistory = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const days = req.query.days || 30;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days as string));

        const activities = await prisma.activityLog.findMany({
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
    } catch (error) {
        console.error('Activity history error:', error);
        res.status(500).json({ message: 'Server error while fetching activity history' });
    }
};

// @desc    Get performance overview
// @route   GET /api/dashboard/performance
// @access  Private
export const getPerformanceOverview = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;

        const performance = await prisma.performanceMetric.findFirst({
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
    } catch (error) {
        console.error('Performance overview error:', error);
        res.status(500).json({ message: 'Server error while fetching performance' });
    }
};
