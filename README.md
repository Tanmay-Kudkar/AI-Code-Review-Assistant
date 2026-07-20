<div align="center">
  <img src="https://via.placeholder.com/150x150/7C5CFF/FFFFFF?text=AI+Review" alt="AI Code Review Assistant Logo" width="120" height="120" />

  <h1>🚀 AI Code Review Assistant</h1>
  
  <p>
    <strong>A next-generation, full-stack AI-powered code analysis platform.</strong>
  </p>

  <p>
    <a href="https://react.dev"><img src="https://img.shields.io/badge/React-18-blue.svg?style=for-the-badge&logo=react" alt="React" /></a>
    <a href="https://expressjs.com"><img src="https://img.shields.io/badge/Express-4.x-black.svg?style=for-the-badge&logo=express" alt="Express" /></a>
    <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-15-336791.svg?style=for-the-badge&logo=postgresql" alt="PostgreSQL" /></a>
    <a href="https://openrouter.ai/"><img src="https://img.shields.io/badge/AI-OpenRouter-7C5CFF.svg?style=for-the-badge&logo=openai" alt="OpenRouter AI" /></a>
  </p>
</div>

<hr />

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 🌟 Overview

The **AI Code Review Assistant** is a robust, full-stack application designed to automate and enhance the software development lifecycle. By combining blazing-fast **static analysis tools** (like ESLint and Pylint) with **Deep Learning AI models** (via OpenRouter), it provides engineers with real-time feedback on bugs, security vulnerabilities, performance bottlenecks, and architectural code smells.

Whether you're pasting a single snippet or analyzing an entire GitHub repository, this tool delivers senior-engineer-level refactoring advice and generates pristine documentation in seconds.

---

## ✨ Key Features

- **🧠 Dual-Engine Analysis**: Combines deterministic static linting in-memory with intelligent generative AI reviews.
- **🌍 Multi-Language Support**: Fully supports 10+ languages including `JavaScript`, `TypeScript`, `Python`, `Java`, `C++`, `Go`, `Rust`, and `PHP`.
- **📊 Advanced Complexity Metrics**: Automatically calculates cyclomatic complexity, Halstead metrics, and Big-O Time/Space complexity with interactive charts.
- **📚 Auto-Documentation Generation**: Automatically generates standard JSDoc/TSDoc/Google-style docstrings for your codebase.
- **⚡ Progressive UI**: The frontend utilizes a concurrent polling mechanism to unlock analysis tabs progressively as the AI streams results in the background.
- **🔐 Enterprise-Grade Security**: Uses strictly HttpOnly cookies with JWT Access and Refresh token rotation.

---

## 🏗 Architecture

The platform is split into a React/Vite frontend and a Node.js/Express backend, utilizing a PostgreSQL database managed by Prisma ORM.

```mermaid
graph TD
    Client[Client Browser (React + Tailwind)]
    API[Express.js API Gateway]
    DB[(PostgreSQL)]
    AI[OpenRouter LLM API]
    Static[Static Analyzers]

    Client <-->|REST / JSON| API
    API <-->|Prisma ORM| DB
    API <-->|Prompt Engineering| AI
    API -->|AST Parsing| Static
```

---

## 💻 Tech Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS, PostCSS
- **State & Data**: React Router, Axios
- **Components**: Monaco Editor (Code formatting), Recharts (Complexity Graphs), Lucide React (Icons)

### Backend
- **Server**: Node.js, Express.js
- **Database**: PostgreSQL (via Docker)
- **ORM**: Prisma
- **Security**: bcryptjs, jsonwebtoken, cookie-parser
- **AI Integration**: `@google/generative-ai` & `jsonrepair`

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker](https://www.docker.com/) (For running PostgreSQL locally)
- [Python 3](https://www.python.org/) (Optional, but required for Python static analysis)
- An API Key from Google Gemini or OpenRouter.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-code-review-assistant.git
   cd ai-code-review-assistant
   ```

2. **Start the Database**
   ```bash
   docker-compose up -d
   ```

3. **Setup the Backend**
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run db:generate
   npm run db:migrate
   npm run dev
   ```

4. **Setup the Frontend**
   ```bash
   cd ../frontend
   cp .env.example .env
   npm install
   npm run dev
   ```

5. **Open the Application**
   Navigate to [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔐 Environment Variables

You will need to configure the following variables in `backend/.env`:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | The port the Express server runs on | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `JWT_ACCESS_SECRET` | Secret key for JWT Access tokens | `your_super_secret_access_key` |
| `JWT_REFRESH_SECRET` | Secret key for JWT Refresh tokens | `your_super_secret_refresh_key` |
| `GEMINI_API_KEY` | API Key for Generative AI | `AIzaSy...` |
| `GEMINI_MODEL` | Model Selection | `gemini-1.5-flash` |

---

## 📁 Project Structure

```text
ai-code-review-assistant/
├── backend/
│   ├── prisma/                # Database schema & migrations
│   ├── src/
│   │   ├── controllers/       # Route logic (auth, reviews)
│   │   ├── middleware/        # JWT Auth, Error handling
│   │   ├── routes/            # Express route definitions
│   │   ├── services/          # Core Business Logic (AI, Static Analysis)
│   │   └── index.js           # Server entry point
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/        # Reusable UI components
    │   ├── context/           # React Context (Auth)
    │   ├── pages/             # Route components (Dashboard, ReviewDetail)
    │   ├── services/          # API hooks (Axios instance)
    │   ├── index.css          # Tailwind & Global Styles
    │   └── main.jsx           # React DOM entry point
    └── package.json
```

---

## 📡 API Reference

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate user & receive HttpOnly cookies
- `POST /api/auth/logout` - Clear authentication cookies
- `GET /api/auth/me` - Get current user profile

### Code Reviews
- `POST /api/reviews` - Submit a new snippet or GitHub URL for analysis
- `GET /api/reviews` - Fetch all reviews (paginated & filterable)
- `GET /api/reviews/:id` - Fetch details for a specific review
- `DELETE /api/reviews/:id` - Delete a review permanently
- `POST /api/reviews/:id/retry` - Force a background retry of AI sections

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check the [issues page](https://github.com/yourusername/ai-code-review-assistant/issues) if you want to contribute.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License. Built as an advanced AI demonstration project.
