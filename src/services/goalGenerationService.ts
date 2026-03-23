import prisma from '../config/prismaClient';
import { generateTutorResponse } from './geminiRagService';

/**
 * Generate personalized daily goals for a student
 * Based on:
 * - Study capacity (hours per day)
 * - Break duration preference
 * - Weak areas (from performance)
 * - Current performance level
 * - Time preference (day/night)
 */
export const generateDailyGoals = async (userId: string): Promise<any[]> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) return [];

        // Get student's performance data
        const performance = await prisma.performanceMetric.findFirst({
            where: { userId: userId },
            orderBy: { dateRecorded: 'desc' }
        });

        // Parse study capacity (extract numbers from format like "2-3 hours")
        const studyHours = parseFloat(user.studyHours || '2');
        const breakDuration = parseInt(user.readDuration || '30');

        // Remove any existing pending goals for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        await prisma.studentGoal.deleteMany({
            where: {
                userId: userId,
                goalType: 'daily',
                dueDate: { gte: today, lt: tomorrow },
                status: 'pending'
            }
        });

        // Generate base goals
        const goalsData = [];

        // Goal 1: Practice Questions (50-60% of study time)
        const practiceTimeMinutes = Math.round(studyHours * 60 * 0.55);
        const practiceQuestionsCount = Math.round(practiceTimeMinutes / 5); // ~5 mins per question

        goalsData.push({
            userId: userId,
            goalType: 'daily',
            goalTitle: `Complete ${practiceQuestionsCount} practice questions`,
            goalDescription: `Solve ${practiceQuestionsCount} questions across various topics. Target: ${Math.round(practiceQuestionsCount * 0.8)} correct answers (80% accuracy).`,
            targetValue: practiceQuestionsCount,
            currentProgress: 0,
            unit: 'questions',
            subject: user.courses && user.courses.length > 0 ? user.courses[0] : 'General',
            priority: 'high',
            status: 'pending',
            dueDate: tomorrow,
            aiGenerated: true,
            motivationalMessage: `You've got this! Every question you solve brings you closer to mastery. Focus on accuracy over speed.`,
            difficultyLevel: calculateDifficultyLevel(performance)
        });

        // Goal 2: Concept Study (30-40% of study time)
        const studyTimeMinutes = Math.round(studyHours * 60 * 0.35);
        goalsData.push({
            userId: userId,
            goalType: 'daily',
            goalTitle: `Study ${Math.round(studyTimeMinutes / 10)} key concepts`,
            goalDescription: `Review and understand ${Math.round(studyTimeMinutes / 10)} important concepts from your lectures. ${getWeakAreaSuggestion(performance)}`,
            targetValue: studyTimeMinutes,
            currentProgress: 0,
            unit: 'minutes',
            subject: user.courses && user.courses.length > 0 ? user.courses[0] : 'General',
            priority: 'high',
            status: 'pending',
            dueDate: tomorrow,
            aiGenerated: true,
            motivationalMessage: `Understanding concepts is key to long-term success. Don't rush—take your time to really grasp each idea.`,
            difficultyLevel: calculateDifficultyLevel(performance)
        });

        // Goal 3: Weak Areas Focused Practice (if available)
        if (performance && performance.weakTopics && performance.weakTopics.length > 0) {
            goalsData.push({
                userId: userId,
                goalType: 'daily',
                goalTitle: `Focus on weak area: ${performance.weakTopics[0]}`,
                goalDescription: `Dedicate extra time to ${performance.weakTopics[0]}. Solve at least 5 problems and review the fundamentals.`,
                targetValue: 5,
                currentProgress: 0,
                unit: 'problems',
                subject: performance.weakTopics[0],
                priority: 'high',
                status: 'pending',
                dueDate: tomorrow,
                aiGenerated: true,
                motivationalMessage: `This is your opportunity to turn a weakness into strength. You're capable of mastering ${performance.weakTopics[0]}!`,
                difficultyLevel: 'intermediate'
            });
        }

        // Goal 4: Reading Preference Goal
        if (user.dayOrNight === 'night' || user.dayOrNight === 'both') {
            goalsData.push({
                userId: userId,
                goalType: 'daily',
                goalTitle: `Evening study session (${breakDuration} min break after)`,
                goalDescription: `Complete your main study activities in the evening and take a well-deserved ${breakDuration}-minute break afterward.`,
                targetValue: Math.round(studyHours * 60),
                currentProgress: 0,
                unit: 'minutes',
                subject: 'Consistency',
                priority: 'medium',
                status: 'pending',
                dueDate: tomorrow,
                aiGenerated: true,
                motivationalMessage: `Perfect! Studying at your optimal time ensures you'll be most productive and retain information better.`,
                difficultyLevel: 'beginner'
            });
        }

        // Save all goals (Prisma createMany)
        await prisma.studentGoal.createMany({
            data: goalsData
        });

        // Fetch back the created goals to return them (since createMany doesn't return the full objects in all DBs)
        const savedGoals = await prisma.studentGoal.findMany({
            where: {
                userId: userId,
                goalType: 'daily',
                dueDate: { gte: today, lt: tomorrow },
                status: 'pending'
            }
        });

        console.log(`✅ Generated ${savedGoals.length} daily goals for user ${userId}`);
        return savedGoals;
    } catch (error) {
        console.error('Error generating daily goals:', error);
        return [];
    }
};

