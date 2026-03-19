# DevTrack – Developer Task & Bug Tracking System
## Complete Build Guide + Claude Code Prompt

---

## What is DevTrack?

A full-stack project management and bug tracking tool for dev teams. It allows users to create projects, manage sprints, assign tasks/bugs, and get AI-powered bug severity analysis via a Python/Django microservice.

**Tech Stack:**
- **Frontend:** React.js (Vite), Tailwind CSS
- **Backend (Main API):** Node.js + Express.js
- **Database:** MongoDB (via Mongoose)
- **Auth:** JWT (JSON Web Tokens)
- **Microservice:** Django REST Framework (Python) — Bug Analysis Service
- **Communication:** REST API between Node.js and Django

---

## Folder Structure

```
devtrack/
├── client/               # React frontend (Vite)
├── server/               # Node.js + Express backend
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── index.js
├── bug-service/          # Django microservice
│   ├── analyzer/
│   ├── bug_service/
│   └── manage.py
└── README.md
```

---

## Prerequisites — Install These First

### 1. Node.js & npm
- Download from: https://nodejs.org (LTS version)
- Verify: `node -v` and `npm -v`

### 2. Python 3.10+
- Download from: https://python.org
- Verify: `python --version`

### 3. MongoDB
- Option A (Local): Download from https://www.mongodb.com/try/download/community
- Option B (Free Cloud): Create a free cluster at https://cloud.mongodb.com (recommended for beginners)
- You'll need a **MongoDB connection string** (URI)

### 4. Git
- Download from: https://git-scm.com
- Verify: `git --version`

### 5. Claude Code (CLI)
- Requires Node.js installed
- Install: `npm install -g @anthropic/claude-code`
- Verify: `claude --version`
- Login: `claude login` (opens browser for Anthropic login)

### 6. VS Code (recommended)
- Download from: https://code.visualstudio.com

---

## Step-by-Step: How to Build DevTrack Using Claude Code

### Step 1: Create the project folder

Open your terminal (Command Prompt / PowerShell / Terminal) and run:

```bash
mkdir devtrack
cd devtrack
claude
```

This opens the Claude Code interactive session inside the `devtrack` folder.

---

### Step 2: Paste this prompt into Claude Code

Copy the entire prompt below and paste it when Claude Code is running:

---

## THE CLAUDE CODE PROMPT

