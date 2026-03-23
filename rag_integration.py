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


class RAGTutor:
    """
    Core RAG (Retrieval-Augmented Generation) tutor.

    How RAG works in this system:
    1. Student asks a question (e.g., "Explain binary search")
    2. ChromaDB searches the vector database for the most relevant
       chunks of lecturer notes / past questions
    3. Those chunks are passed as CONTEXT to Gemini Flash Lite
    4. Gemini generates a response grounded in the actual course materials

    This means the AI doesn't just make things up — it uses YOUR
    lecturer's notes to give accurate, course-specific answers.
    """

    def __init__(self, chroma_db_path=None, env_path=None):
        """
        Initialize the RAG tutor.

        Args:
            chroma_db_path: Path to your ChromaDB directory.
                            Defaults to ./chroma_db
            env_path:       Path to your .env file.
                            Defaults to ./.env
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

        # ── Load the collection ─────────────────────────────────────
        collections = self.chroma_client.list_collections()
        if not collections:
            raise ValueError(
                "❌ No collections found in ChromaDB!\n"
                "   Run your Colab notebook first to build the vector database."
            )

        # Use the first available collection (usually "babcock_courses")
        self.collection = collections[0]
        doc_count = self.collection.count()
        print(f"✅ Collection loaded: '{self.collection.name}' "
              f"({doc_count:,} chunks)")
        print(f"{'═' * 50}")
        print("🎓 RAG Tutor is ready!\n")

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

        Args:
            department:    e.g., "Computer Science"
            course:        e.g., "CSC101"
            topic:         e.g., "Data Structures"
            num_questions: How many questions to generate (default 5)
            difficulty:    "easy", "medium", or "hard"

        Returns:
            str: Formatted practice questions with answers
        """
        # Step 1 — Retrieve relevant materials (bias toward past questions)
        search_query = f"{course} {topic} questions examination test"
        context, source_files = self._retrieve(
            search_query, course=course, n_results=6
        )

        # Step 2 — Build the prompt
        difficulty_desc = {
            "easy": "basic recall and understanding questions suitable for beginners",
            "medium": "application and analysis questions that test deeper understanding",
            "hard": "synthesis and evaluation questions that challenge advanced students",
        }

        mcq_count = num_questions // 2
        short_count = num_questions - mcq_count

        prompt = f"""You are an AI tutor creating practice questions for a {course} student
in the {department} department at Babcock University.

COURSE MATERIALS AND PAST QUESTIONS:
{context}

Generate exactly {num_questions} practice questions on "{topic}".
Difficulty level: {difficulty} — {difficulty_desc.get(difficulty, difficulty_desc['medium'])}

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

**Question 1** (Multiple Choice)
[Question text]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]

**Correct Answer:** [Letter]
**Explanation:** [Why this is correct, referencing course materials]

---

**Question 2** (Short Answer)
[Question text]

**Expected Answer:** [The answer]
**Explanation:** [Additional context]

---

RULES:
1. Mix question types: {mcq_count} multiple choice, {short_count} short answer
2. Base questions on the provided course materials where possible
3. Make questions relevant to the Nigerian university context
4. Include clear explanations for each answer
5. Questions should test understanding, not just memorization"""

        # Step 3 — Call Gemini
        response = self.model.generate_content(prompt)
        answer = response.text

        # Step 4 — Print results
        print(f"\n📝 PRACTICE MODE — {course}: {topic}")
        print(f"📎 Based on: {', '.join(source_files) if source_files else 'General knowledge'}")
        print(f"🎯 Difficulty: {difficulty} | Questions: {num_questions}")
        print("═" * 60)
        print(answer)
        print("═" * 60)

        return answer

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
