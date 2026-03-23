import prisma from '../config/prismaClient';

interface LeaderboardEntry {
    rank: number;
    userId: string;
    studentName: string;
    department: string;
    level: number;
    leaderboardPoints: number;
    overallAccuracy: number;
    performanceScore: number;
    currentStreak: number;
    totalStudyHours: number;
}

/**
 * Get global leaderboard (all students across all courses)
 */
export const getGlobalLeaderboard = async (
    limit: number = 100,
    offset: number = 0
): Promise<LeaderboardEntry[]> => {
    try {
        const metrics = await prisma.performanceMetric.groupBy({
            by: ['userId'],
            _sum: {
                leaderboardPoints: true,
                totalStudyMinutes: true
            },
            _avg: {
                overallAccuracy: true,
                performanceScore: true
            },
            _max: {
                currentStudyStreak: true
            },
            orderBy: {
                _sum: {
                    leaderboardPoints: 'desc'
                }
            },
            skip: offset,
            take: limit
        });

        const leaderboard: LeaderboardEntry[] = [];
        let rank = offset + 1;

        for (const metric of metrics) {
            const user = await prisma.user.findUnique({
                where: { id: metric.userId }
            });
            if (user) {
                leaderboard.push({
                    rank: rank,
                    userId: metric.userId,
                    studentName: `${user.firstname} ${user.lastname}`,
                    department: user.department || 'N/A',
                    level: user.level || 0,
                    leaderboardPoints: Math.round(metric._sum.leaderboardPoints || 0),
                    overallAccuracy: Math.round(metric._avg.overallAccuracy || 0),
                    performanceScore: Math.round(metric._avg.performanceScore || 0),
                    currentStreak: metric._max.currentStudyStreak || 0,
                    totalStudyHours: Math.round((metric._sum.totalStudyMinutes || 0) / 60)
                });
                rank++;
            }
        }

        return leaderboard;
    } catch (error) {
        console.error('Error fetching global leaderboard:', error);
        return [];
    }
};

/**
 * Get leaderboard for specific course
 */
export const getCourseLeaderboard = async (
    courseId: string,
    limit: number = 50,
    offset: number = 0
): Promise<LeaderboardEntry[]> => {
    try {
        const metrics = await prisma.performanceMetric.groupBy({
            by: ['userId'],
            where: { courseId: courseId },
            _sum: {
                leaderboardPoints: true,
                totalStudyMinutes: true
            },
            _avg: {
                overallAccuracy: true,
                performanceScore: true
            },
            _max: {
                currentStudyStreak: true
            },
            orderBy: {
                _sum: {
                    leaderboardPoints: 'desc'
                }
            },
            skip: offset,
            take: limit
        });

        const leaderboard: LeaderboardEntry[] = [];
        let rank = offset + 1;

        for (const metric of metrics) {
            const user = await prisma.user.findUnique({
                where: { id: metric.userId }
            });
            if (user) {
                leaderboard.push({
                    rank: rank,
                    userId: metric.userId,
                    studentName: `${user.firstname} ${user.lastname}`,
                    department: user.department || 'N/A',
                    level: user.level || 0,
                    leaderboardPoints: Math.round(metric._sum.leaderboardPoints || 0),
                    overallAccuracy: Math.round(metric._avg.overallAccuracy || 0),
                    performanceScore: Math.round(metric._avg.performanceScore || 0),
                    currentStreak: metric._max.currentStudyStreak || 0,
                    totalStudyHours: Math.round((metric._sum.totalStudyMinutes || 0) / 60)
                });
                rank++;
            }
        }

        return leaderboard;
    } catch (error) {
        console.error('Error fetching course leaderboard:', error);
        return [];
    }
};

/**
 * Get department leaderboard
 */
export const getDepartmentLeaderboard = async (
    department: string,
    limit: number = 50,
    offset: number = 0
): Promise<LeaderboardEntry[]> => {
    try {
        // Get all users in department
        const departmentUsers = await prisma.user.findMany({
            where: { department: department },
            select: { id: true }
        });
        const userIds = departmentUsers.map((u: { id: string }) => u.id);

        const metrics = await prisma.performanceMetric.groupBy({
            by: ['userId'],
            where: { userId: { in: userIds } },
            _sum: {
                leaderboardPoints: true,
                totalStudyMinutes: true
            },
            _avg: {
                overallAccuracy: true,
                performanceScore: true
            },
            _max: {
                currentStudyStreak: true
            },
            orderBy: {
                _sum: {
                    leaderboardPoints: 'desc'
                }
            },
            skip: offset,
            take: limit
        });

        const leaderboard: LeaderboardEntry[] = [];
        let rank = offset + 1;

        for (const metric of metrics) {
            const user = await prisma.user.findUnique({
                where: { id: metric.userId }
            });
            if (user) {
                leaderboard.push({
                    rank: rank,
                    userId: metric.userId,
                    studentName: `${user.firstname} ${user.lastname}`,
                    department: user.department || 'N/A',
                    level: user.level || 0,
                    leaderboardPoints: Math.round(metric._sum.leaderboardPoints || 0),
                    overallAccuracy: Math.round(metric._avg.overallAccuracy || 0),
                    performanceScore: Math.round(metric._avg.performanceScore || 0),
                    currentStreak: metric._max.currentStudyStreak || 0,
                    totalStudyHours: Math.round((metric._sum.totalStudyMinutes || 0) / 60)
                });
                rank++;
            }
        }

        return leaderboard;
    } catch (error) {
        console.error('Error fetching department leaderboard:', error);
        return [];
    }
};

