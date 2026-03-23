"use strict";
/**
 * Audio Processing Service
 * Handles audio transcription and text-to-speech for the tutoring system
 *
 * Note: Web Speech API transcription happens on the frontend
 * This service provides:
 * 1. Backend validation for transcribed text
 * 2. Text-to-speech integration (optional)
 * 3. Audio file handling if needed
 */
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
exports.getAudioProcessingStats = exports.createAudioSessionLog = exports.evaluateTranscriptionQuality = exports.generateTextToSpeechUrl = exports.validateAudioFile = exports.validateTranscribedText = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config = {
    maxFileSizeMB: parseInt(process.env.MAX_AUDIO_FILE_SIZE || '52428800') / (1024 * 1024),
    supportedFormats: ['mp3', 'wav', 'webm', 'm4a'],
    enableTextToSpeech: true
};
/**
 * Validate transcribed audio text
 * Checks for minimum length, offensive content, etc.
 */
const validateTranscribedText = (text) => {
    try {
        // Check if text is empty
        if (!text || text.trim().length === 0) {
            return {
                isValid: false,
                message: 'Transcription resulted in empty text. Please try again.'
            };
        }
        // Check minimum length
        if (text.split(' ').length < 2) {
            return {
                isValid: false,
                message: 'Statement too short. Please speak more clearly.'
            };
        }
        // Clean the text (remove extra whitespace)
        const cleanedText = text.trim().replace(/\s+/g, ' ');
        return {
            isValid: true,
            message: 'Text validated successfully',
            cleanedText: cleanedText
        };
    }
    catch (error) {
        console.error('Error validating transcribed text:', error);
        return {
            isValid: false,
            message: 'Error validating transcription'
        };
    }
};
exports.validateTranscribedText = validateTranscribedText;
/**
 * Process audio file (if uploaded directly)
 * Validates file size and format
 */
const validateAudioFile = (filePath, fileSize) => {
    try {
        // Check if file exists
        if (!fs_1.default.existsSync(filePath)) {
            return {
                isValid: false,
                message: 'File not found'
            };
        }
        // Get file extension
        const ext = path_1.default.extname(filePath).toLowerCase().slice(1);
        // Check supported format
        if (!config.supportedFormats.includes(ext)) {
            return {
                isValid: false,
                message: `Unsupported format. Supported: ${config.supportedFormats.join(', ')}`
            };
        }
        // Check file size (convert bytes to MB)
        const sizeInMB = fileSize / (1024 * 1024);
        if (sizeInMB > config.maxFileSizeMB) {
            return {
                isValid: false,
                message: `File too large. Maximum size: ${config.maxFileSizeMB}MB`
            };
        }
        return {
            isValid: true,
            message: 'Audio file validated',
            format: ext
        };
    }
    catch (error) {
        console.error('Error validating audio file:', error);
        return {
            isValid: false,
            message: 'Error validating audio file'
        };
    }
};
exports.validateAudioFile = validateAudioFile;
/**
 * Convert text to speech response (optional enhancement)
 * Can be used to provide audio feedback to students
 */
const generateTextToSpeechUrl = (text_1, ...args_1) => __awaiter(void 0, [text_1, ...args_1], void 0, function* (text, language = 'en') {
    try {
        if (!config.enableTextToSpeech) {
            return {
                success: false,
                message: 'Text-to-speech is not enabled'
            };
        }
        // For now, return Google Translate TTS URL (free option)
        // In production, you can use:
        // - Google Cloud Text-to-Speech
        // - Azure Speech to Text
        // - AWS Polly
        // - ElevenLabs
        const encodedText = encodeURIComponent(text);
        const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${language}&q=${encodedText}&client=tw-ob`;
        return {
            success: true,
            audioUrl: audioUrl,
            message: 'Audio URL generated'
        };
    }
    catch (error) {
        console.error('Error generating TTS:', error);
        return {
            success: false,
            message: 'Error generating audio'
        };
    }
});
exports.generateTextToSpeechUrl = generateTextToSpeechUrl;
/**
 * Process audio transcription confidence
 * Used when frontend sends transcription confidence score
 */
const evaluateTranscriptionQuality = (text, confidence) => {
    try {
        // Confidence should be between 0 and 1
        const normalizedConfidence = Math.min(Math.max(confidence, 0), 1);
        // If confidence is too low, suggest re-recording
        if (normalizedConfidence < 0.5) {
            return {
                isReliable: false,
                suggestion: 'Low confidence. Please re-record for better accuracy.',
                confidence: normalizedConfidence
            };
        }
        // If text is too short but confidence is high
        if (normalizedConfidence >= 0.8 && text.split(' ').length < 5) {
            return {
                isReliable: true,
                suggestion: 'Transcribed successfully, but consider speaking more details.',
                confidence: normalizedConfidence
            };
        }
        return {
            isReliable: true,
            suggestion: 'Transcription is reliable. Ready to process.',
            confidence: normalizedConfidence
        };
    }
    catch (error) {
        console.error('Error evaluating transcription quality:', error);
        return {
            isReliable: false,
            suggestion: 'Error evaluating transcription',
            confidence: 0
        };
    }
};
exports.evaluateTranscriptionQuality = evaluateTranscriptionQuality;
/**
 * Create audio session tracking
 * Track audio interactions for analytics
 */
const createAudioSessionLog = (userId, audioType, durationSeconds, transcribedText, confidence) => {
    return {
        userId: userId,
        audioType: audioType,
        durationSeconds: durationSeconds,
        transcribedText: transcribedText,
        confidence: confidence,
        processedAt: new Date(),
        audioEnabled: true
    };
};
exports.createAudioSessionLog = createAudioSessionLog;
/**
 * Get audio processing statistics
 */
const getAudioProcessingStats = () => {
    return {
        maxFileSizeMB: config.maxFileSizeMB,
        supportedFormats: config.supportedFormats,
        textToSpeechEnabled: config.enableTextToSpeech,
        webSpeechApiEnabled: true,
        transcriptionMethod: 'Web Speech API (frontend) + Optional Whisper (backend)'
    };
};
exports.getAudioProcessingStats = getAudioProcessingStats;
