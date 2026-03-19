# DevTrack — Developer Task & Bug Tracking System

A full-stack project management and bug tracking tool built for developer teams.
Create projects, manage sprints, assign tasks/bugs, and get AI-powered bug severity analysis via a Python/Django microservice.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend API | Node.js + Express.js |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (JSON Web Tokens) |
| Bug Microservice | Django REST Framework (Python) |

---

## Project Structure

```
devtrack/
├── client/               # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── api/          # Axios instance
│   │   ├── components/   # Reusable UI components
│   │   ├── context/      # Auth context
│   │   └── pages/        # Route-level page components
│   └── package.json
├── server/               # Node.js + Express backend
│   ├── controllers/      # Route handler logic
│   ├── middleware/        # JWT auth middleware
│   ├── models/           # Mongoose schemas
│   ├── routes/           # Express routers
│   ├── index.js
│   └── package.json
├── bug-service/          # Django REST microservice
│   ├── analyzer/         # Bug analysis app
│   ├── bug_service/      # Django project settings
│   ├── manage.py
│   └── requirements.txt
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- MongoDB (local or [MongoDB Atlas](https://cloud.mongodb.com) — free tier)

---

### 1. Configure Environment Variables

**server/.env** — fill in your MongoDB URI:
```
PORT=5000
MONGO_URI=mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/devtrack
JWT_SECRET=devtrack_secret_key_2024
BUG_SERVICE_URL=http://localhost:8000
```

**client/.env** (already configured):
```
VITE_API_URL=http://localhost:5000
```

---

### 2. Run the Backend (Node.js)

```bash
cd server
npm install
npm run dev
```

Runs on **http://localhost:5000**

---

### 3. Run the Bug Analysis Microservice (Django)

```bash
cd bug-service
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

Runs on **http://localhost:8000**

---

### 4. Run the Frontend (React)

```bash
cd client
npm install
npm run dev
```

Runs on **http://localhost:5173** — open this in your browser.

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with name, email, password |
| POST | `/api/auth/login` | Login, returns JWT token |

### Projects (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all your projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/:id` | Get project details |

### Tasks & Bugs (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/tasks` | List all tasks for a project |
| POST | `/api/projects/:id/tasks` | Create a task or bug |
| PATCH | `/api/tasks/:taskId` | Update status/priority |
| DELETE | `/api/tasks/:taskId` | Delete a task |

### Bug Analysis Microservice
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze` | Analyze bug severity from title + description |

**Request:**
```json
{ "title": "App crashes on login", "description": "NullPointerException in auth flow" }
```
**Response:**
```json
{
  "severity": "critical",
  "suggested_tags": ["crash", "auth", "backend"],
  "summary": "[CRITICAL] App crashes on login — NullPointerException in auth flow"
}
```

---

## Features

- **JWT Authentication** — Secure register/login with bcrypt password hashing
- **Project Management** — Create and manage multiple projects
- **Kanban Board** — Drag-free kanban with Open / In Progress / Resolved columns
- **Task & Bug Tracking** — Create tasks or bugs with priority, status, and assignee
- **AI Bug Severity Analysis** — Keyword-based severity detection (critical/high/medium/low) via Django microservice
- **Auto Priority** — Bug priority auto-fills based on severity analysis
- **Clean UI** — Responsive Tailwind CSS design

---

## Development Notes

- The Django bug service is **stateless** — no database needed, runs analysis on-the-fly
- Bug analysis is called automatically by the Node.js backend whenever a bug is created
- The frontend also provides a client-side preview of severity before form submission
- All Node.js routes (except `/api/auth/*`) require a valid JWT in the `Authorization: Bearer <token>` header