```
Build a full-stack web application called "DevTrack" — a Developer Task & Bug Tracking System. Use the following tech stack:

- Frontend: React.js (Vite + Tailwind CSS)
- Backend: Node.js + Express.js
- Database: MongoDB with Mongoose ODM
- Auth: JWT-based authentication (register/login)
- Microservice: Django REST Framework (Python) for bug severity analysis

---

PROJECT STRUCTURE:

Create three separate folders:
1. `client/` — React frontend
2. `server/` — Node.js/Express backend
3. `bug-service/` — Django microservice

---

FEATURES TO BUILD:

**Authentication (Node.js)**
- POST /api/auth/register — register with name, email, password (bcrypt hashed)
- POST /api/auth/login — return JWT token
- JWT middleware to protect all routes below

**Projects (Node.js)**
- POST /api/projects — create a project (name, description, createdBy)
- GET /api/projects — list all projects for the logged-in user
- GET /api/projects/:id — get project details

**Tasks & Bugs (Node.js)**
- POST /api/projects/:id/tasks — create a task or bug (title, description, type: "task"|"bug", priority: "low"|"medium"|"high", status: "open"|"in-progress"|"resolved", assignedTo)
- GET /api/projects/:id/tasks — list all tasks/bugs for a project
- PATCH /api/tasks/:taskId — update status or priority
- DELETE /api/tasks/:taskId — delete a task

**Bug Analysis Microservice (Django)**
- POST /api/analyze — accepts { "title": "...", "description": "..." }
- Returns { "severity": "low|medium|high|critical", "suggested_tags": ["..."], "summary": "..." }
- Use simple keyword-based logic for severity detection (no external AI API needed):
  - Keywords like "crash", "null pointer", "exception", "data loss" → critical
  - Keywords like "error", "fail", "broken", "not working" → high
  - Keywords like "slow", "timeout", "delay" → medium
  - Default → low
- Node.js backend should call this Django service when a bug is created and store the analysis result with the bug document

**React Frontend**
- Login and Register pages
- Dashboard showing all projects as cards with task counts
- Project detail page showing tasks/bugs in a Kanban-style board (3 columns: Open, In Progress, Resolved)
- Create Task/Bug modal with form (title, description, type, priority, assignee)
- When type is "bug", show an "Analyze Severity" button that calls the Django microservice and auto-fills the priority field
- Simple clean UI using Tailwind CSS

---

MONGODB SCHEMAS:

User: { name, email, password, createdAt }
Project: { name, description, createdBy (ref: User), members: [ref: User], createdAt }
Task: { title, description, type, priority, status, assignedTo (ref: User), project (ref: Project), analysis: { severity, suggested_tags, summary }, createdAt }

---

ENVIRONMENT VARIABLES:

server/.env:
  PORT=5000
  MONGO_URI=<user will fill this>
  JWT_SECRET=devtrack_secret_key_2024
  BUG_SERVICE_URL=http://localhost:8000

bug-service/.env (or settings):
  DEBUG=True
  ALLOWED_HOSTS=*

client/.env:
  VITE_API_URL=http://localhost:5000

---

SETUP FILES TO CREATE:

1. `server/package.json` with scripts: start, dev (nodemon)
   Dependencies: express, mongoose, bcryptjs, jsonwebtoken, dotenv, cors, axios, nodemon (dev)

2. `bug-service/requirements.txt`:
   django, djangorestframework, django-cors-headers

3. `client/` — use Vite React template structure with:
   Dependencies: axios, react-router-dom, tailwindcss

4. Root `README.md` with full setup and run instructions

---

INSTRUCTIONS FOR STARTUP:

- server: `npm install` then `npm run dev`
- bug-service: `pip install -r requirements.txt` then `python manage.py runserver 8000`
- client: `npm install` then `npm run dev`

---

Make sure all three apps run independently and communicate correctly. Add comments in code where important. Use clean, readable code. Write the complete implementation for all files.
```

---

## After the Build: What to Do Next

### 1. Fill in your MongoDB URI
Open `server/.env` and replace `<user will fill this>` with your MongoDB connection string. If using MongoDB Atlas (cloud), it looks like:
```
MONGO_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/devtrack
```

### 2. Run all three services
Open **3 separate terminal windows**:

**Terminal 1 — Backend:**
```bash
cd devtrack/server
npm install
npm run dev
```

**Terminal 2 — Bug Service:**
```bash
cd devtrack/bug-service
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

**Terminal 3 — Frontend:**
```bash
cd devtrack/client
npm install
npm run dev
```

Then open your browser at `http://localhost:5173`

---

### 3. Push to GitHub (Important for your resume!)

```bash
cd devtrack
git init
git add .
git commit -m "Initial commit: DevTrack full-stack app"
```

Then create a new repository on GitHub (https://github.com/new), and push:
```bash
git remote add origin https://github.com/YOUR_USERNAME/devtrack.git
git branch -M main
git push -u origin main
```

Add the GitHub link to your resume under the DevTrack project entry.

---

### 4. Tips to make it more impressive
- Add a **README.md** with screenshots and setup instructions (Claude Code can help generate this)
- Record a short screen recording demo and link it in the README
- Deploy the frontend free on **Vercel** (https://vercel.com) — just connect your GitHub repo

---

## Summary of What You'll Own

| Layer | Tech | What it does |
|-------|------|--------------|
| Frontend | React + Vite + Tailwind | UI, Kanban board, forms |
| Backend API | Node.js + Express + MongoDB | Auth, projects, tasks/bugs |
| Microservice | Django REST Framework | Bug severity analysis |
| Auth | JWT | Secure login sessions |
| DB | MongoDB | Stores all data |
