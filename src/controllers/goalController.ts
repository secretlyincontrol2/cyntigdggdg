import { Request, Response } from 'express';
import { generateDailyGoals, generateWeeklyGoals, updateGoalProgress } from '../services/goalGenerationService';
import prisma from '../config/prismaClient';

// @desc    Generate daily goals for student
// @route   POST /api/goals/generate-daily
// @access  Private
export const generateDailyGoalsEndpoint = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;

        const goals = await generateDailyGoals(userId);

        if (goals.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Unable to generate goals. Please complete your profile.'
            });
            return;
        }

        res.status(201).json({
            success: true,
            message: `Generated ${goals.length} daily goals`,
            goals: goals.map((g: any) => ({
                _id: g.id,
                goalTitle: g.goalTitle,
                description: g.goalDescription,
                targetValue: g.targetValue,
                unit: g.unit,
                priority: g.priority,
                motivationalMessage: g.motivationalMessage,
                dueDate: g.dueDate
            }))
        });
    } catch (error) {
        console.error('Error generating daily goals:', error);
        res.status(500).json({ message: 'Error generating daily goals' });
    }
};

// @desc    Generate weekly goals
// @route   POST /api/goals/generate-weekly
// @access  Private
export const generateWeeklyGoalsEndpoint = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;

        const goals = await generateWeeklyGoals(userId);

        if (goals.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Unable to generate goals'
            });
            return;
        }

        res.status(201).json({
            success: true,
            message: `Generated ${goals.length} weekly goals`,
            goals: goals.map((g: any) => ({
                _id: g.id,
                goalTitle: g.goalTitle,
                description: g.goalDescription,
                targetValue: g.targetValue,
                unit: g.unit,
                priority: g.priority,
                dueDate: g.dueDate
            }))
        });
    } catch (error) {
        console.error('Error generating weekly goals:', error);
        res.status(500).json({ message: 'Error generating weekly goals' });
    }
};

// @desc    Get today's goals
// @route   GET /api/goals/today
// @access  Private
export const getTodayGoals = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayGoals = await prisma.studentGoal.findMany({
            where: {
                userId: userId,
                goalType: 'daily',
                dueDate: { gte: today, lt: tomorrow }
            },
            orderBy: { priority: 'desc' }
        });

        // If no goals exist for today, generate them
        if (todayGoals.length === 0) {
            const generatedGoals = await generateDailyGoals(userId);
            res.status(200).json({
                success: true,
                message: 'No existing goals. Generated new ones.',
                goals: generatedGoals.map((g: any) => ({
                    _id: g.id,
                    goalTitle: g.goalTitle,
                    description: g.goalDescription,
                    targetValue: g.targetValue,
                    currentProgress: g.currentProgress,
                    unit: g.unit,
                    priority: g.priority,
                    status: g.status,
                    motivationalMessage: g.motivationalMessage
                }))
            });
            return;
        }

        res.status(200).json({
            success: true,
            totalGoals: todayGoals.length,
            goals: todayGoals.map((g: any) => ({
                _id: g.id,
                goalTitle: g.goalTitle,
                description: g.goalDescription,
                targetValue: g.targetValue,
                currentProgress: g.currentProgress,
                progressPercentage: (g.currentProgress / g.targetValue) * 100,
                unit: g.unit,
                priority: g.priority,
                status: g.status,
                motivationalMessage: g.motivationalMessage
            }))
        });
    } catch (error) {
        console.error('Error fetching today goals:', error);
        res.status(500).json({ message: 'Error fetching goals' });
    }
};

// @desc    Update goal progress
// @route   PUT /api/goals/:goalId/progress
// @access  Private
export const updateGoalProgressEndpoint = async (req: any, res: Response) => {
    try {
        const { goalId } = req.params;
        const { increment } = req.body;

        if (!increment || increment <= 0) {
            res.status(400).json({ message: 'Valid increment value required' });
            return;
        }

        const userId = req.user.id;

        const goal = await prisma.studentGoal.findUnique({
            where: { id: goalId }
        });

        if (!goal || goal.userId !== userId) {
            res.status(404).json({ message: 'Goal not found' });
            return;
        }

        // Update progress
        const updatedGoal = await updateGoalProgress(goalId, increment);

        if (!updatedGoal) {
            res.status(500).json({ message: 'Error updating goal' });
            return;
        }

        const progressPercentage = (updatedGoal.currentProgress / updatedGoal.targetValue) * 100;
        const isCompleted = updatedGoal.status === 'completed';

        let message = `Progress updated: ${updatedGoal.currentProgress}/${updatedGoal.targetValue} ${updatedGoal.unit}`;
        let motivationalMsg = '';

        if (progressPercentage === 50) {
            motivationalMsg = '🎉 You\'re halfway there! Keep going!';
        } else if (progressPercentage === 75) {
            motivationalMsg = '💪 Almost there! Just a little more!';
        } else if (isCompleted) {
            motivationalMsg = '🏆 You did it! Goal completed! Amazing work!';
            message = `Goal completed! Well done!`;

            // Log goal completion
            await prisma.activityLog.create({
                data: {
                    userId: userId,
                    activityType: 'goal_completed',
                    activityDate: new Date(),
                    courseId: goal.subject,
                    courseName: goal.subject,
                    description: `Completed goal: ${goal.goalTitle}`,
                    metadata: {
                        goalId: goalId,
                        goalTitle: goal.goalTitle
                    }
                }
            });
        }

        res.status(200).json({
            success: true,
            message: message,
            motivationalMessage: motivationalMsg,
            goal: {
                _id: updatedGoal.id,
                goalTitle: updatedGoal.goalTitle,
                currentProgress: updatedGoal.currentProgress,
                targetValue: updatedGoal.targetValue,
                progressPercentage: parseFloat(progressPercentage.toFixed(2)),
                status: updatedGoal.status,
                unit: updatedGoal.unit
            }
        });
    } catch (error) {
        console.error('Error updating goal progress:', error);
        res.status(500).json({ message: 'Error updating goal progress' });
    }
};

