"""
Configuration file for RAG Integration with Gemini Flash Lite
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Google Gemini API Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-flash-lite-latest"  # Free tier model
EMBEDDING_MODEL = "models/embedding-001"

# Vector Database Configuration
VECTOR_DB_PATH = "./data/vector_db"
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

# RAG Configuration
TOP_K_RESULTS = 5  # Number of documents to retrieve
CONFIDENCE_THRESHOLD = 0.6  # Minimum relevance score

# Session Configuration
MAX_STUDY_SESSION_LENGTH = 3600  # 1 hour in seconds
MAX_PRACTICE_SESSION_LENGTH = 1800  # 30 minutes in seconds
SESSION_LOG_DIR = "./logs"

# Create necessary directories
os.makedirs(VECTOR_DB_PATH, exist_ok=True)
os.makedirs(SESSION_LOG_DIR, exist_ok=True)

print("✅ Configuration loaded successfully!")
