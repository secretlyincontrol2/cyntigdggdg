import { Request, Response } from 'express';
import User from '../models/User';

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
            // Academic fields might be sent here or in a separate step
            school,
            department,
            level,
            courses
        } = req.body;

        const user = await User.findById(req.user.id);

        if (user) {
            if (gender) user.gender = gender;
            if (age) user.age = Number(age);
            if (preferredStudyMode) user.studyPreference = preferredStudyMode;
            if (audioOrText) user.audioOrText = audioOrText;
            if (breakDuration) user.readDuration = breakDuration;
            if (dailyHours) user.studyHours = dailyHours;
            if (readerType) user.dayOrNight = readerType;

            // Academic info update if provided
            if (school) user.school = school;
            if (department) user.department = department;
            if (level) user.level = Number(level);
            if (courses) user.courses = courses;

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser.id,
                name: `${updatedUser.firstname} ${updatedUser.lastname}`,
                email: updatedUser.schoolEmail,
                studyPreference: updatedUser.studyPreference,
                isOnboarded: true
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
