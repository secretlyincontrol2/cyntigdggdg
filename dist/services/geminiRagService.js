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
exports.clearVectorDatabase = exports.addVectorData = exports.generateExplanation = exports.generateTutorResponse = exports.retrieveContext = exports.initializeRAG = void 0;
const generative_ai_1 = require("@google/generative-ai");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Initialize Gemini API
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
/**
 * Initialize RAG vector database (simulated with JSON for now)
 * In production, you would use ChromaDB or similar
 */
let vectorDatabase = new Map();
const initializeRAG = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const vectorPath = process.env.RAG_VECTOR_DB_PATH || './data/vectors';
        // Create directory if it doesn't exist
        if (!fs_1.default.existsSync(vectorPath)) {
            fs_1.default.mkdirSync(vectorPath, { recursive: true });
        }
        // Load vectors from stored JSON (simulated vector storage)
        const vectorFile = path_1.default.join(vectorPath, 'vectors.json');
        if (fs_1.default.existsSync(vectorFile)) {
            const data = JSON.parse(fs_1.default.readFileSync(vectorFile, 'utf-8'));
            vectorDatabase = new Map(Object.entries(data));
            console.log('✅ RAG vector database initialized');
        }
        else {
            console.log('⚠️ No vector database found. Start by uploading lecture notes.');
        }
    }
    catch (error) {
        console.error('❌ Error initializing RAG:', error);
    }
});
exports.initializeRAG = initializeRAG;
/**
 * Retrieve relevant context chunks from vector database
 * This is a simplified retrieval - in production use semantic similarity
 */
const retrieveContext = (query, topK = 5) => {
    try {
        const queryLower = query.toLowerCase();
        const relevantChunks = [];
        // Simple keyword matching (in production, use embeddings/semantic search)
        vectorDatabase.forEach((chunk, key) => {
            const chunkText = chunk.join(' ').toLowerCase();
            const queryWords = queryLower.split(' ');
            let matchScore = 0;
            queryWords.forEach(word => {
                if (word.length > 3 && chunkText.includes(word)) {
                    matchScore += 1;
                }
            });
            if (matchScore > 0) {
                relevantChunks.push({
                    chunk: chunk.join('\n'),
                    source: key,
                    score: matchScore
                });
            }
        });
        // Sort by relevance score and take top K
        const topChunks = relevantChunks
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
        return {
            chunks: topChunks.map(c => c.chunk),
            sourceDocs: topChunks.map(c => c.source)
        };
    }
    catch (error) {
        console.error('Error retrieving context:', error);
        return { chunks: [], sourceDocs: [] };
    }
};
exports.retrieveContext = retrieveContext;
/**
 * Generate response using Gemini with RAG context
 */
const generateTutorResponse = (question_1, studentName_1, ...args_1) => __awaiter(void 0, [question_1, studentName_1, ...args_1], void 0, function* (question, studentName, communicationMode = 'formal', courseContext, ragContext) {
    try {
        // Retrieve context if not provided
        const context = ragContext || (0, exports.retrieveContext)(question);
        // Build the system prompt based on communication mode
        let toneInstruction = '';
        switch (communicationMode) {
            case 'casual':
                toneInstruction = 'Respond in a casual, buddy-like tone. Use simple language and friendly expressions.';
                break;
            case 'friendly':
                toneInstruction = 'Respond as a friendly mentor. Use encouraging language and be supportive.';
                break;
            case 'formal':
            default:
                toneInstruction = 'Respond as a professional lecturer. Be clear, accurate, and educational.';
        }
        // Build augmented prompt with context
        let augmentedPrompt = `You are an AI tutor helping a student named ${studentName}.
${toneInstruction}

${courseContext ? `Course: ${courseContext}\n` : ''}

${context.chunks.length > 0 ? `Based on the lecture notes provided, answer the following question:\n\n${context.chunks.map((chunk, i) => `[Reference ${i + 1}]\n${chunk}`).join('\n\n')}\n\n` : ''}

Student's Question: "${question}"

Important Instructions:
1. If the answer is found in the provided lecture notes, use those as primary sources
2. If not found in lecture notes, you can use your general knowledge but mention this
3. Provide clear, easy-to-understand explanations
4. Include relevant examples when possible
5. Be encouraging and supportive
6. Keep the response concise but informative`;
        // Call Gemini API
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
        });
        const result = yield model.generateContent(augmentedPrompt);
        const response = result.response;
        const answer = response.text();
        // Extract related topics (using simple keyword extraction)
        const relatedTopics = extractTopics(answer);
        return {
            answer: answer,
            sources: context.sourceDocs,
            relatedTopics: relatedTopics
        };
    }
    catch (error) {
        console.error('Error generating tutor response:', error);
        return {
            answer: 'I encountered an error while processing your question. Please try again.',
            sources: []
        };
    }
});
exports.generateTutorResponse = generateTutorResponse;
/**
 * Generate explanation for a difficult concept
 */
