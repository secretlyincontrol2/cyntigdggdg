"""
===========================================================================
 BUPT AI TUTORING SYSTEM — FASTAPI RAG SERVER
===========================================================================

 This replaces the Node.js ai-server.js with a Python FastAPI server
 that uses your ChromaDB vector database for RAG-powered responses.

 The frontend (ai-api.ts) already calls these endpoints on port 3002.
 No frontend changes needed.

 HOW TO RUN:
   cd Desktop/BUPT_backend
   pip install fastapi uvicorn python-multipart  # one-time
   python ai_server.py

 ENDPOINTS:
   GET  /api/ai/health          — Health check
   GET  /api/ai/courses         — List departments/courses
   POST /api/ai/study           — Study mode (RAG)
   POST /api/ai/practice        — Practice mode (RAG)
   POST /api/ai/chat            — Chat (RAG)
   POST /api/ai/tutor-note      — Tutor from pasted note text
   POST /api/ai/upload-note     — Upload PDF for tutoring
   GET  /api/ai/progress/{id}   — Get student progress
   POST /api/ai/progress/{id}   — Update student progress
===========================================================================
"""

import os
import json
import re
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# Import our RAG module
from rag_integration import RAGTutor

# ─────────────────────────────────────────────
#  Initialize FastAPI app
# ─────────────────────────────────────────────

app = FastAPI(title="BUPT AI Tutoring Server (RAG)")

# Allow the Next.js frontend (localhost:3000) to call this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
#  Initialize RAG Tutor (ChromaDB + Gemini)
# ─────────────────────────────────────────────

tutor: Optional[RAGTutor] = None


@app.on_event("startup")
def startup():
    """Load the RAG tutor when the server starts."""
    global tutor
    print("\n[STARTING] Starting BUPT AI RAG Server...")
    tutor = RAGTutor()


# ═══════════════════════════════════════════════════════════════
#  COURSE DATA
#  Matches the frontend course-selector.tsx dropdown.
# ═══════════════════════════════════════════════════════════════

COURSE_DATA = {
    "cs": {
        "name": "Computer Science",
        "courses": {
            "csc101": {"name": "CSC 101 Introduction to Computing", "topics": ["Introduction to Computers", "Number Systems", "Boolean Algebra", "Programming Basics", "Data Representation"]},
            "csc205": {"name": "CSC 205 Data Structures", "topics": ["Arrays and Linked Lists", "Stacks and Queues", "Trees and Graphs", "Sorting Algorithms", "Searching Algorithms"]},
            "csc207": {"name": "CSC 207 Computer Architecture", "topics": ["CPU Design", "Memory Hierarchy", "Instruction Sets", "Pipelining", "I/O Systems"]},
        },
    },
    "se": {
        "name": "Software Engineering",
        "courses": {
            "seng201": {"name": "SENG 201 Software Modelling", "topics": ["UML Diagrams", "Requirements Analysis", "Design Patterns", "System Architecture", "Use Cases"]},
            "seng203": {"name": "SENG 203 Web Engineering", "topics": ["HTML/CSS", "JavaScript", "Web APIs", "Databases", "Security"]},
        },
    },
    "it": {
        "name": "Information Technology",
        "courses": {
            "it101": {"name": "IT 101 Digital Literacy", "topics": ["Computer Basics", "Internet Safety", "Office Applications", "Digital Communication", "Cloud Computing"]},
            "it203": {"name": "IT 203 Networking Fundamentals", "topics": ["OSI Model", "TCP/IP", "Network Devices", "IP Addressing", "Network Security"]},
        },
    },
    "acc": {
        "name": "Accounting",
        "courses": {
            "acc101": {"name": "ACC 101 Principles of Accounting", "topics": ["Double Entry", "Trial Balance", "Financial Statements", "Depreciation", "Bank Reconciliation"]},
            "acc203": {"name": "ACC 203 Cost Accounting", "topics": ["Cost Classification", "Job Costing", "Process Costing", "Budgeting", "Variance Analysis"]},
        },
    },
    "nur": {
        "name": "Nursing Science",
        "courses": {
            "nur101": {"name": "NUR 101 Fundamentals of Nursing", "topics": ["Patient Assessment", "Vital Signs", "Infection Control", "Patient Safety", "Documentation"]},
            "nur205": {"name": "NUR 205 Anatomy and Physiology", "topics": ["Skeletal System", "Muscular System", "Cardiovascular System", "Respiratory System", "Nervous System"]},
        },
    },
}


