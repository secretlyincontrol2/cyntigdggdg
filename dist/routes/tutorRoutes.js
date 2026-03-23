"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tutorController_1 = require("../controllers/tutorController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Study session routes
router.post('/study-session/start', authMiddleware_1.protect, tutorController_1.startStudySession);
router.post('/study-session/end', authMiddleware_1.protect, tutorController_1.endStudySession);
router.get('/sessions', authMiddleware_1.protect, tutorController_1.getSessionHistory);
// Q&A routes
router.post('/study', authMiddleware_1.protect, tutorController_1.askStudyQuestion);
router.post('/explain', authMiddleware_1.protect, tutorController_1.requestExplanation);
router.post('/audio-question', authMiddleware_1.protect, tutorController_1.askAudioQuestion);
exports.default = router;
