# AI Code Review Assistant

> A full-stack AI-powered code review application built with React, Express, PostgreSQL, and OpenRouter AI.

## 🚀 Features

- **Two-stage code analysis**: Static linting (ESLint/Pylint) + AI review (OpenRouter)
- **Multi-language support**: JavaScript, TypeScript, Python, Java, C, C++, C#, PHP, Ruby, Go, Rust
- **Code submission**: Paste snippets (Monaco Editor) or upload files
- **Complexity metrics**: LOC, cyclomatic complexity, function/class count, per-function charts
- **Auto-documentation**: AI-generated JSDoc/docstrings
- **Review history**: Search, filter, paginate, and delete reviews
- **Secure auth**: JWT access + refresh tokens, HttpOnly cookies

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (access + refresh) |
| AI | OpenRouter API |
| Static Analysis | ESLint (JS/TS), Pylint (Python) |

## 📦 Quick Start

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL) or a PostgreSQL instance
- Python + Pylint for Python analysis
- An OpenRouter API key (https://openrouter.ai)

### 1. Start the database

```bash
docker-compose up -d
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
# Edit .env with your OPENROUTER_API_KEY
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

### 3. Set up the frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 4. Open the app

Visit http://localhost:5173

## 🔑 Environment Variables

### Backend (backend/.env)

| Variable | Description |
|---|---|
| DATABASE_URL | PostgreSQL connection string |
| JWT_ACCESS_SECRET | Secret for access token signing |
| JWT_REFRESH_SECRET | Secret for refresh token signing |
| OPENROUTER_API_KEY | Your OpenRouter API key |
| OPENROUTER_MODEL | Model to use (default: deepseek/deepseek-chat) |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current user |
| POST | /api/reviews | Submit review |
| GET | /api/reviews | List reviews |
| GET | /api/reviews/:id | Review detail |
| DELETE | /api/reviews/:id | Delete review |

## License

MIT - Built as an internship project.