# ═══════════════════════════════════════════════════════════════
#  IN-MEMORY STUDENT PROGRESS
# ═══════════════════════════════════════════════════════════════

student_progress = {}


def get_or_create_progress(student_id: str) -> dict:
    if student_id not in student_progress:
        student_progress[student_id] = {
            "studentId": student_id,
            "totalStudyMinutes": 0,
            "totalPracticePoints": 0,
            "streak": 0,
            "lastActiveDate": None,
            "topicMastery": {},
        }
    return student_progress[student_id]


def update_mastery(progress: dict, topic_key: str, correct: bool) -> dict:
    """Bayesian Knowledge Tracing update."""
    if topic_key not in progress["topicMastery"]:
        progress["topicMastery"][topic_key] = {
            "mastery": 0.3,
            "attempts": 0,
            "correct": 0,
            "lastReview": datetime.utcnow().isoformat(),
            "nextReview": datetime.utcnow().isoformat(),
        }

    topic = progress["topicMastery"][topic_key]
    p = topic["mastery"]
    p_learn = 0.1

    if correct:
        p_correct_mastered = 0.95
        p_correct_not = 0.25
        posterior = (p * p_correct_mastered) / (
            p * p_correct_mastered + (1 - p) * p_correct_not
        )
        topic["mastery"] = min(1.0, posterior + (1 - posterior) * p_learn)
        topic["correct"] += 1
    else:
        p_wrong_mastered = 0.05
        p_wrong_not = 0.75
        posterior = (p * p_wrong_mastered) / (
            p * p_wrong_mastered + (1 - p) * p_wrong_not
        )
        topic["mastery"] = posterior + (1 - posterior) * p_learn

    topic["attempts"] += 1
    topic["lastReview"] = datetime.utcnow().isoformat()

    days = 7 if topic["mastery"] > 0.8 else 3 if topic["mastery"] > 0.6 else 1 if topic["mastery"] > 0.4 else 0
    topic["nextReview"] = (datetime.utcnow() + timedelta(days=days)).isoformat()

    return topic


# ═══════════════════════════════════════════════════════════════
#  REQUEST MODELS
# ═══════════════════════════════════════════════════════════════

class StudyRequest(BaseModel):
    department: str = ""
    course: str = ""
    topic: str
    detailLevel: str = "detailed"


class PracticeRequest(BaseModel):
    department: str = ""
    course: str = ""
    topic: str
    numQuestions: int = 5
    difficulty: str = "medium"


class ChatRequest(BaseModel):
    department: str = ""
    course: str = ""
    message: str
    conversationHistory: list = []


class TutorNoteRequest(BaseModel):
    noteText: str
    question: str
    course: str = "General"


class ProgressUpdateRequest(BaseModel):
    course: str
    topic: str
    correct: bool
    studyMinutes: int = 0


# ═══════════════════════════════════════════════════════════════
#  HELPER: Resolve department/course names from keys
# ═══════════════════════════════════════════════════════════════

def resolve_names(department: str, course: str):
    dept_data = COURSE_DATA.get(department, {})
    course_info = dept_data.get("courses", {}).get(course, {})
    dept_name = dept_data.get("name", department or "General")
    course_name = course_info.get("name", course or "General Studies")
    return dept_name, course_name


# ═══════════════════════════════════════════════════════════════
#  API ENDPOINTS
# ═══════════════════════════════════════════════════════════════

# ── Health Check ──────────────────────────────────────────────

