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
exports.updateOnboarding = void 0;
const prismaClient_1 = __importDefault(require("../config/prismaClient"));
// @desc    Update user personalization (Onboarding)
// @route   POST /api/onboarding
// @access  Private
const updateOnboarding = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { gender, age, preferredStudyMode, audioOrText, breakDuration, dailyHours, readerType, school, department, level, courses } = req.body;
        const userId = req.user.id;
        // Construct update data object dynamically
        const updateData = {};
        if (gender)
            updateData.gender = gender;
        if (age)
            updateData.age = Number(age);
        if (preferredStudyMode)
            updateData.studyPreference = preferredStudyMode;
        if (audioOrText)
            updateData.audioOrText = audioOrText;
        if (breakDuration)
            updateData.readDuration = breakDuration;
        if (dailyHours)
            updateData.studyHours = dailyHours;
        if (readerType)
            updateData.dayOrNight = readerType;
        if (school)
            updateData.school = school;
        if (department)
            updateData.department = department;
        if (level)
            updateData.level = Number(level);
        if (courses)
            updateData.courses = courses;
        const updatedUser = yield prismaClient_1.default.user.update({
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
    }
    catch (error) {
        console.error('Onboarding update error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.updateOnboarding = updateOnboarding;
