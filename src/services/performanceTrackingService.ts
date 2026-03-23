import prisma from '../config/prismaClient';

/**
 * Calculate performance scores using the algorithm:
 * Overall Score = (40% Accuracy) + (30% Consistency) + (20% Growth) + (10% Time Management)
 */
export const calculatePerformanceMetrics = async (userId: string, courseId: string) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get all practice sessions for this course
        const practiceSessions = await prisma.practiceSession.findMany({
            where: {
                userId: userId,
                courseId: courseId
            }
        });

        if (practiceSessions.length === 0) {
            return null; // No data yet
        }

        // Calculate Accuracy Score (40%)
        const totalQuestions = practiceSessions.reduce((sum: number, p: any) => sum + p.questionsAttempted, 0);
        const totalCorrect = practiceSessions.reduce((sum: number, p: any) => sum + p.correctAnswers, 0);
        const accuracyPercentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
        const accuracyScore = (accuracyPercentage / 100) * 40;

        // Calculate Consistency Score (30%)
        const studySessions = await prisma.studySession.findMany({
            where: {
                userId: userId,
                courseId: courseId,
                status: 'completed'
            }
        });

        // Calculate study streak (consecutive days with at least 1 study session)
        const currentStreak = await calculateStudyStreak(userId);
        const maxStreak = await getMaxStudyStreak(userId);
        const consistencyScore = Math.min((currentStreak / 30) * 30, 30); // Max 30 points for 30-day streak

        // Calculate Growth Score (20%)
        const previousMetrics = await prisma.performanceMetric.findMany({
            where: {
                userId: userId,
                courseId: courseId
            },
            orderBy: { dateRecorded: 'desc' },
            take: 2
        });

        let growthScore = 0;
        if (previousMetrics.length > 0) {
            const previousAccuracy = previousMetrics[0].overallAccuracy || 0;
            const accuracyImprovement = accuracyPercentage - previousAccuracy;
            growthScore = Math.max(Math.min((accuracyImprovement / 100) * 20, 20), -20); // Between -20 and 20
        } else {
            growthScore = accuracyPercentage > 70 ? 20 : 10; // Boost new learners
        }

        // Calculate Time Management Score (10%)
        const totalStudyMinutes = studySessions.reduce((sum: number, s: any) => sum + s.durationMinutes, 0);
        const averageSessionDuration = studySessions.length > 0 
            ? totalStudyMinutes / studySessions.length 
            : 0;
        const timeManagementScore = Math.min((totalStudyMinutes / 10000) * 10, 10); // 10 points for 10,000 mins

        // Total Performance Score
        const performanceScore = Math.min(
            accuracyScore + consistencyScore + growthScore + timeManagementScore,
            100
        );

        // Identify strong and weak topics
        const strongTopics = getStrongTopics(practiceSessions);
        const weakTopics = getWeakTopics(practiceSessions);

        return {
            overallAccuracy: accuracyPercentage,
            performanceScore: parseFloat(performanceScore.toFixed(2)),
            consistencyScore: parseFloat(consistencyScore.toFixed(2)),
            growthScore: parseFloat(growthScore.toFixed(2)),
            totalStudyMinutes: totalStudyMinutes,
            studySessions: studySessions.length,
            totalQuestionsAttempted: totalQuestions,
            correctAnswers: totalCorrect,
            incorrectAnswers: totalQuestions - totalCorrect,
            currentStudyStreak: currentStreak,
            maxStudyStreak: maxStreak,
            strongTopics: strongTopics,
            weakTopics: weakTopics,
            averageSessionDuration: parseFloat(averageSessionDuration.toFixed(2))
        };
    } catch (error) {
        console.error('Error calculating performance metrics:', error);
        return null;
    }
};

/**
 * Calculate leaderboard points based on performance
 */
export const calculateLeaderboardPoints = (performanceMetrics: any): number => {
    try {
        const basePoints = performanceMetrics.performanceScore * 10; // 0-1000 points
        const bonusPoints = Math.min(performanceMetrics.currentStudyStreak * 5, 100); // Streak bonus
        const accuracyBonus = performanceMetrics.overallAccuracy > 85 ? 50 : 0; // High accuracy bonus

        return Math.round(basePoints + bonusPoints + accuracyBonus);
    } catch (error) {
        console.error('Error calculating leaderboard points:', error);
        return 0;
    }
};

/**
 * Calculate current study streak
 */