// @desc    Get goal recommendations based on performance
// @route   GET /api/goals/recommendations
// @access  Private
export const getGoalRecommendations = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;

        const performance = await prisma.performanceMetric.findFirst({
            where: { userId: userId },
            orderBy: { dateRecorded: 'desc' }
        });

        if (!performance) {
            res.status(200).json({
                success: false,
                message: 'No performance data available yet'
            });
            return;
        }

        const recommendations = {
            focusAreas: performance.weakTopics || [],
            suggestedGoals: [] as Record<string, any>[]
        };

        // Suggest goals based on weak areas
        if (recommendations.focusAreas.length > 0) {
            recommendations.suggestedGoals.push({
                title: `Master ${recommendations.focusAreas[0]}`,
                description: `Focus on improving accuracy in ${recommendations.focusAreas[0]} by 20%`,
                targetValue: 10,
                unit: 'problems'
            });
        }

        // Suggest consistency goal
        if (performance.currentStudyStreak < 7) {
            recommendations.suggestedGoals.push({
                title: 'Build a Week-Long Study Streak',
                description: 'Study for 7 consecutive days',
                targetValue: 7,
                unit: 'days'
            });
        }

        res.status(200).json({
            success: true,
            recommendations: recommendations
        });
    } catch (error) {
        console.error('Error getting goal recommendations:', error);
        res.status(500).json({ message: 'Error getting recommendations' });
    }
};

// @desc    Mark goal as abandoned
// @route   PUT /api/goals/:goalId/abandon
// @access  Private
export const abandonGoal = async (req: any, res: Response) => {
    try {
        const { goalId } = req.params;
        const userId = req.user.id;

        const goal = await prisma.studentGoal.findUnique({
            where: { id: goalId }
        });

        if (!goal || goal.userId !== userId) {
            res.status(404).json({ message: 'Goal not found' });
            return;
        }

        const updatedGoal = await prisma.studentGoal.update({
            where: { id: goalId },
            data: { status: 'abandoned' }
        });

        res.status(200).json({
            success: true,
            message: 'Goal marked as abandoned',
            goal: {
                _id: updatedGoal.id,
                goalTitle: updatedGoal.goalTitle,
                status: updatedGoal.status
            }
        });
    } catch (error) {
        console.error('Error abandoning goal:', error);
        res.status(500).json({ message: 'Error abandoning goal' });
    }
};

// @desc    Get all goals for user
// @route   GET /api/goals
// @access  Private
export const getAllGoals = async (req: any, res: Response) => {
    try {
        const userId = req.user.id;
        const status = req.query.status as string;
        const goalType = req.query.type as string;

        let where: any = { userId: userId };
        if (status) where.status = status;
        if (goalType) where.goalType = goalType;

        const goals = await prisma.studentGoal.findMany({
            where: where,
            orderBy: { dueDate: 'asc' }
        });

        res.status(200).json({
            success: true,
            totalGoals: goals.length,
            goals: goals.map((g: any) => ({
                _id: g.id,
                goalTitle: g.goalTitle,
                description: g.goalDescription,
                targetValue: g.targetValue,
                currentProgress: g.currentProgress,
                progressPercentage: (g.currentProgress / g.targetValue) * 100,
                unit: g.unit,
                priority: g.priority,
                status: g.status,
                goalType: g.goalType,
                dueDate: g.dueDate,
                motivationalMessage: g.motivationalMessage
            }))
        });
    } catch (error) {
        console.error('Error fetching all goals:', error);
        res.status(500).json({ message: 'Error fetching goals' });
    }
};
