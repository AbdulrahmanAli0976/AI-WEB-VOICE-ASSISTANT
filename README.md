# AI Web Voice Assistant

A full-stack voice-enabled AI chat app with:

- `frontend`: React UI with speech-to-text, markdown responses, and text-to-speech
- `backend`: Flask API that streams responses from Google Gemini

## Project Structure

- `frontend/` - React application
- `backend/` - Flask API server

## Prerequisites

- Node.js 18+
- Python 3.10+
- A `GOOGLE_API_KEY` value in your environment

## Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```env
GOOGLE_API_KEY=your_api_key_here
```

Run backend:

```bash
python app.py
```

## Frontend Setup

```bash
cd frontend
npm install
npm start
```

## Notes

- The backend currently exposes `POST /ask` (streamed response) and `POST /clear` (clear server-side chat state).
- For production, tighten CORS policy and disable Flask debug mode.