@app.get("/api/ai/health")
async def health_check():
    try:
        # Quick Gemini test
        result = tutor.model.generate_content("Reply with just: OK")
        return {
            "status": "healthy",
            "gemini": "connected",
            "model": tutor.model_name,
            "vectordb_chunks": tutor.collection.count(),
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail={
            "status": "unhealthy",
            "gemini": "disconnected",
            "error": str(e),
        })


# ── List Courses ──────────────────────────────────────────────

@app.get("/api/ai/courses")
async def get_courses():
    result = []
    for dept_key, dept in COURSE_DATA.items():
        courses = []
        for course_key, course_info in dept["courses"].items():
            courses.append({
                "value": course_key,
                "label": course_info["name"],
                "topics": course_info["topics"],
            })
        result.append({
            "value": dept_key,
            "label": dept["name"],
            "courses": courses,
        })
    return {"departments": result}


# ── Study Mode (RAG) ─────────────────────────────────────────

@app.post("/api/ai/study")
async def study_mode(req: StudyRequest):
    if not req.topic:
        raise HTTPException(status_code=400, detail="Topic is required.")

    dept_name, course_name = resolve_names(req.department, req.course)

    try:
        # This uses ChromaDB RAG under the hood
        response_text = tutor.study_topic(
            department=dept_name,
            course=req.course,  # pass the key for ChromaDB filtering
            topic=req.topic,
            detail_level=req.detailLevel,
        )

        return {
            "mode": "study",
            "department": dept_name,
            "course": course_name,
            "topic": req.topic,
            "response": response_text,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error": "Failed to generate study content.",
            "details": str(e),
        })


# ── Practice Mode (RAG) ──────────────────────────────────────

@app.post("/api/ai/practice")
async def practice_mode(req: PracticeRequest):
    if not req.topic:
        raise HTTPException(status_code=400, detail="Topic is required.")

    dept_name, course_name = resolve_names(req.department, req.course)

    try:
        raw_text = tutor.generate_practice_questions(
            department=dept_name,
            course=req.course,
            topic=req.topic,
            num_questions=req.numQuestions,
            difficulty=req.difficulty,
        )

        # Robust JSON parsing
        questions = _parse_json_block(raw_text)

        return {
            "mode": "practice",
            "department": dept_name,
            "course": course_name,
            "topic": req.topic,
            "difficulty": req.difficulty,
            "questions": questions,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error": "Failed to generate practice questions.",
            "details": str(e),
        })


def _parse_json_block(text: str) -> list:
    """Extracts and parses the first JSON object or array found in a text block."""
    try:
        # Step 1: Try direct parse (for JSON mode)
        try:
            data = json.loads(text.strip())
            if isinstance(data, list):
                return data
            if isinstance(data, dict) and "questions" in data:
                return data["questions"]
            if isinstance(data, dict) and "cards" in data:
                return data["cards"]
            # If it's just one object, wrap it
            if isinstance(data, dict):
                return [data]
        except:
            pass

        # Step 2: Find everything between the first [ and the last ]
        match = re.search(r"(\[.*\])", text, re.DOTALL)
        if match:
            json_str = match.group(1)
            return json.loads(json_str)
        
        # Step 3: Try to find everything between { and }
        match = re.search(r"(\{.*\})", text, re.DOTALL)
        if match:
            json_str = match.group(1)
            data = json.loads(json_str)
            return [data] if not isinstance(data, list) else data

        # Step 4: Fallback: cleaning markdown blocks
        cleaned = re.sub(r"```json\n?", "", text)
        cleaned = re.sub(r"```\n?", "", cleaned).strip()
        data = json.loads(cleaned)
        return data if isinstance(data, list) else [data]
    except Exception as e:
        print(f"❌ JSON Parse Error: {e}")
        # Final fallback: return a single item with the raw text
        return [
            {
                "id": 1,
                "type": "short_answer",
                "question": text[:500] + "..." if len(text) > 500 else text,
                "expectedAnswer": "See tutoring session for details.",
                "explanation": f"Could not parse structured questions. (Error: {str(e)})",
            }
        ]


