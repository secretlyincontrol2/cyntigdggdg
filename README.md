---
title: BUPT AI Backend
emoji: 🎓
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# BUPT AI Backend

This is the backend for the BUPT AI Tutoring system, providing:
- Express.js API for user authentication and session management.
- Python FastAPI service for Retrieval-Augmented Generation (RAG) using ChromaDB and Gemini Flash Lite.

## Deployment Info

This Space is configured as a **Docker** container. It runs both the Node.js API (port 7860) and the Python AI service (port 3002).

## Local Development

1. Install Node.js and Python dependencies.
2. Run `npm dev` for the main API.
3. Run `python ai_server.py` for the RAG service.
