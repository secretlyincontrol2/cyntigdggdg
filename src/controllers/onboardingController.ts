import { Request, Response } from 'express';
import prisma from '../config/prismaClient';

// @desc    Update user personalization (Onboarding)
// @route   POST /api/onboarding
// @access  Private
export const updateOnboarding = async (req: Request, res: Response) => {
    try {
        const {
            gender,
            age,
            preferredStudyMode,
            audioOrText,
            breakDuration,
            dailyHours,
            readerType,
            school,
            department,
            level,
            courses
        } = req.body;

        const userId = req.user.id;

        // Construct update data object dynamically
        const updateData: any = {};
        if (gender) updateData.gender = gender;
        if (age) updateData.age = Number(age);
        if (preferredStudyMode) updateData.studyPreference = preferredStudyMode;
        if (audioOrText) updateData.audioOrText = audioOrText;
        if (breakDuration) updateData.readDuration = breakDuration;
        if (dailyHours) updateData.studyHours = dailyHours;
        if (readerType) updateData.dayOrNight = readerType;
        if (school) updateData.school = school;
        if (department) updateData.department = department;
        if (level) updateData.level = Number(level);
        if (courses) updateData.courses = courses;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        res.json({
            _id: updatedUser.id,
            name: `${updatedUser.firstname} ${updatedUser.lastname}`,
            email: updatedUser.schoolEmail,
            studyPreference: updatedUser.studyPreference,
            isOnboarded: true
        });
    } catch (error) {
        console.error('Onboarding update error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