# ── Chat (RAG) ───────────────────────────────────────────────

@app.post("/api/ai/chat")
async def chat_mode(req: ChatRequest):
    if not req.message:
        raise HTTPException(status_code=400, detail="Message is required.")

    dept_name, course_name = resolve_names(req.department, req.course)

    try:
        # Build conversation context
        conv_context = ""
        if req.conversationHistory:
            recent = req.conversationHistory[-6:]
            conv_context = "\nPREVIOUS CONVERSATION:\n" + "\n".join(
                f"{'Student' if m.get('from') == 'student' else 'Tutor'}: {m.get('text', '')}"
                for m in recent
            )

        # Retrieve relevant chunks from ChromaDB
        context, source_files = tutor._retrieve(req.message, course=req.course)

        prompt = f"""You are a friendly, expert AI tutor at Babcock University helping a student 
with {course_name} in the {dept_name} department.

COURSE MATERIALS (from lecturer's notes):
{context}
{conv_context}

Student's message: "{req.message}"

RULES:
1. Answer clearly and helpfully, using the course materials above
2. If the materials don't cover the question, use general knowledge but mention it
3. Be encouraging and supportive
4. Use formatting (bullet points, numbered lists) for clarity
5. Keep responses focused (under 300 words unless detailed explanation is needed)

Respond naturally as their tutor:"""

        response = tutor.model.generate_content(prompt)

        return {
            "from": "tutor",
            "text": response.text,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error": "Failed to generate chat response.",
            "details": str(e),
        })


# ── Tutor from Note Text ─────────────────────────────────────

@app.post("/api/ai/tutor-note")
async def tutor_note(req: TutorNoteRequest):
    if not req.noteText or not req.question:
        raise HTTPException(
            status_code=400, detail="Both noteText and question are required."
        )

    try:
        prompt = f"""You are a personal AI tutor at Babcock University helping a student 
with their {req.course} studies.

The student has shared their study notes. Read these notes carefully:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 STUDENT'S NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{req.noteText[:10000]}
{"[Note truncated]" if len(req.noteText) > 10000 else ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 STUDENT'S QUESTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{req.question}

Please:
1. **Answer their question** using information from the notes
2. **Highlight key concepts** found in the notes
3. **Correct any errors** in the notes (if any) — be gentle
4. **Create 3 quiz questions** to test their understanding
5. **Suggest study tips** for this topic

Be encouraging and thorough. Use headers and bullet points."""

        response = tutor.model.generate_content(prompt)

        return {
            "mode": "tutor-note",
            "response": response.text,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error": "Failed to tutor from note.",
            "details": str(e),
        })


# ── Upload Note File ──────────────────────────────────────────

@app.post("/api/ai/upload-note")
async def upload_note(
    note: UploadFile = File(...),
    question: str = Form("Summarize this document and explain key concepts."),
    course: str = Form("General"),
):
    if not note:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    try:
        content = await note.read()
        note_text = ""
        filename = note.filename or "uploaded_file"
        ext = os.path.splitext(filename)[1].lower()

        if ext == ".pdf":
            try:
                from PyPDF2 import PdfReader
                import io

                reader = PdfReader(io.BytesIO(content))
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        note_text += page_text + "\n"
            except Exception as e:
                note_text = f"[Could not extract text from PDF: {e}]"
        elif ext == ".txt":
            note_text = content.decode("utf-8", errors="ignore")
        else:
            note_text = f"[File format {ext} received. Text extraction needs additional processing.]"

        if not note_text or len(note_text) < 20:
            raise HTTPException(
                status_code=400,
                detail="Could not extract enough text from the file.",
            )

        prompt = f"""You are a personal AI tutor at Babcock University.

A student uploaded a document for their {course} course. Here is the content:

{note_text[:10000]}

Student's question: "{question}"

Please:
1. Summarize the main topics covered
2. Answer the student's question based on the content
3. Highlight the most important concepts
4. Create 3 practice questions from this material
5. Suggest what to study next

Be encouraging and well-organized."""

        response = tutor.model.generate_content(prompt)

        return {
            "mode": "upload-note",
            "filename": filename,
            "textLength": len(note_text),
            "response": response.text,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail={
            "error": "Failed to process uploaded note.",
            "details": str(e),
        })


