import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    // Basics
    lastname: string;
    firstname: string;
    middlename?: string;
    matricNumber: string;
    schoolEmail: string;
    password?: string; // Optional because we might exclude it in queries

    // Personalization
    gender: string;
    age: number;
    studyPreference: 'visual' | 'audio' | 'text' | 'mixed';
    audioOrText?: 'audio' | 'text';
    readDuration: string;
    studyHours: string;
    dayOrNight: 'day' | 'night' | 'both';

    // Academic
    school: string;
    department: string;
    level: number;
    courses: string[];

    // Gamification
    points: number;
    studyHoursTotal: number;
    goals: string[];
}

const UserSchema: Schema = new Schema({
    lastname: { type: String, required: true },
    firstname: { type: String, required: true },
    middlename: { type: String },
    matricNumber: { type: String, required: true, unique: true },
    schoolEmail: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    gender: { type: String },
    age: { type: Number },
    studyPreference: { type: String, enum: ['visual', 'audio', 'text', 'mixed'], default: 'text' },
    audioOrText: { type: String, enum: ['audio', 'text'] },
    readDuration: { type: String },
    studyHours: { type: String },
    dayOrNight: { type: String, enum: ['day', 'night', 'both'], default: 'day' },

    school: { type: String },
    department: { type: String },
    level: { type: Number },
    courses: [{ type: String }],

    points: { type: Number, default: 0 },
    studyHoursTotal: { type: Number, default: 0 },
    goals: [{ type: String }],
}, {
    timestamps: true,
});

export default mongoose.model<IUser>('User', UserSchema);