const generateExplanation = (concept_1, studentName_1, ...args_1) => __awaiter(void 0, [concept_1, studentName_1, ...args_1], void 0, function* (concept, studentName, difficultyLevel = 'intermediate', communicationMode = 'formal') {
    try {
        const context = (0, exports.retrieveContext)(concept);
        let levelInstruction = '';
        switch (difficultyLevel) {
            case 'beginner':
                levelInstruction = 'Explain this in the simplest way possible, as if to someone with no background knowledge.';
                break;
            case 'advanced':
                levelInstruction = 'Provide a detailed, technical explanation with advanced concepts and edge cases.';
                break;
            case 'intermediate':
            default:
                levelInstruction = 'Provide a balanced explanation with appropriate technical depth.';
        }
        let toneInstruction = '';
        switch (communicationMode) {
            case 'casual':
                toneInstruction = 'Use casual, conversational language.';
                break;
            case 'friendly':
                toneInstruction = 'Use friendly, encouraging language like a supportive peer.';
                break;
            case 'formal':
            default:
                toneInstruction = 'Use professional, lecturer-like language.';
        }
        const prompt = `You are an AI tutor helping ${studentName} understand a difficult concept.
${toneInstruction}
${levelInstruction}

Concept to explain: "${concept}"

${context.chunks.length > 0 ? `Reference materials:\n${context.chunks.map((chunk, i) => `[Ref ${i + 1}] ${chunk}`).join('\n\n')}\n\n` : ''}

Please provide:
1. A clear definition or introduction
2. Step-by-step explanation
3. Real-world examples or analogies
4. Common misconceptions to avoid
5. Tips for remembering this concept`;
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
        });
        const result = yield model.generateContent(prompt);
        const answer = result.response.text();
        return {
            answer: answer,
            sources: context.sourceDocs,
            explanation: answer
        };
    }
    catch (error) {
        console.error('Error generating explanation:', error);
        return {
            answer: 'Unable to generate explanation at this time.',
            sources: []
        };
    }
});
exports.generateExplanation = generateExplanation;
/**
 * Simple topic extraction from text
 */
const extractTopics = (text) => {
    const topics = [];
    const commonTopics = [
        'algorithm', 'data structure', 'array', 'linked list', 'tree', 'graph',
        'sorting', 'searching', 'recursion', 'dynamic programming', 'greed',
        'binary', 'hash', 'stack', 'queue', 'heap', 'matrix', 'string'
    ];
    const textLower = text.toLowerCase();
    commonTopics.forEach(topic => {
        if (textLower.includes(topic) && topics.length < 5) {
            topics.push(topic.charAt(0).toUpperCase() + topic.slice(1));
        }
    });
    return topics;
};
/**
 * Add vector data to database (called when uploading lecture notes)
 */
const addVectorData = (courseId, documentTitle, chunks) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const key = `${courseId}_${documentTitle}`;
        vectorDatabase.set(key, chunks);
        // Save to file
        const vectorPath = process.env.RAG_VECTOR_DB_PATH || './data/vectors';
        const vectorFile = path_1.default.join(vectorPath, 'vectors.json');
        const data = Object.fromEntries(vectorDatabase);
        fs_1.default.writeFileSync(vectorFile, JSON.stringify(data, null, 2));
        console.log(`✅ Added vectors for ${documentTitle}`);
        return true;
    }
    catch (error) {
        console.error('Error adding vector data:', error);
        return false;
    }
});
exports.addVectorData = addVectorData;
/**
 * Clear all vector data (for testing)
 */
const clearVectorDatabase = () => {
    try {
        vectorDatabase.clear();
        const vectorPath = process.env.RAG_VECTOR_DB_PATH || './data/vectors';
        const vectorFile = path_1.default.join(vectorPath, 'vectors.json');
        if (fs_1.default.existsSync(vectorFile)) {
            fs_1.default.unlinkSync(vectorFile);
        }
        console.log('✅ Vector database cleared');
        return true;
    }
    catch (error) {
        console.error('Error clearing vector database:', error);
        return false;
    }
};
exports.clearVectorDatabase = clearVectorDatabase;
