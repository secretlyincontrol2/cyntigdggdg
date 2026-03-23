import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface RAGContext {
    chunks: string[];
    sourceDocs: string[];
}

interface TutorResponse {
    answer: string;
    sources: string[];
    explanation?: string;
    relatedTopics?: string[];
}

/**
 * Initialize RAG vector database (simulated with JSON for now)
 * In production, you would use ChromaDB or similar
 */
let vectorDatabase: Map<string, string[]> = new Map();

export const initializeRAG = async () => {
    try {
        const vectorPath = process.env.RAG_VECTOR_DB_PATH || './data/vectors';
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(vectorPath)) {
            fs.mkdirSync(vectorPath, { recursive: true });
        }

        // Load vectors from stored JSON (simulated vector storage)
        const vectorFile = path.join(vectorPath, 'vectors.json');
        if (fs.existsSync(vectorFile)) {
            const data = JSON.parse(fs.readFileSync(vectorFile, 'utf-8'));
            vectorDatabase = new Map(Object.entries(data));
            console.log('✅ RAG vector database initialized');
        } else {
            console.log('⚠️ No vector database found. Start by uploading lecture notes.');
        }
    } catch (error) {
        console.error('❌ Error initializing RAG:', error);
    }
};

/**
 * Retrieve relevant context chunks from vector database
 * This is a simplified retrieval - in production use semantic similarity
 */
export const retrieveContext = (query: string, topK: number = 5): RAGContext => {
    try {
        const queryLower = query.toLowerCase();
        const relevantChunks: { chunk: string; source: string; score: number }[] = [];

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
    } catch (error) {
        console.error('Error retrieving context:', error);
        return { chunks: [], sourceDocs: [] };
    }
};

/**
 * Generate response using Gemini with RAG context
 */
export const generateTutorResponse = async (
    question: string,
    studentName: string,
    communicationMode: 'formal' | 'casual' | 'friendly' = 'formal',
    courseContext?: string,
    ragContext?: RAGContext
): Promise<TutorResponse> => {
    try {
        // Retrieve context if not provided
        const context = ragContext || retrieveContext(question);

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

        const result = await model.generateContent(augmentedPrompt);
        const response = result.response;
        const answer = response.text();

        // Extract related topics (using simple keyword extraction)
        const relatedTopics = extractTopics(answer);

        return {
            answer: answer,
            sources: context.sourceDocs,
            relatedTopics: relatedTopics
        };
    } catch (error) {
        console.error('Error generating tutor response:', error);
        return {
            answer: 'I encountered an error while processing your question. Please try again.',
            sources: []
        };
    }
};

/**
 * Generate explanation for a difficult concept
 */
export const generateExplanation = async (
    concept: string,
    studentName: string,
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
    communicationMode: 'formal' | 'casual' | 'friendly' = 'formal'
): Promise<TutorResponse> => {
    try {
        const context = retrieveContext(concept);

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

        const result = await model.generateContent(prompt);
        const answer = result.response.text();

        return {
            answer: answer,
            sources: context.sourceDocs,
            explanation: answer
        };
    } catch (error) {
        console.error('Error generating explanation:', error);
        return {
            answer: 'Unable to generate explanation at this time.',
            sources: []
        };
    }
};

/**
 * Simple topic extraction from text
 */
const extractTopics = (text: string): string[] => {
    const topics: string[] = [];
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
export const addVectorData = async (
    courseId: string,
    documentTitle: string,
    chunks: string[]
): Promise<boolean> => {
    try {
        const key = `${courseId}_${documentTitle}`;
        vectorDatabase.set(key, chunks);

        // Save to file
        const vectorPath = process.env.RAG_VECTOR_DB_PATH || './data/vectors';
        const vectorFile = path.join(vectorPath, 'vectors.json');

        const data = Object.fromEntries(vectorDatabase);
        fs.writeFileSync(vectorFile, JSON.stringify(data, null, 2));

        console.log(`✅ Added vectors for ${documentTitle}`);
        return true;
    } catch (error) {
        console.error('Error adding vector data:', error);
        return false;
    }
};

/**
 * Clear all vector data (for testing)
 */
export const clearVectorDatabase = (): boolean => {
    try {
        vectorDatabase.clear();
        const vectorPath = process.env.RAG_VECTOR_DB_PATH || './data/vectors';
        const vectorFile = path.join(vectorPath, 'vectors.json');
        
        if (fs.existsSync(vectorFile)) {
            fs.unlinkSync(vectorFile);
        }

        console.log('✅ Vector database cleared');
        return true;
    } catch (error) {
        console.error('Error clearing vector database:', error);
        return false;
    }
};