export const calculateStudyStreak = async (userId: string): Promise<number> => {
    try {
        const activities = await prisma.activityLog.findMany({
            where: {
                userId: userId,
                activityType: 'study_session'
            },
            orderBy: { activityDate: 'desc' }
        });

        if (activities.length === 0) return 0;

        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (const activity of activities) {
            const activityDate = new Date(activity.activityDate);
            activityDate.setHours(0, 0, 0, 0);

            const dayDifference = Math.floor((currentDate.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));

            if (dayDifference === streak) {
                streak++;
                currentDate = new Date(activityDate);
            } else if (dayDifference > streak) {
                break;
            }
        }

        return streak;
    } catch (error) {
        console.error('Error calculating study streak:', error);
        return 0;
    }
};

/**
 * Get maximum study streak ever achieved
 */
export const getMaxStudyStreak = async (userId: string): Promise<number> => {
    try {
        const activities = await prisma.activityLog.findMany({
            where: {
                userId: userId,
                activityType: 'study_session'
            },
            orderBy: { activityDate: 'desc' }
        });

        if (activities.length === 0) return 0;

        let maxStreak = 1;
        let currentStreak = 1;
        let previousDate: Date | null = null;

        for (let i = 0; i < activities.length; i++) {
            if (previousDate === null) {
                previousDate = new Date(activities[i].activityDate);
                continue;
            }

            const currentDate = new Date(activities[i].activityDate);
            const dayDifference = Math.floor((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

            if (dayDifference === 1) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else if (dayDifference > 1) {
                currentStreak = 1;
            }

            previousDate = currentDate;
        }

        return maxStreak;
    } catch (error) {
        console.error('Error getting max study streak:', error);
        return 0;
    }
};

/**
 * Identify student's strong topics
 */
const getStrongTopics = (practiceSessions: any[]): string[] => {
    const topicAccuracy: Record<string, { correct: number; total: number }> = {};

    practiceSessions.forEach(session => {
        const questionDetails = (session.questionDetails as any[]) || [];
        questionDetails.forEach((q: any) => {
            if (!topicAccuracy[q.topic]) {
                topicAccuracy[q.topic] = { correct: 0, total: 0 };
            }
            topicAccuracy[q.topic].total++;
            if (q.isCorrect) {
                topicAccuracy[q.topic].correct++;
            }
        });
    });

    return Object.entries(topicAccuracy)
        .map(([topic, data]) => ({
            topic,
            accuracy: (data.correct / data.total) * 100
        }))
        .filter(item => item.accuracy >= 75)
        .sort((a, b) => b.accuracy - a.accuracy)
        .slice(0, 5)
        .map(item => item.topic);
};

/**
 * Identify student's weak topics
 */
const getWeakTopics = (practiceSessions: any[]): string[] => {
    const topicAccuracy: Record<string, { correct: number; total: number }> = {};

    practiceSessions.forEach(session => {
        const questionDetails = (session.questionDetails as any[]) || [];
        questionDetails.forEach((q: any) => {
            if (!topicAccuracy[q.topic]) {
                topicAccuracy[q.topic] = { correct: 0, total: 0 };
            }
            topicAccuracy[q.topic].total++;
            if (q.isCorrect) {
                topicAccuracy[q.topic].correct++;
            }
        });
    });

    return Object.entries(topicAccuracy)
        .map(([topic, data]) => ({
            topic,
            accuracy: (data.correct / data.total) * 100
        }))
        .filter(item => item.accuracy < 60)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 5)
        .map(item => item.topic);
};

/**
 * Save/update performance metric
 */
export const savePerformanceMetric = async (
    userId: string,
    courseId: string,
    courseName: string,
    metrics: any
): Promise<boolean> => {
    try {
        const leaderboardPoints = calculateLeaderboardPoints(metrics);

        await prisma.performanceMetric.create({
            data: {
                userId: userId,
                dateRecorded: new Date(),
                courseId: courseId,
                courseName: courseName,
                ...metrics,
                leaderboardPoints: leaderboardPoints
            }
        });

        return true;
    } catch (error) {
        console.error('Error saving performance metric:', error);
        return false;
    }
};

/**
 * Get student's overall leaderboard rank
 */
export const getLeaderboardRank = async (userId: string): Promise<number> => {
    try {
        const studentMetric = await prisma.performanceMetric.findFirst({
            where: { userId: userId },
            orderBy: { dateRecorded: 'desc' }
        });

        if (!studentMetric) return 0;

        const rank = await prisma.performanceMetric.count({
            where: {
                leaderboardPoints: { gt: studentMetric.leaderboardPoints }
            }
        });

        return rank + 1;
    } catch (error) {
        console.error('Error getting leaderboard rank:', error);
        return 0;
    }
};
