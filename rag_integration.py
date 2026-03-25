"""
===========================================================================
 BUPT AI TUTORING SYSTEM — RAG INTEGRATION MODULE
===========================================================================
 Connects your ChromaDB vector database to Gemini Flash Lite for:
   - Study sessions (topic explanations from course materials)
   - Practice sessions (AI-generated questions with answers)
   - General Q&A chat

 USAGE:
   from rag_integration import RAGTutor
   tutor = RAGTutor()
   tutor.study_topic("Computer Science", "CSC101", "Binary Search")

 REQUIREMENTS:
   pip install google-generativeai chromadb python-dotenv
===========================================================================
"""

import os
import chromadb
import google.generativeai as genai
from dotenv import load_dotenv
from chromadb.utils.embedding_functions import GoogleGenerativeAiEmbeddingFunction


class RAGTutor:
    """
    Core RAG (Retrieval-Augmented Generation) tutor.
    """

    def __init__(self, chroma_db_path=None, env_path=None):
        """
        Initialize the RAG tutor.
        """
        # ── Load environment variables ──────────────────────────────
        env_file = env_path or os.path.join(os.path.dirname(__file__), ".env")
        load_dotenv(env_file)

        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")

        if not self.api_key:
            raise ValueError(
                "❌ GEMINI_API_KEY not found!\n"
                "   Set it in your .env file:\n"
                "   GEMINI_API_KEY=your_key_here"
            )

        # ── Connect to Gemini ───────────────────────────────────────
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(self.model_name)
        print(f"✅ Gemini model loaded: {self.model_name}")

        # ── Initialize Embedding Function (API-based, 0 local RAM) ──
        # This prevents the server from loading local SentenceTransformer models
        # which would exceed Render's 512MB RAM limit.
        self.embedding_function = GoogleGenerativeAiEmbeddingFunction(
            api_key=self.api_key
        )

        # ── Connect to Chroma Cloud ─────────────────────────────────
        cloud_api_key = os.getenv("CHROMA_API_KEY")
        cloud_tenant = os.getenv("CHROMA_TENANT")
        cloud_database = os.getenv("CHROMA_DATABASE")

        if cloud_api_key and cloud_tenant and cloud_database:
            print(f"☁️ Connecting to Chroma Cloud: {cloud_database}...")
            self.chroma_client = chromadb.CloudClient(
                api_key=cloud_api_key,
                tenant=cloud_tenant,
                database=cloud_database
            )
        else:
            # Fallback to local if cloud keys are missing
            db_path = chroma_db_path or os.path.join(
                os.path.dirname(__file__), "chroma_db"
            )
            print(f"🏠 No Cloud keys found, using local ChromaDB at: {db_path}")
            self.chroma_client = chromadb.PersistentClient(path=db_path)

        # ── Load or Create the collection ───────────────────────────
        try:
            # We use get_or_create_collection to ensure the embedding function is attached
            self.collection = self.chroma_client.get_or_create_collection(
                name="babcock_courses",
                embedding_function=self.embedding_function
            )
        except Exception as e:
            print(f"⚠️ Collection error: {e}. Falling back to default list.")
            collections = self.chroma_client.list_collections()
            if not collections:
                self.collection = self.chroma_client.create_collection(
                    name="babcock_courses",
                    embedding_function=self.embedding_function
                )
            else:
                self.collection = collections[0]
            
        doc_count = self.collection.count()
        print(f"✅ Collection active: '{self.collection.name}' "
              f"({doc_count:,} chunks)")
        print(f"{'═' * 50}")
        print("🎓 RAG Tutor is ready (Memory Optimized)!\n")

    # ─────────────────────────────────────────────────────────────
    # UTILITY: Retrieve relevant chunks from the vector DB
    # ─────────────────────────────────────────────────────────────

    def _retrieve(self, query, course=None, n_results=5):
        """
        Search ChromaDB for the most relevant document chunks.

        Args:
            query:     The search query string
            course:    Optional course filter (e.g., "CSC101")
            n_results: Number of chunks to retrieve (default 5)

        Returns:
            tuple: (context_text, source_files)
        """
        where_filter = {"course": course} if course else None

        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where_filter,
            )
        except Exception:
            # If the course filter fails (e.g., metadata key doesn't exist),
            # retry without it
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
            )

        if results["documents"] and results["documents"][0]:
            chunks = results["documents"][0]
            metadatas = results["metadatas"][0]
            context = "\n\n---\n\n".join(chunks)
            source_files = list(
                set(m.get("filename", "unknown") for m in metadatas)
            )
            return context, source_files
        else:
            return "No relevant course materials found.", []

    # ─────────────────────────────────────────────────────────────
    # STUDY MODE
    # ─────────────────────────────────────────────────────────────

    def study_topic(self, department, course, topic, detail_level="detailed"):
        """
        STUDY MODE: Explain a topic using the course materials.

        Args:
            department:   e.g., "Computer Science"
            course:       e.g., "CSC101"
            topic:        e.g., "Binary Search Trees"
            detail_level: "brief", "detailed", or "eli5"

        Returns:
            str: The AI tutor's explanation
        """
        # Step 1 — Retrieve relevant chunks
        search_query = f"{course} {topic}"
        context, source_files = self._retrieve(search_query, course=course)

        # Step 2 — Build the prompt
        detail_instructions = {
            "brief": "Give a concise summary in 3-5 bullet points.",
            "detailed": (
                "Provide a thorough explanation with examples, "
                "step-by-step breakdowns, and key definitions."
            ),
            "eli5": (
                "Explain this as simply as possible, like you're explaining "
                "to a complete beginner. Use everyday analogies."
            ),
        }

        prompt = f"""You are an expert AI tutor at Babcock University, helping a student 
study {course} in the {department} department.

IMPORTANT RULES:
1. Base your explanations on the provided course materials below
2. If the materials don't cover the topic, supplement with your general knowledge but mention this
3. Be encouraging and supportive — this is a student learning
4. Use clear formatting with headers, bullet points, and numbered steps
5. Include practical examples relevant to Nigerian students where possible

COURSE MATERIALS (from lecturer's notes):
{context}

STUDENT'S REQUEST: Please explain "{topic}"

INSTRUCTION: {detail_instructions.get(detail_level, detail_instructions['detailed'])}

At the end, suggest 2-3 related topics the student should study next."""

        # Step 3 — Call Gemini
        response = self.model.generate_content(prompt)
        answer = response.text

        # Step 4 — Print results
        print(f"\n📚 STUDY MODE — {course}: {topic}")
        print(f"📎 Sources: {', '.join(source_files) if source_files else 'General knowledge'}")
        print("═" * 60)
        print(answer)
        print("═" * 60)

        return answer

    # ─────────────────────────────────────────────────────────────
    # PRACTICE MODE
    # ─────────────────────────────────────────────────────────────

    def generate_practice_questions(
        self, department, course, topic, num_questions=5, difficulty="medium"
    ):
        """
        PRACTICE MODE: Generate practice questions from course materials.
        """
        # Step 1 — Retrieve relevant materials
        search_query = f"{course} {topic} questions examination test"
        context, source_files = self._retrieve(
            search_query, course=course, n_results=6
        )

        # Step 2 — Build the prompt
        difficulty_desc = {
            "easy": "basic recall and understanding",
            "medium": "application and analysis",
            "hard": "synthesis and evaluation",
        }

        prompt = f"""You are an AI tutor creating practice questions for a {course} student
in the {department} department at Babcock University.

COURSE MATERIALS AND PAST QUESTIONS:
{context}

Generate exactly {num_questions} practice questions on "{topic}".
Difficulty level: {difficulty} — {difficulty_desc.get(difficulty, 'medium')}

YOU MUST RESPOND ONLY WITH A VALID JSON ARRAY OF OBJECTS.
Each object must have:
- "id": (int)
- "type": "multiple_choice" or "short_answer"
- "question": (string, use markdown)
- "options": (array of 4 strings for Multiple Choice, null for Short Answer)
- "correctAnswer": (string, the correct option letter for MCQ, or full answer for Short Answer)
- "explanation": (string, markdown)
- "diagram": (string, optional, an ASCII or text-based diagram if relevant to the question)
- "imageUrl": (string, optional, use "https://pollinations.ai/p/<Descriptive_Image_Prompt>?width=800&height=600&model=turbo" to generate a real AI image related to the question topic. Replace <Descriptive_Image_Prompt> with a specific URL-encoded prompt like "diagram_of_photosynthesis" or "logic_gate_circuit".)

Example JSON:
[
  {{
    "id": 1,
    "type": "multiple_choice",
    "question": "What is 2+2?",
    "options": ["A) 3", "B) 4", "C) 5", "D) 6"],
    "correctAnswer": "B) 4",
    "explanation": "2 plus 2 equals 4 based on basic arithmetic.",
    "diagram": null,
    "imageUrl": null
  }}
]"""

        # Step 3 — Call Gemini with JSON Mode
        response = self.model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        return response.text

    def verify_practice_answer(self, question: str, student_answer: str, expected_answer: str) -> dict:
        """Evaluates a student's short answer using AI."""
        prompt = f"""Evaluate this student's answer for correctness.
        
QUESTION: {question}
EXPECTED KEY POINTS: {expected_answer}
STUDENT'S ANSWER: {student_answer}

Respond ONLY with a JSON object:
{{
  "isCorrect": (boolean),
  "score": (number from 0 to 100),
  "feedback": (string, short and encouraging explanation)
}}"""
        response = self.model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        try:
            return json.loads(response.text)
        except:
            # Fallback
            is_correct = expected_answer.lower() in student_answer.lower()
            return {
                "isCorrect": is_correct,
                "score": 100 if is_correct else 0,
                "feedback": "Processed with fuzzy matching."
            }

    # ─────────────────────────────────────────────────────────────
    # FLASHCARDS MODE
    # ─────────────────────────────────────────────────────────────

    def generate_flashcards(self, department, course, topic, num_cards=5):
        """
        FLASHCARDS MODE: Generate active recall cards from course materials.
        """
        # Retrieve context
        search_query = f"{course} {topic} key concepts definitions"
        context, _ = self._retrieve(search_query, course=course, n_results=6)

        prompt = f"""You are an AI tutor creating flashcards for a {course} student
at Babcock University. 

COURSE MATERIALS:
{context}

Generate {num_cards} high-quality flashcards for "{topic}".
Focus on key definitions, concepts, and relationships.

YOU MUST RESPOND ONLY WITH A VALID JSON ARRAY OF OBJECTS.
Each object must have:
- "question": (string, the front of the card, markdown)
- "answer": (string, the back of the card, markdown)
- "topic": "{topic}"
- "difficulty": "easy", "medium", or "hard"

Respond with ONLY the JSON array."""

        response = self.model.generate_content(prompt)
        return response.text

    # ─────────────────────────────────────────────────────────────
    # GENERAL CHAT
    # ─────────────────────────────────────────────────────────────

    def chat(self, course, question):
        """
        General Q&A: Ask any question and get an answer grounded in
        the course materials.

        Args:
            course:   e.g., "CSC101"
            question: The student's question

        Returns:
            str: The AI tutor's response
        """
        context, source_files = self._retrieve(question, course=course)

        prompt = f"""You are a helpful AI tutor at Babcock University.

A student studying {course} asks:
"{question}"

Use these course materials to answer:
{context}

RULES:
1. Answer clearly and accurately based on the materials
2. If the materials don't cover the question, use general knowledge but say so
3. Be encouraging and supportive
4. Keep your answer focused and well-structured"""

        response = self.model.generate_content(prompt)
        answer = response.text

        print(f"\n💬 CHAT — {course}")
        print(f"📎 Sources: {', '.join(source_files) if source_files else 'General knowledge'}")
        print("═" * 60)
        print(answer)
        print("═" * 60)

        return answer

    # ─────────────────────────────────────────────────────────────
    # INFO
    # ─────────────────────────────────────────────────────────────

    def list_collections(self):
        """List all collections in the vector database."""
        collections = self.chroma_client.list_collections()
        print(f"\n📦 Collections in ChromaDB ({len(collections)} found):")
        for col in collections:
            count = col.count()
            print(f"   • {col.name}: {count:,} chunks")
        return collections

    def get_db_stats(self):
        """Print summary statistics about the vector database."""
        count = self.collection.count()
        # Peek at a few entries to show metadata structure
        sample = self.collection.peek(limit=3)

        print(f"\n📊 Database Statistics:")
        print(f"   Collection: {self.collection.name}")
        print(f"   Total chunks: {count:,}")

        if sample["metadatas"]:
            # Extract unique courses and departments from the sample
            courses = set()
            departments = set()
            for meta in sample["metadatas"]:
                if "course" in meta:
                    courses.add(meta["course"])
                if "department" in meta:
                    departments.add(meta["department"])
            if departments:
                print(f"   Sample departments: {', '.join(departments)}")
            if courses:
                print(f"   Sample courses: {', '.join(courses)}")
            print(f"   Metadata keys: {list(sample['metadatas'][0].keys())}")

        return {"collection": self.collection.name, "chunks": count}


# ═══════════════════════════════════════════════════════════════
# Quick test when run directly
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🚀 Initializing RAG Tutor...\n")
    tutor = RAGTutor()
    tutor.get_db_stats()
    print("\n✅ RAG module is working. Import it in your test scripts:")
    print('   from rag_integration import RAGTutor')
    print('   tutor = RAGTutor()')
    print('   tutor.study_topic("Computer Science", "CSC101", "your topic")')
