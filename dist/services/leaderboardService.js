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
exports.getStudentAchievements = exports.qualifiesForLeaderboard = exports.getStudentRankContext = exports.getDepartmentLeaderboard = exports.getCourseLeaderboard = exports.getGlobalLeaderboard = void 0;
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
/**
 * Get global leaderboard (all students across all courses)
 */
const getGlobalLeaderboard = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (limit = 100, offset = 0) {
    try {
        const metrics = yield prismaClient_1.default.performanceMetric.groupBy({
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
        const leaderboard = [];
        let rank = offset + 1;
        for (const metric of metrics) {
            const user = yield prismaClient_1.default.user.findUnique({
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
    }
    catch (error) {
        console.error('Error fetching global leaderboard:', error);
        return [];
    }
});
exports.getGlobalLeaderboard = getGlobalLeaderboard;
/**
 * Get leaderboard for specific course
 */
const getCourseLeaderboard = (courseId_1, ...args_1) => __awaiter(void 0, [courseId_1, ...args_1], void 0, function* (courseId, limit = 50, offset = 0) {
    try {
        const metrics = yield prismaClient_1.default.performanceMetric.groupBy({
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
        const leaderboard = [];
        let rank = offset + 1;
        for (const metric of metrics) {
            const user = yield prismaClient_1.default.user.findUnique({
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
    }
    catch (error) {
        console.error('Error fetching course leaderboard:', error);
        return [];
    }
});
exports.getCourseLeaderboard = getCourseLeaderboard;
/**
 * Get department leaderboard
 */
const getDepartmentLeaderboard = (department_1, ...args_1) => __awaiter(void 0, [department_1, ...args_1], void 0, function* (department, limit = 50, offset = 0) {
    try {
        // Get all users in department
        const departmentUsers = yield prismaClient_1.default.user.findMany({
            where: { department: department },
            select: { id: true }
        });
        const userIds = departmentUsers.map((u) => u.id);
        const metrics = yield prismaClient_1.default.performanceMetric.groupBy({
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
        const leaderboard = [];
        let rank = offset + 1;
        for (const metric of metrics) {
            const user = yield prismaClient_1.default.user.findUnique({
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
    }
    catch (error) {
        console.error('Error fetching department leaderboard:', error);
        return [];
    }
});
exports.getDepartmentLeaderboard = getDepartmentLeaderboard;
/**
 * Get student's rank and surrounding competitors
 */
const getStudentRankContext = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, contextSize = 5) {
    try {
        const allMetrics = yield prismaClient_1.default.performanceMetric.groupBy({
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
        const studentRank = allMetrics.findIndex((m) => m.userId === userId) + 1;
        const totalStudents = allMetrics.length;
        const percentile = totalStudents > 0 ? ((totalStudents - studentRank) / totalStudents) * 100 : 0;
        const studentMetrics = yield prismaClient_1.default.performanceMetric.findFirst({
            where: { userId: userId },
            orderBy: { dateRecorded: 'desc' }
        });
        const studentUser = yield prismaClient_1.default.user.findUnique({
            where: { id: userId }
        });
        const studentEntry = studentUser && studentMetrics ? {
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
        const nearbyCompetitors = [];
        let competitorRank = startIdx + 1;
        for (const metric of competitorRanks) {
            const competitorUser = yield prismaClient_1.default.user.findUnique({
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
    }
    catch (error) {
        console.error('Error getting student rank context:', error);
        return {
            studentRank: 0,
            totalStudents: 0,
            percentile: 0,
            studentEntry: null,
            nearbyCompetitors: []
        };
    }
});
exports.getStudentRankContext = getStudentRankContext;
/**
 * Check if student qualifies for leaderboard
 */
const qualifiesForLeaderboard = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const lastSevenDays = new Date();
        lastSevenDays.setDate(lastSevenDays.getDate() - 7);
        const recentActivities = yield prismaClient_1.default.activityLog.count({
            where: {
                userId: userId,
                activityDate: { gte: lastSevenDays }
            }
        });
        const minimumActivitiesRequired = 5;
        return recentActivities >= minimumActivitiesRequired;
    }
    catch (error) {
        console.error('Error checking leaderboard qualification:', error);
        return false;
    }
});
exports.qualifiesForLeaderboard = qualifiesForLeaderboard;
/**
 * Get achievement badges for student
 */
const getStudentAchievements = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const achievements = [];
        const performance = yield prismaClient_1.default.performanceMetric.findFirst({
            where: { userId: userId },
            orderBy: { dateRecorded: 'desc' }
        });
        if (!performance)
            return achievements;
        // Accuracy badges
        if (performance.overallAccuracy >= 95) {
            achievements.push('🏆 Perfect Score Master');
        }
        else if (performance.overallAccuracy >= 90) {
            achievements.push('⭐ Excellence Achieved');
        }
        else if (performance.overallAccuracy >= 80) {
            achievements.push('💯 High Achiever');
        }
        // Consistency badges
        if (performance.currentStudyStreak >= 30) {
            achievements.push('🔥 30-Day Streak');
        }
        else if (performance.currentStudyStreak >= 14) {
            achievements.push('🌟 Two Week Warrior');
        }
        else if (performance.currentStudyStreak >= 7) {
            achievements.push('📚 Study Streak');
        }
        // Volume badges
        if (performance.totalStudyMinutes >= 10000) {
            achievements.push('⏱️ Study Time Master');
        }
        else if (performance.totalStudyMinutes >= 5000) {
            achievements.push('📖 Dedicated Learner');
        }
        return achievements;
    }
    catch (error) {
        console.error('Error getting student achievements:', error);
        return [];
    }
});
exports.getStudentAchievements = getStudentAchievements;
