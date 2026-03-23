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
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareWithCompetitors = exports.getLeaderboardFilters = exports.getAchievements = exports.getMyRank = exports.getDepartmentLeaderboardEndpoint = exports.getCourseLeaderboardEndpoint = exports.getLeaderboard = void 0;
const leaderboardService_1 = require("../services/leaderboardService");
// @desc    Get global leaderboard
// @route   GET /api/leaderboard
// @access  Public
const getLeaderboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const limit = req.query.limit || 100;
        const offset = req.query.offset || 0;
        const leaderboard = yield (0, leaderboardService_1.getGlobalLeaderboard)(parseInt(limit), parseInt(offset));
        res.status(200).json({
            success: true,
            totalRanked: leaderboard.length,
            leaderboard: leaderboard
        });
    }
    catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Error fetching leaderboard' });
    }
});
exports.getLeaderboard = getLeaderboard;
// @desc    Get course-specific leaderboard
// @route   GET /api/leaderboard/course/:courseId
// @access  Public
const getCourseLeaderboardEndpoint = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { courseId } = req.params;
        const limit = req.query.limit || 50;
        const offset = req.query.offset || 0;
        if (!courseId) {
            res.status(400).json({ message: 'courseId is required' });
            return;
        }
        const leaderboard = yield (0, leaderboardService_1.getCourseLeaderboard)(courseId, parseInt(limit), parseInt(offset));
        res.status(200).json({
            success: true,
            courseId: courseId,
            totalRanked: leaderboard.length,
            leaderboard: leaderboard
        });
    }
    catch (error) {
        console.error('Error fetching course leaderboard:', error);
        res.status(500).json({ message: 'Error fetching leaderboard' });
    }
});
exports.getCourseLeaderboardEndpoint = getCourseLeaderboardEndpoint;
// @desc    Get department leaderboard
// @route   GET /api/leaderboard/department/:department
// @access  Public
const getDepartmentLeaderboardEndpoint = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { department } = req.params;
        const limit = req.query.limit || 50;
        const offset = req.query.offset || 0;
        if (!department) {
            res.status(400).json({ message: 'department is required' });
            return;
        }
        const leaderboard = yield (0, leaderboardService_1.getDepartmentLeaderboard)(department, parseInt(limit), parseInt(offset));
        res.status(200).json({
            success: true,
            department: department,
            totalRanked: leaderboard.length,
            leaderboard: leaderboard
        });
    }
    catch (error) {
        console.error('Error fetching department leaderboard:', error);
        res.status(500).json({ message: 'Error fetching leaderboard' });
    }
});
exports.getDepartmentLeaderboardEndpoint = getDepartmentLeaderboardEndpoint;
// @desc    Get student's rank and context
// @route   GET /api/leaderboard/me
// @access  Private
const getMyRank = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        // Check if student qualifies
        const qualifies = yield (0, leaderboardService_1.qualifiesForLeaderboard)(userId);
        if (!qualifies) {
            res.status(200).json({
                success: false,
                message: 'You need at least 5 activities in the last 7 days to appear on the leaderboard.',
                qualifiesForLeaderboard: false
            });
            return;
        }
        const rankContext = yield (0, leaderboardService_1.getStudentRankContext)(userId);
        res.status(200).json({
            success: true,
            qualifiesForLeaderboard: true,
            rankData: {
                yourRank: rankContext.studentRank,
                totalStudents: rankContext.totalStudents,
                percentile: rankContext.percentile,
                yourStats: rankContext.studentEntry,
                nearbyCompetitors: rankContext.nearbyCompetitors
            }
        });
    }
    catch (error) {
        console.error('Error fetching student rank:', error);
        res.status(500).json({ message: 'Error fetching rank information' });
    }
});
exports.getMyRank = getMyRank;
// @desc    Get student's achievements and badges
// @route   GET /api/leaderboard/achievements
// @access  Private
const getAchievements = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const achievements = yield (0, leaderboardService_1.getStudentAchievements)(userId);
        res.status(200).json({
            success: true,
            totalAchievements: achievements.length,
            achievements: achievements,
            message: achievements.length > 0
                ? 'Great job! You\'ve earned these achievements!'
                : 'Keep studying to earn achievements!'
        });
    }
    catch (error) {
        console.error('Error fetching achievements:', error);
        res.status(500).json({ message: 'Error fetching achievements' });
    }
});
exports.getAchievements = getAchievements;
// @desc    Get leaderboard filters (for frontend)
// @route   GET /api/leaderboard/filters
// @access  Public
const getLeaderboardFilters = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.status(200).json({
            success: true,
            filters: {
                byType: [
                    { value: 'global', label: 'Global Leaderboard' },
                    { value: 'course', label: 'Course Leaderboard' },
                    { value: 'department', label: 'Department Leaderboard' }
                ],
                sortBy: [
                    { value: 'points', label: 'Points (Highest)' },
                    { value: 'accuracy', label: 'Accuracy (Highest)' },
                    { value: 'consistency', label: 'Consistency (Streak)' },
                    { value: 'studyTime', label: 'Study Time (Most)' }
                ]
            }
        });
    }
    catch (error) {
        console.error('Error fetching leaderboard filters:', error);
        res.status(500).json({ message: 'Error fetching filters' });
    }
});
exports.getLeaderboardFilters = getLeaderboardFilters;
// @desc    Compare student with competitors
// @route   GET /api/leaderboard/compare
// @access  Private
const compareWithCompetitors = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const rankContext = yield (0, leaderboardService_1.getStudentRankContext)(userId, 3);
        if (!rankContext.studentEntry) {
            res.status(200).json({
                success: false,
                message: 'Not enough data to compare'
            });
            return;
        }
        res.status(200).json({
            success: true,
            comparison: {
                you: rankContext.studentEntry,
                aheadOfYou: rankContext.nearbyCompetitors
                    .filter(c => c.rank < rankContext.studentRank)
                    .slice(0, 2),
                behindYou: rankContext.nearbyCompetitors
                    .filter(c => c.rank > rankContext.studentRank)
                    .slice(0, 2)
            }
        });
    }
    catch (error) {
        console.error('Error comparing with competitors:', error);
        res.status(500).json({ message: 'Error comparing with competitors' });
    }
});
exports.compareWithCompetitors = compareWithCompetitors;