/**
 * Generate weekly goals based on performance trends
 */
export const generateWeeklyGoals = async (userId: string): Promise<any[]> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) return [];

        const performance = await prisma.performanceMetric.findFirst({
            where: { userId: userId },
            orderBy: { dateRecorded: 'desc' }
        });

        const goalsData = [];

        // Weekly goal 1: Total study hours
        const weeklyStudyHours = parseFloat(user.studyHours || '2') * 7;
        goalsData.push({
            userId: userId,
            goalType: 'weekly',
            goalTitle: `Study for ${Math.round(weeklyStudyHours)} hours`,
            goalDescription: `Maintain consistent study habits throughout the week. Aim for at least ${Math.round(weeklyStudyHours)} hours of focused study.`,
            targetValue: Math.round(weeklyStudyHours),
            currentProgress: 0,
            unit: 'hours',
            subject: 'Consistency',
            priority: 'high',
            status: 'pending',
            dueDate: getNextWeekEnd(),
            aiGenerated: true,
            motivationalMessage: `You're building a strong study habit. Consistency is the secret to academic success!`,
            difficultyLevel: 'intermediate'
        });

        // Weekly goal 2: Practice questions
        goalsData.push({
            userId: userId,
            goalType: 'weekly',
            goalTitle: `Complete 50+ practice questions`,
            goalDescription: `Solve at least 50 practice questions across different topics. This reinforces your understanding and builds problem-solving skills.`,
            targetValue: 50,
            currentProgress: 0,
            unit: 'questions',
            subject: 'Practice',
            priority: 'high',
            status: 'pending',
            dueDate: getNextWeekEnd(),
            aiGenerated: true,
            motivationalMessage: `Each question solved is a step toward mastery. Track your progress and celebrate every milestone!`,
            difficultyLevel: 'intermediate'
        });

        // Weekly goal 3: Improve weak areas
        if (performance && performance.weakTopics && performance.weakTopics.length > 0) {
            goalsData.push({
                userId: userId,
                goalType: 'weekly',
                goalTitle: `Improve accuracy in ${performance.weakTopics[0]}`,
                goalDescription: `Target: Increase accuracy in ${performance.weakTopics[0]} from ${getTopicAccuracy(performance, performance.weakTopics[0])}% to 75%+. Review concepts and solve targeted problems.`,
                targetValue: 75,
                currentProgress: getTopicAccuracy(performance, performance.weakTopics[0]),
                unit: 'accuracy %',
                subject: performance.weakTopics[0],
                priority: 'high',
                status: 'pending',
                dueDate: getNextWeekEnd(),
                aiGenerated: true,
                motivationalMessage: `You're stronger than you think. With focus on ${performance.weakTopics[0]}, you'll see improvement quickly!`,
                difficultyLevel: 'intermediate'
            });
        }

        // Save goals
        await prisma.studentGoal.createMany({
            data: goalsData
        });

        // Fetch back
        const weekEnd = getNextWeekEnd();
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 7);

        const savedGoals = await prisma.studentGoal.findMany({
            where: {
                userId: userId,
                goalType: 'weekly',
                dueDate: { gte: weekStart, lte: weekEnd }
            }
        });

        console.log(`✅ Generated ${savedGoals.length} weekly goals for user ${userId}`);
        return savedGoals;
    } catch (error) {
        console.error('Error generating weekly goals:', error);
        return [];
    }
};

