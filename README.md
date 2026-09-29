# QuickShare

Production-oriented single-page file sharing app built with the MERN stack and Tailwind CSS.

## Stack

- Frontend: React + Vite + Tailwind CSS + Redux Toolkit
- Backend: Node.js + Express + MongoDB + Mongoose
- Storage: Telegram Bot API only
- Security: Helmet, CORS, rate limiting, secure cookies, validation

## Getting started

1. Copy backend/.env.example to backend/.env and fill in your variables.
2. Start MongoDB locally or via Docker Compose.
3. Install dependencies:
   - cd backend && npm install
   - cd frontend && npm install
4. Run development servers:
   - cd backend && npm run dev
   - cd frontend && npm run dev

## Docker

```bash
docker compose up --build
```

## Notes

- Telegram Bot API is the sole file storage backend.
- Passkeys are 6-character alphanumeric values and never stored raw in MongoDB.
- File downloads are streamed through the backend to avoid memory spikes.
