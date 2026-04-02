# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server (port 5173)
npm run build     # Build production bundle
npm run preview   # Preview production build
```

## Architecture Overview

This is a React 18 + Vite single-page app for a real-time chatroom with gamification, moderated by a WebSocket backend.

**Routing (React Router v6):**
- `/` or `/login` → `Login.jsx` — guest/account/register/edit/forgot-password modes
- `/chat` → `ChatApp.jsx` — main chatroom interface (the core of the app)

**Session Storage:** Authentication state persists in `sessionStorage` (name, gender, level, exp, apples, token, type, avatar, chatColor). Cleared on logout. On page close, `beforeunload` fires a `keepalive` fetch to `/auth/logout`.

**Real-time Communication:** A single Socket.io client instance is created in `src/pages/socket.js` and imported across components. Socket handlers in `ChatApp.jsx` use refs to read latest state without stale closures — this is intentional, do not convert to closure-based handlers.

**Custom Hooks:**
- `useUserState` — owns the current user's profile, syncs with backend `/auth/me`, and manages floating EXP/level-up tip animations
- `useMessages` — maintains a capped message queue (MAX_MESSAGES=500). Implements a 3-second pending-leave buffer to suppress join/leave noise during brief reconnects

**`ChatApp.jsx` is the central hub** (~4600 LOC) orchestrating socket events, user actions, and rendering sub-panels. It is intentionally large and stateful.

**Backend URL:** Configured via `VITE_BACKEND_URL` in `.env` (default: `https://chatroom-backend-ws-gt6i.onrender.com`). LiveKit URL is `VITE_LIVEKIT_URL`.

## Key Domain Concepts

- **User types:** `guest` (no account) vs `account` (registered); admin levels 91–99 (`VITE_ADMIN_MIN_LEVEL`/`VITE_ADMIN_MAX_LEVEL`)
- **Level system:** Member levels 1–90; EXP per level = `floor(120 * level² + 200)`; level/exp logic lives in `utils.js`
- **Gold apples:** In-game currency; transfer via `POST /api/transfer-gold`; `VITE_MAX_GOLD_APPLES` caps the max
- **Message modes:** `public`, `private` (only sender+recipient see it), `publicTarget` (visible to all but addressed to one)
- **Chinese conversion:** `opencc-js` converts Simplified → Traditional Chinese on send

## Important Constants (`constants.js`)

| Constant | Value | Purpose |
|---|---|---|
| `MAX_MESSAGES` | 500 | Message queue cap |
| `HEARTBEAT_INTERVAL` | 10000ms | Socket keep-alive |
| `COOLDOWN_MS` | 1000ms | Send rate limit |
| `PENDING_LEAVE_DELAY` | 3000ms | Leave message suppression |

## Admin Panels

All admin components (in `src/pages/Admin*/`) require level ≥ 91 to render and are wrapped in `AppErrorBoundary` to isolate crashes from the main chat UI.

## Feature Flags (`.env`)

- `VITE_OPENAI` — enables AI character features (profiles in `aiConfig.js`)
- `VITE_NEW_FUNCTION` — enables leaderboard and other experimental features
