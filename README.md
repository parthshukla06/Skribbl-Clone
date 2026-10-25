# Skribbl Arena 🎨

A professional full-stack real-time multiplayer drawing and guessing game built for the **Web3Task Full Stack Intern Technical Evaluation**.

---

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Backend:** Node.js, Express, TypeScript, tsx
- **Real-Time Engine:** Socket.IO
- **Architecture:** Clean Monorepo (`frontend/` & `backend/`)
- **Package Manager:** npm

---

## 📁 Repository Structure

```text
Web3Task-Skribbl-Clone/
├── backend/
│   ├── src/
│   │   └── index.ts          # Express + Socket.IO server setup, health check
│   ├── .env                  # Environment configuration (PORT=5000)
│   ├── .env.example          # Template environment file
│   ├── .gitignore            # Backend ignore rules
│   ├── package.json          # Backend dependencies and scripts
│   └── tsconfig.json         # Backend TypeScript compiler options
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Skribbl Arena foundation UI & health check verification
│   │   ├── index.css         # Tailwind CSS v4 styling and base theme
│   │   ├── main.tsx          # React application root
│   │   └── vite-env.d.ts     # Vite client types
│   ├── .gitignore            # Frontend ignore rules
│   ├── index.html            # Main HTML document with custom typography
│   ├── package.json          # Frontend dependencies and scripts
│   ├── tsconfig.app.json     # Client TypeScript config
│   ├── tsconfig.json         # Frontend TypeScript project references
│   ├── tsconfig.node.json    # Vite configuration TypeScript options
│   └── vite.config.ts        # Vite config with React and Tailwind v4 plugins (Port 5173)
├── .gitignore                # Root gitignore rules
├── package.json              # Monorepo orchestration scripts
└── README.md                 # Setup and architecture documentation
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v24+ recommended)
- **npm**: v9.0.0 or higher

---

### 2. Dependency Installation

You can install all dependencies across the monorepo from the root directory:

```bash
# Option A: Install everything from the root
npm run install:all
```

Or install dependencies independently:

```bash
# Option B: Install independently
cd backend && npm install
cd ../frontend && npm install
```

---

### 3. Running in Development Mode

#### Running both services together (Recommended):
From the project root:
```bash
npm run dev
```
This runs both the backend and frontend concurrently in a single terminal window with colored logs.

---

#### Running independently:

**Backend Server (Port 5000):**
```bash
cd backend
npm run dev
```
> Server runs on `http://localhost:5000` with hot-reload via `tsx`.
> Health check endpoint: `http://localhost:5000/api/health`

**Frontend Client (Port 5173):**
```bash
cd frontend
npm run dev
```
> Client runs on `http://localhost:5173`.

---

### 4. Production Build

To build both services for production:
```bash
# From root
npm run build
```

Or independently:
```bash
# Backend build (outputs to backend/dist)
cd backend && npm run build

# Frontend build (outputs to frontend/dist)
cd frontend && npm run build
```

### Deployment configuration

Set `VITE_BACKEND_URL` in the frontend build environment to the backend origin, for example `https://skribbl-clone-2892.onrender.com`. Set `CLIENT_URL` on the backend to the deployed frontend origin, for example `https://skribbl-clone-lake.vercel.app`; multiple comma-separated origins are supported.

The client starts with Socket.IO polling and upgrades to WebSocket when available, and continues retrying after connection failures. Render free-tier services may sleep while idle, so an initial timeout during a cold start can occur even when the Socket.IO configuration is correct.

To run the production backend build:
```bash
cd backend
npm run start
```

---

## 🔍 Verification Endpoints

- **Frontend App:** [http://localhost:5173](http://localhost:5173)
- **Backend Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
  - Returns:
    ```json
    {
      "status": "ok",
      "service": "Skribbl Arena Backend",
      "uptime": 12.34,
      "timestamp": "2026-10-23T11:22:33.444Z"
    }
    ```

---

## 🗺 Implementation Phases
- [x] **Phase 1: Project Foundation** (Monorepo, React+Vite+TS, Express+TS, Tailwind v4, Socket.IO setup, Health check)
- [ ] **Phase 2: Room & Lobby System** (Room creation, joining via room codes, player states)
- [ ] **Phase 3: Real-Time Drawing Canvas** (HTML5 Canvas, brush tools, stroke broadcasting over Socket.IO)
- [ ] **Phase 4: Game Loop & Guessing Engine** (Turn rotation, timer countdown, word selection, chat guess parsing)
- [ ] **Phase 5: Scoring & Leaderboards** (Score calculation based on time, round summaries, game over podium)
