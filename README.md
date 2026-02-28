# ProctoHire — Production-grade 1:1 WebRTC Video Calling System

A full-stack real-time video calling system built with React, TypeScript, Firebase, and WebRTC.

---

## Architecture Overview

```
src/
├── app/                     # App shell (Router, root App component)
├── features/
│   ├── auth/                # Login / Register pages + hooks
│   │   ├── components/      # LoginForm, RegisterForm (presentational)
│   │   ├── hooks/           # useAuthForm (form state + submission logic)
│   │   └── AuthPage.tsx     # Container page
│   └── room/                # Lobby + Call pages
│       ├── components/      # VideoGrid, CallControls (presentational)
│       ├── LobbyPage.tsx    # Create / Join room
│       └── CallPage.tsx     # Active call screen (orchestrator)
├── services/                # Pure business logic — no React dependency
│   ├── firebase.service.ts  # Firebase singleton (app, auth, db, storage)
│   ├── auth.service.ts      # Authentication operations
│   ├── room.service.ts      # Firestore room CRUD + real-time subscription
│   ├── webrtc.service.ts    # RTCPeerConnection lifecycle (class-based)
│   └── recording.service.ts # MediaRecorder + Firebase Storage upload
├── hooks/                   # React hooks bridging services ↔ components
│   ├── useRoom.ts
│   ├── useWebRTC.ts
│   └── useRecording.ts
├── context/
│   └── AuthContext.tsx      # Auth state provider + useAuth hook
├── components/
│   └── ui/                  # Reusable dumb components (Button, Input, etc.)
├── routes/
│   ├── ProtectedRoute.tsx   # Requires auth
│   └── PublicRoute.tsx      # Redirects authenticated users
├── types/
│   └── index.ts             # All TypeScript interfaces
└── styles/
    └── globals.css          # Tailwind base + global resets
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with **Authentication**, **Firestore**, and **Storage** enabled

### 1. Clone and Install

```bash
git clone <repo>
cd ProctoHire
npm install
```

### 2. Configure Firebase

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Firebase project credentials:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 3. Enable Firebase Services

In the Firebase Console:

- **Authentication** → Email/Password sign-in method → Enable
- **Firestore Database** → Create database (start in production mode)
- **Storage** → Get started

### 4. Deploy Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules,storage
```

### 5. Run Development Server

```bash
npm run dev
```

---

## Call Flow

```
User A (Caller)                    Firestore                    User B (Callee)
─────────────────────────────────────────────────────────────────────────────
createRoom()              →   /rooms/{roomId}: status=waiting
[shares roomId with B]
                                                      ←  joinRoom(roomId)
                                                         /rooms/{roomId}: status=active, sessionId=X
createOffer()             →   /rooms/{roomId}/signal/data: { offer }
[ICE candidates]          →   .../callerCandidates/...
                                                      ←  createAnswer() [reads offer]
                                                         /rooms/{roomId}/signal/data: { answer }
                                                      ←  [ICE candidates] .../calleeCandidates/...
[reads answer + callee ICE]                           [reads caller ICE]
RTCPeerConnection established ◄──────────────────────────────────────────────
Recording starts (both sides)
[either side hangs up]    →   /rooms/{roomId}: status=ended, duration, recordingUrl
```

---

## Security Model

| Concern                   | Solution                                                      |
| ------------------------- | ------------------------------------------------------------- |
| Unauthorized room access  | Firestore rules: only `createdBy` + `joinedBy` can read/write |
| Duplicate join prevention | `validateRoom()` checks `joinedBy` before writing             |
| Creator joining own room  | Explicitly rejected in `validateRoom()`                       |
| Expired rooms             | Status check prevents joining `ended` rooms                   |
| Recording storage         | Firebase Storage rules: auth required, 500 MB limit           |

---

## Key Design Decisions

### Service Layer

All async I/O lives in `services/`. Hooks are thin wrappers that add React lifecycle management. Components are purely presentational and receive only primitive props + callbacks.

### WebRTCService as a class

Peer connections are stateful (they accumulate ICE candidates, SDP state, etc.). A class with private fields is the natural fit over a collection of standalone functions.

### Firestore as signaling server

No separate signaling WebSocket server needed. Firestore's real-time listeners (`onSnapshot`) handle the offer/answer/ICE exchange reliably and scale automatically.

### Recording architecture

Audio from both participants is mixed via `AudioContext.createMediaStreamDestination()`. Only the remote video track is recorded (PiP is a UI-only concern) to keep CPU usage low on client devices.

---

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Production build (TypeScript check + Vite bundle)
npm run preview   # Preview production build locally
npm run lint      # ESLint
```
