# TeamTalk — System README

> A real-time collaborative workspace with AI-powered summaries, voice recording, and shared canvas.

---

## Live Demo

**[https://teamtalk-final-1dlk.vercel.app](https://teamtalk-final-1dlk.vercel.app)**

> Deployed on Vercel — no installation needed. Just click the link, sign up or log in, enter a Project ID, and start collaborating.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [System Layers](#system-layers)
   - [Client Layer](#client-layer)
   - [App Layer](#app-layer)
   - [Data Layer](#data-layer)
   - [AI Layer](#ai-layer)
4. [Feature Reference](#feature-reference)
5. [Authentication Flow](#authentication-flow)
6. [Room Management](#room-management)
7. [Real-Time Communication](#real-time-communication)
8. [Database Schema](#database-schema)
9. [API Endpoints](#api-endpoints)
10. [Non-Functional Requirements](#non-functional-requirements)
11. [Tech Stack](#tech-stack)
12. [Environment Variables](#environment-variables)
13. [Getting Started](#getting-started)

---

## Project Overview

TeamTalk is a browser-based collaborative workspace that allows teams to share a canvas, exchange messages, upload assets, record voice notes, and receive AI-generated meeting summaries — all in sub-second real time.

Key capabilities:

- **FR1** — Real-time text messaging via Socket.IO
- **FR2** — Drag-and-drop asset upload onto a shared canvas
- **FR3** — In-browser voice recording with server-side storage
- **FR4** — Magic AI summary powered by Groq (Llama 3.1 8B)
- **NFR6** — Sub-1-second UI sync across all connected clients

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Client Layer                   │
│         React · Tailwind · Framer Motion        │
└────────────────────┬────────────────────────────┘
                     │ HTTP / WebSocket
┌────────────────────▼────────────────────────────┐
│                   App Layer                     │
│     Node.js + Express · Socket.IO Manager       │
│          JWT Auth Middleware · Multer           │
└────────────────────┬────────────────────────────┘
                     │ mysql2 async/await
┌────────────────────▼────────────────────────────┐
│                  Data Layer                     │
│        MySQL (Railway) — Users · Rooms          │
│              Messages · Canvas                  │
└────────────────────┬────────────────────────────┘
                     │ REST
┌────────────────────▼────────────────────────────┐
│                   AI Layer                      │
│     Groq API (Llama 3.1 8B) · GET /summary      │
│       Human-like recap · Socket.IO broadcast    │
└─────────────────────────────────────────────────┘
```

Color legend (matching system diagram):

| Color | Layer |
|-------|-------|
| Purple | UI / Frontend |
| Green | Real-time (Socket.IO) |
| Blue | Database |
| Olive/Gold | Async / Uploads |
| Dark Red | AI / Stretch |
| Dark Grey | Decision node |

---

## System Layers

### Client Layer

The client is a single-page React application served as a landing page. On load it checks whether the user has an account:

- **No account** → Sign Up form. Password is hashed with **bcrypt** before being sent to the server.
- **Has account** → Log In form. Credentials are validated server-side and a **JWT** is returned and stored client-side for all subsequent authenticated requests.

After authentication the user enters a **Project ID** and **Name** to create or join a collaborative room.

### App Layer

The application server is built on **Node.js + Express** with the following core responsibilities:

- Route handling for all REST endpoints
- JWT authentication middleware applied to all protected routes
- **Socket.IO Manager** that maintains a room registry keyed by Project ID and broadcasts events to all connected peers
- **Multer** middleware for multipart file uploads (assets and audio)
- A background **async save job** that triggers a safety-save to MySQL every 5 seconds

### Data Layer

Persistence is provided by a **MySQL** database hosted on **Railway**. The four primary tables are:

| Table | Purpose |
|-------|---------|
| `users` | Credentials, bcrypt hashes, JWT metadata |
| `rooms` | Project ID index, room creation timestamps |
| `messages` | Chat history for late-join replay |
| `canvas` | Asset coordinates for UPSERT on each move |

Three core database operations map directly to feature flows:

- `INSERT message` — executed via `mysql2 async/await` on every new chat message
- `SELECT history` — late-join replay delivers full message history to new joiners
- `UPSERT canvas` — stores or updates asset coordinates when items are dragged

### AI Layer

The AI layer is activated when a user triggers the **Magic Summary** feature (FR4):

1. Client sends `GET /summary` via Axios.
2. Server queries history logs from the `messages` table.
3. History is forwarded to the **Groq API (Llama 3.1 8B)** with a prompt requesting a human-like recap.
4. The generated summary is broadcast to all room participants via Socket.IO.
5. The React UI renders the result with a **Framer Motion** animation.

The AI layer loops back into the main broadcast pipeline, ensuring every connected client sees the summary simultaneously.

---

## Feature Reference

### FR1 — Send Message

```
User types message
  → socket.emit("send_message", payload)
    → Socket.IO Manager broadcasts to room
      → All clients receive and render
        → mysql2 INSERT persists message
```

### FR2 — Drag Asset

```
User drops file onto canvas
  → Axios POST /upload (multipart/form-data)
    → Multer saves file to disk/storage
      → Server broadcasts asset + coordinates via Socket.IO
        → canvas UPSERT records position
```

### FR3 — Record Voice

```
User clicks mic button
  → Browser MediaRecorder captures audio
    → Axios POST /voice (multipart/form-data)
      → Multer saves audio file
        → Server broadcasts audio reference to room
```

### FR4 — Magic Summary (AI Recap)

```
User clicks "Magic Summary"
  → GET /summary
    → Server queries message history
      → Groq API (Llama 3.1 8B) generates recap
        → Summary broadcast via Socket.IO
          → React UI animates result (Framer Motion)
```

---

## Authentication Flow

```
POST /auth/signup
  Body: { name, email, password }
  → bcrypt.hash(password, 10)
  → INSERT INTO users
  → Return JWT

POST /auth/login
  Body: { email, password }
  → SELECT user WHERE email
  → bcrypt.compare(password, hash)
  → Return JWT on success, 401 on failure
```

All subsequent requests include the JWT in the `Authorization: Bearer <token>` header. The Express JWT middleware validates the token and attaches `req.user` to the request context.

---

## Room Management

```
POST /rooms/join
  Body: { projectId, displayName }

Server logic:
  SELECT * FROM rooms WHERE project_id = ?
  
  Room exists  → Socket.IO join(projectId)
                 SELECT message history
                 Emit history replay to new joiner
  
  Room missing → INSERT INTO rooms
                 Socket.IO create room
                 Emit empty workspace
```

The workspace layout is a **70/30 split** — 70% canvas area, 30% chat sidebar — built with React and styled with Tailwind CSS.

---

## Real-Time Communication

All real-time events are managed by the **Socket.IO Manager** which organises sockets into rooms keyed by `projectId`.

| Event | Direction | Description |
|-------|-----------|-------------|
| `send_message` | Client → Server → Room | Broadcast new chat message |
| `asset_dropped` | Client → Server → Room | Broadcast new canvas asset |
| `voice_recorded` | Client → Server → Room | Broadcast new audio reference |
| `summary_ready` | Server → Room | Broadcast AI-generated summary |
| `canvas_update` | Client → Server → Room | Broadcast asset coordinate change |
| `history_replay` | Server → Client | Deliver message history to late joiner |

### Safety Save

Every **5 seconds**, a background job evaluates whether pending canvas state needs to be persisted. If dirty state exists, an async MySQL UPSERT is executed without blocking the main event loop.

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,  -- bcrypt hash
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rooms
CREATE TABLE rooms (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  project_id  VARCHAR(100) UNIQUE NOT NULL,
  created_by  INT REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages
CREATE TABLE messages (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  room_id     INT REFERENCES rooms(id),
  user_id     INT REFERENCES users(id),
  content     TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Canvas
CREATE TABLE canvas (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  room_id     INT REFERENCES rooms(id),
  asset_url   VARCHAR(500) NOT NULL,
  x           FLOAT NOT NULL,
  y           FLOAT NOT NULL,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_room_asset (room_id, asset_url)
);
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/signup` | No | Register new user |
| `POST` | `/auth/login` | No | Authenticate and receive JWT |
| `POST` | `/rooms/join` | Yes | Create or join a project room |
| `POST` | `/upload` | Yes | Upload canvas asset (Multer) |
| `POST` | `/voice` | Yes | Upload voice recording (Multer) |
| `GET` | `/summary` | Yes | Trigger AI summary for current room |

All authenticated endpoints expect `Authorization: Bearer <JWT>` header.

---

## Non-Functional Requirements

| ID | Requirement | Implementation |
|----|-------------|----------------|
| NFR6 | Sub-1-second UI sync | Socket.IO event broadcasting with Framer Motion render |
| — | Data durability | Safety-save background job every 5 seconds |
| — | Scalable file storage | Multer handles multipart uploads server-side |
| — | Auth security | bcrypt password hashing + JWT stateless auth |
| — | Late-join consistency | Full message history replay on Socket.IO join |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Tailwind CSS, Framer Motion |
| Realtime | Socket.IO |
| Backend | Node.js, Express |
| Auth | JWT, bcrypt |
| File Uploads | Multer |
| Database | MySQL (hosted on Railway) |
| DB Client | mysql2 (async/await) |
| AI | Groq API — Llama 3.1 8B |
| HTTP Client | Axios |

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# MySQL (Railway)
DB_HOST=your.railway.host
DB_PORT=3306
DB_NAME=teamtalk
DB_USER=root
DB_PASSWORD=your_db_password

# Groq AI
GROQ_API_KEY=your_groq_api_key

# File Uploads
UPLOAD_DIR=./uploads
```

---

## Getting Started

### 🌐 Try it Live
Visit **[teamtalk-final-1dlk.vercel.app](https://teamtalk-final-1dlk.vercel.app)** — no setup required.  
Just sign up, enter a Project ID, and start collaborating instantly.

---

### 🛠️ Run Locally (Development Only)

Follow the steps below only if you want to run a local instance.

#### Prerequisites
- Node.js >= 18
- MySQL database (local or Railway)
- Groq API key

#### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/teamtalk.git
cd teamtalk

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

#### Database Setup

```bash
cd server
npm run db:migrate
```

#### Environment Variables

Create a `.env` file in `/server`:

```env
PORT=5000
JWT_SECRET=your_jwt_secret_here
DB_HOST=your.railway.host
DB_NAME=teamtalk
DB_USER=root
DB_PASSWORD=your_db_password
GROQ_API_KEY=your_groq_api_key
```

#### Run

```bash
# Backend (from /server)
npm run dev

# Frontend (from /client)
npm run dev
```

Client runs at `http://localhost:3000`, server at `http://localhost:5000`.

### Production Build

```bash
# Build the React client
cd client && npm run build

# Start the production server
cd ../server && npm start
```

The Express server will serve the built React app from the `dist/` directory.

---

*TeamTalk — Built with React, Node.js, Socket.IO, MySQL, and Groq AI.*