# ── Student Progress ──────────────────────────────────────────
flashcards_storage = []

class FlashcardRequest(BaseModel):
    course: str
    topic: str
    num_cards: int = 5

@app.get("/api/ai/flashcards")
async def get_flashcards():
    return flashcards_storage

@app.post("/api/ai/flashcards/generate")
async def generate_flashcards(req: FlashcardRequest):
    dept_name, _ = resolve_names("", req.course)
    try:
        raw_text = tutor.generate_flashcards(
            department=dept_name,
            course=req.course,
            topic=req.topic,
            num_cards=req.num_cards
        )
        # Parse JSON using the shared robust parser
        cards = _parse_json_block(raw_text)
        
        # Add IDs
        import uuid
        for card in cards:
            if isinstance(card, dict):
                card["_id"] = str(uuid.uuid4())
                flashcards_storage.append(card)
            
        return {"cards": cards}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ai/progress/{student_id}")
async def get_progress(student_id: str):
    return get_or_create_progress(student_id)

@app.post("/api/ai/progress/{student_id}")
async def post_progress(student_id: str, req: ProgressUpdateRequest):
    progress = get_or_create_progress(student_id)

    # Update study time
    progress["totalStudyMinutes"] += req.studyMinutes

    # Update points
    if req.correct:
        progress["totalPracticePoints"] += 10

    # Update streak
    today = datetime.utcnow().strftime("%Y-%m-%d")
    if progress["lastActiveDate"] != today:
        yesterday = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
        if progress["lastActiveDate"] == yesterday:
            progress["streak"] += 1
        else:
            progress["streak"] = 1
        progress["lastActiveDate"] = today

    # Update topic mastery
    topic_key = re.sub(r"\s+", "_", f"{req.course}_{req.topic}").lower()
    mastery_result = update_mastery(progress, topic_key, req.correct)

    return {
        "updated": True,
        "topicMastery": mastery_result,
        "totalPoints": progress["totalPracticePoints"],
        "streak": progress["streak"],
        "totalStudyMinutes": progress["totalStudyMinutes"],
    }


# ═══════════════════════════════════════════════════════════════
#  Start the server
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn

    print("")
    print("")
    print("===========================================================")
    print("  [BUPT AI] Tutoring Server (Python + RAG)")
    print("  [URL] Running at: http://localhost:3002")
    print("  [INFO] Powered by: ChromaDB + Gemini Flash Lite")
    print("")
    print("  Endpoints:")
    print("  * Health check:   GET  http://localhost:3002/api/ai/health")
    print("  * Study mode:     POST http://localhost:3002/api/ai/study")
    print("  * Practice mode:  POST http://localhost:3002/api/ai/practice")
    print("  * Flashcards:     GET  http://localhost:3002/api/ai/flashcards")
    print("  * Gen Flashcards: POST http://localhost:3002/api/ai/flashcards/generate")
    print("  * Chat:           POST http://localhost:3002/api/ai/chat")
    print("  * Tutor note:     POST http://localhost:3002/api/ai/tutor-note")
    print("  * Upload note:    POST http://localhost:3002/api/ai/upload-note")
    print("  * Get courses:    GET  http://localhost:3002/api/ai/courses")
    print("  * Get progress:   GET  http://localhost:3002/api/ai/progress/{id}")
    print("  * Save progress:  POST http://localhost:3002/api/ai/progress/{id}")
    print("===========================================================")
    print("")

    uvicorn.run(app, host="0.0.0.0", port=3002, workers=1)