/**
 * Determine difficulty level based on current performance
 */
const calculateDifficultyLevel = (performance: any): 'beginner' | 'intermediate' | 'advanced' => {
    if (!performance) return 'intermediate';

    const accuracy = performance.overallAccuracy || 0;

    if (accuracy < 50) return 'beginner';
    if (accuracy < 75) return 'intermediate';
    return 'advanced';
};

/**
 * Get weak area suggestion for goal description
 */
const getWeakAreaSuggestion = (performance: any): string => {
    if (!performance || !performance.weakTopics || performance.weakTopics.length === 0) {
        return 'Focus on areas you find challenging.';
    }
    return `Priority: Review ${performance.weakTopics[0]} to strengthen weak areas.`;
};

/**
 * Get topic accuracy from performance
 */
const getTopicAccuracy = (performance: any, topic: string): number => {
    if (!performance) return 0;
    return Math.round(performance.overallAccuracy || 0);
};

/**
 * Get next Sunday (for weekly goal due date)
 */
const getNextWeekEnd = (): Date => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
    const nextSunday = new Date(today);
    nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
    nextSunday.setHours(23, 59, 59, 999);
    return nextSunday;
};

/**
 * Update goal progress
 */
export const updateGoalProgress = async (
    goalId: string,
    progressIncrement: number
): Promise<any | null> => {
    try {
        const goal = await prisma.studentGoal.findUnique({
            where: { id: goalId }
        });
        if (!goal) return null;

        const newProgress = Math.min(goal.currentProgress + progressIncrement, goal.targetValue);
        const newStatus = newProgress >= goal.targetValue ? 'completed' : goal.status;
        const completedDate = newProgress >= goal.targetValue ? new Date() : goal.completedDate;

        const updatedGoal = await prisma.studentGoal.update({
            where: { id: goalId },
            data: {
                currentProgress: newProgress,
                status: newStatus,
                completedDate: completedDate
            }
        });

        return updatedGoal;
    } catch (error) {
        console.error('Error updating goal progress:', error);
        return null;
    }
};

/**
 * Get motivational message for student based on performance
 */
export const getMotivationalMessage = (performance: any, goalType: string): string => {
    const messages: Record<string, string[]> = {
        high_performance: [
            "You're crushing it! Keep up the amazing work! 🚀",
            "Outstanding performance! You're on your way to excellence! 💪",
            "Incredible dedication! You're destined for success! 🌟"
        ],
        medium_performance: [
            "Great effort! You're making solid progress. Keep pushing! 💪",
            "You're on the right track. Keep the momentum going! 🎯",
            "Well done! A little more effort and you'll reach your goals! 📈"
        ],
        low_performance: [
            "Every master was once a beginner. You've got this! 🌱",
            "Don't worry, improvement comes with practice. You're doing great! 📚",
            "You're building strong foundations. Keep learning! 🔨"
        ]
    };

    let performanceLevel = 'medium_performance';
    if (performance && performance.overallAccuracy > 80) {
        performanceLevel = 'high_performance';
    } else if (performance && performance.overallAccuracy < 50) {
        performanceLevel = 'low_performance';
    }

    const messageArray = messages[performanceLevel];
    return messageArray[Math.floor(Math.random() * messageArray.length)];
};
