"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const PerformanceMetricSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    dateRecorded: { type: Date, default: Date.now },
    courseId: { type: String, required: true },
    courseName: { type: String, required: true },
    totalStudyMinutes: { type: Number, default: 0 },
    studySessions: { type: Number, default: 0 },
    averageSessionDuration: { type: Number, default: 0 },
    totalQuestionsAttempted: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    incorrectAnswers: { type: Number, default: 0 },
    overallAccuracy: { type: Number, default: 0 },
    performanceScore: { type: Number, default: 0 },
    consistencyScore: { type: Number, default: 0 },
    growthScore: { type: Number, default: 0 },
    leaderboardPoints: { type: Number, default: 0 },
    strongTopics: [{ type: String }],
    weakTopics: [{ type: String }],
    classRank: { type: Number },
    percentileRank: { type: Number },
    currentStudyStreak: { type: Number, default: 0 },
    maxStudyStreak: { type: Number, default: 0 },
}, {
    timestamps: true,
});
exports.default = mongoose_1.default.model('PerformanceMetric', PerformanceMetricSchema);