/**
 * Get student's rank and surrounding competitors
 */
export const getStudentRankContext = async (
    userId: string,
    contextSize: number = 5
): Promise<{
    studentRank: number;
    totalStudents: number;
    percentile: number;
    studentEntry: LeaderboardEntry | null;
    nearbyCompetitors: LeaderboardEntry[];
}> => {
    try {
        const allMetrics = await prisma.performanceMetric.groupBy({
            by: ['userId'],
            _sum: {
                leaderboardPoints: true
            },
            orderBy: {
                _sum: {
                    leaderboardPoints: 'desc'
                }
            }
        });

        const studentRank = allMetrics.findIndex((m: any) => m.userId === userId) + 1;
        const totalStudents = allMetrics.length;
        const percentile = totalStudents > 0 ? ((totalStudents - studentRank) / totalStudents) * 100 : 0;

        const studentMetrics = await prisma.performanceMetric.findFirst({
            where: { userId: userId },
            orderBy: { dateRecorded: 'desc' }
        });

        const studentUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        const studentEntry: LeaderboardEntry | null = studentUser && studentMetrics ? {
            rank: studentRank,
            userId: userId,
            studentName: `${studentUser.firstname} ${studentUser.lastname}`,
            department: studentUser.department || 'N/A',
            level: studentUser.level || 0,
            leaderboardPoints: Math.round(studentMetrics.leaderboardPoints),
            overallAccuracy: Math.round(studentMetrics.overallAccuracy),
            performanceScore: Math.round(studentMetrics.performanceScore),
            currentStreak: studentMetrics.currentStudyStreak,
            totalStudyHours: Math.round(studentMetrics.totalStudyMinutes / 60)
        } : null;

        const startIdx = Math.max(0, studentRank - contextSize - 1);
        const endIdx = Math.min(totalStudents, studentRank + contextSize);
        const competitorRanks = allMetrics.slice(startIdx, endIdx);

        const nearbyCompetitors: LeaderboardEntry[] = [];
        let competitorRank = startIdx + 1;

        for (const metric of competitorRanks) {
            const competitorUser = await prisma.user.findUnique({
                where: { id: metric.userId }
            });
            if (competitorUser) {
                nearbyCompetitors.push({
                    rank: competitorRank,
                    userId: metric.userId,
                    studentName: `${competitorUser.firstname} ${competitorUser.lastname}`,
                    department: competitorUser.department || 'N/A',
                    level: competitorUser.level || 0,
                    leaderboardPoints: Math.round(metric._sum.leaderboardPoints || 0),
                    overallAccuracy: 0,
                    performanceScore: 0,
                    currentStreak: 0,
                    totalStudyHours: 0
                });
                competitorRank++;
            }
        }

        return {
            studentRank: studentRank,
            totalStudents: totalStudents,
            percentile: Math.round(percentile),
            studentEntry: studentEntry,
            nearbyCompetitors: nearbyCompetitors
        };
    } catch (error) {
        console.error('Error getting student rank context:', error);
        return {
            studentRank: 0,
            totalStudents: 0,
            percentile: 0,
            studentEntry: null,
            nearbyCompetitors: []
        };
    }
};

/**
 * Check if student qualifies for leaderboard
 */
export const qualifiesForLeaderboard = async (userId: string): Promise<boolean> => {
    try {
        const lastSevenDays = new Date();
        lastSevenDays.setDate(lastSevenDays.getDate() - 7);

        const recentActivities = await prisma.activityLog.count({
            where: {
                userId: userId,
                activityDate: { gte: lastSevenDays }
            }
        });

        const minimumActivitiesRequired = 5;
        return recentActivities >= minimumActivitiesRequired;
    } catch (error) {
        console.error('Error checking leaderboard qualification:', error);
        return false;
    }
};

/**
 * Get achievement badges for student
 */
export const getStudentAchievements = async (userId: string): Promise<string[]> => {
    try {
        const achievements: string[] = [];
        const performance = await prisma.performanceMetric.findFirst({
            where: { userId: userId },
            orderBy: { dateRecorded: 'desc' }
        });

        if (!performance) return achievements;

        // Accuracy badges
        if (performance.overallAccuracy >= 95) {
            achievements.push('🏆 Perfect Score Master');
        } else if (performance.overallAccuracy >= 90) {
            achievements.push('⭐ Excellence Achieved');
        } else if (performance.overallAccuracy >= 80) {
            achievements.push('💯 High Achiever');
        }

        // Consistency badges
        if (performance.currentStudyStreak >= 30) {
            achievements.push('🔥 30-Day Streak');
        } else if (performance.currentStudyStreak >= 14) {
            achievements.push('🌟 Two Week Warrior');
        } else if (performance.currentStudyStreak >= 7) {
            achievements.push('📚 Study Streak');
        }

        // Volume badges
        if (performance.totalStudyMinutes >= 10000) {
            achievements.push('⏱️ Study Time Master');
        } else if (performance.totalStudyMinutes >= 5000) {
            achievements.push('📖 Dedicated Learner');
        }

        return achievements;
    } catch (error) {
        console.error('Error getting student achievements:', error);
        return [];
    }
};

