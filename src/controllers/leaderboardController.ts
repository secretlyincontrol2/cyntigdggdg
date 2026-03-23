import { Request, Response } from 'express';
import {
    getGlobalLeaderboard,
    getCourseLeaderboard,
    getDepartmentLeaderboard,
    getStudentRankContext,
    qualifiesForLeaderboard,
    getStudentAchievements
} from '../services/leaderboardService';

// @desc    Get global leaderboard
// @route   GET /api/leaderboard
// @access  Public
export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const limit = req.query.limit || 100;
        const offset = req.query.offset || 0;

        const leaderboard = await getGlobalLeaderboard(
            parseInt(limit as string),
            parseInt(offset as string)
        );

        res.status(200).json({
            success: true,
            totalRanked: leaderboard.length,
            leaderboard: leaderboard
        });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Error fetching leaderboard' });
    }
};

// @desc    Get course-specific leaderboard
// @route   GET /api/leaderboard/course/:courseId
// @access  Public
export const getCourseLeaderboardEndpoint = async (req: Request, res: Response) => {
    try {
        const { courseId } = req.params;
        const limit = req.query.limit || 50;
        const offset = req.query.offset || 0;

        if (!courseId) {
            res.status(400).json({ message: 'courseId is required' });
            return;
        }

        const leaderboard = await getCourseLeaderboard(
            courseId as string,
            parseInt(limit as string),
            parseInt(offset as string)
        );

        res.status(200).json({
            success: true,
            courseId: courseId,
            totalRanked: leaderboard.length,
            leaderboard: leaderboard
        });
    } catch (error) {
        console.error('Error fetching course leaderboard:', error);
        res.status(500).json({ message: 'Error fetching leaderboard' });
    }
};

// @desc    Get department leaderboard
// @route   GET /api/leaderboard/department/:department
// @access  Public
export const getDepartmentLeaderboardEndpoint = async (req: Request, res: Response) => {
    try {
        const { department } = req.params;
        const limit = req.query.limit || 50;
        const offset = req.query.offset || 0;

        if (!department) {
            res.status(400).json({ message: 'department is required' });
            return;
        }

        const leaderboard = await getDepartmentLeaderboard(
            department as string,
            parseInt(limit as string),
            parseInt(offset as string)
        );

        res.status(200).json({
            success: true,
            department: department,
            totalRanked: leaderboard.length,
            leaderboard: leaderboard
        });
    } catch (error) {
        console.error('Error fetching department leaderboard:', error);
        res.status(500).json({ message: 'Error fetching leaderboard' });
    }
};

// @desc    Get student's rank and context
// @route   GET /api/leaderboard/me
// @access  Private
export const getMyRank = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;

        // Check if student qualifies
        const qualifies = await qualifiesForLeaderboard(userId);

        if (!qualifies) {
            res.status(200).json({
                success: false,
                message: 'You need at least 5 activities in the last 7 days to appear on the leaderboard.',
                qualifiesForLeaderboard: false
            });
            return;
        }

        const rankContext = await getStudentRankContext(userId);

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
    } catch (error) {
        console.error('Error fetching student rank:', error);
        res.status(500).json({ message: 'Error fetching rank information' });
    }
};

// @desc    Get student's achievements and badges
// @route   GET /api/leaderboard/achievements
// @access  Private
export const getAchievements = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;

        const achievements = await getStudentAchievements(userId);

        res.status(200).json({
            success: true,
            totalAchievements: achievements.length,
            achievements: achievements,
            message: achievements.length > 0 
                ? 'Great job! You\'ve earned these achievements!' 
                : 'Keep studying to earn achievements!'
        });
    } catch (error) {
        console.error('Error fetching achievements:', error);
        res.status(500).json({ message: 'Error fetching achievements' });
    }
};

// @desc    Get leaderboard filters (for frontend)
// @route   GET /api/leaderboard/filters
// @access  Public
export const getLeaderboardFilters = async (req: Request, res: Response) => {
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
    } catch (error) {
        console.error('Error fetching leaderboard filters:', error);
        res.status(500).json({ message: 'Error fetching filters' });
    }
};

// @desc    Compare student with competitors
// @route   GET /api/leaderboard/compare
// @access  Private
export const compareWithCompetitors = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;

        const rankContext = await getStudentRankContext(userId, 3);

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
    } catch (error) {
        console.error('Error comparing with competitors:', error);
        res.status(500).json({ message: 'Error comparing with competitors' });
    }
};
