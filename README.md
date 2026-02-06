# DevCollab — Collaborative Project Platform

DevCollab is a full-stack collaboration platform built with a Vite + React frontend and an Express-based Node.js backend. It provides user authentication, project management, realtime updates, and AI-assisted features to help teams create, share, and iterate on projects quickly.

**Table of contents**

- **Overview:** concise project summary and goals.
- **Features:** what the app does (frontend + backend).
- **Architecture & Communication:** how components interact.
- **Tech Stack:** key libraries and services.
- **Quick Start:** setup and run commands for dev.
- **Environment:** required .env keys and example.
- **API Endpoints:** main routes and responsibilities.
- **Deployment & Testing:** notes and suggestions.
- **Contributing & License:** how to help.
- **Resume Highlights:** four concise accomplishment lines for CV/LinkedIn.

**Overview**

DevCollab is designed to make team collaboration around projects simple and realtime. Users can register/login, create and manage projects, view project details, and receive AI-generated assistance for project summaries. The app emphasizes low-friction collaboration with realtime synchronization and standard auth/security patterns.

**Features**

- **User Authentication:** secure sign-up / login flow with JWT-based tokens and protected routes.
- **Project Management:** create, update, list, and view projects with rich metadata.
- **Realtime Updates:** client synchronization using WebSockets so project changes propagate to connected clients instantly.
- **AI Assistant:** backend endpoints that leverage AI services to generate summaries, suggestions, and other productivity features.
- **Caching & Performance:** Redis-based caching and session/fast-access helpers for common queries.
- **Modular Services:** clear separation of concerns between controllers, services, and routes for maintainability.
- **Modular Services:** clear separation of concerns between controllers, services, and routes for maintainability.
- **Copy to clipboard:** convenient UI controls to copy project links, summaries, or AI-generated text to the clipboard for quick sharing.

**Architecture & Communication**

- The frontend (Vite + React) lives in the `Frontend/` folder and communicates with the backend via RESTful APIs and a realtime socket connection.
- Key frontend configuration files: [Frontend/src/config/axios.js](Frontend/src/config/axios.js) (HTTP client) and [Frontend/src/config/socket.js](Frontend/src/config/socket.js) (WebSocket client).
- The backend (Express) lives in the `backend/` folder and exposes modular routes under `routes/` that delegate logic to `controllers/` and `services/`.
- Key backend entry points: [backend/app.js](backend/app.js) and [backend/server.js](backend/server.js).
- Persistence is handled via the DB module in `backend/db/` and model files at `backend/models/`. Redis is used for fast caching and transient storage via `backend/services/redis.service.js`.

Flow summary:

- Frontend sends HTTP requests to backend API endpoints (e.g., /api/users, /api/projects, /api/ai) via Axios.
- For realtime sync, clients connect to the backend socket server and receive broadcasts when projects change.
- Backend controllers validate requests, call service-layer functions, access the DB, and publish realtime events where appropriate.
- Backend controllers validate requests, call service-layer functions, access the DB, and publish realtime events where appropriate.

Copy-to-clipboard (frontend example):

```jsx
// Example React helper to copy text and provide feedback
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    // trigger toast/notification to user (e.g., "Copied!")
  } catch (err) {
    // fallback: select and execCommand or show error
  }
};
```

**Tech Stack**

- Frontend: React, Vite, Axios, Socket client utilities.
- Backend: Node.js, Express, JSON Web Tokens (JWT), Socket.IO (or equivalent), Redis.
- AI integration: backend service responsible for calling external AI APIs (e.g., OpenAI) in `backend/services/ai.service.js`.
- Data: MongoDB (or your configured DB) via `backend/db/db.js` and Mongoose models in `backend/models/`.

**Quick Start (Development)**

1. Clone the repository and open the workspace.
2. Create environment files in both `backend/` and `Frontend/` as needed.

Backend (recommended):

```powershell
cd backend
npm install
# start the server (example; check backend/package.json scripts)
npx nodemon
```

Frontend (recommended):

```powershell
cd Frontend
npm install
# start the Vite dev server
npm run dev
```

Open the frontend URL printed by Vite (commonly `http://localhost:3000` or `http://localhost:5173`) and ensure the backend `PORT` matches the frontend's API base URL in `Frontend/src/config/axios.js`.

**Environment Variables (example)**

Create a `.env` for the backend with at least the following keys (names may vary by implementation):

```text
PORT=4000
MONGO_URI=mongodb://localhost:27017/devcollab
JWT_SECRET=your_jwt_secret
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-xxxxx   # if AI features rely on OpenAI
```

And for the frontend, configure the API base URL if required (often via `VITE_` prefixed variables):

```text
VITE_API_BASE_URL=http://localhost:4000/api
```

**API Endpoints (summary)**

- `POST /api/users/register` — register new users.
- `POST /api/users/login` — obtain JWT access tokens.
- `GET /api/projects` — list projects.
- `POST /api/projects` — create a new project (protected).
- `GET /api/projects/:id` — get project details.
- `PUT /api/projects/:id` — update project (protected, owner/role checks).
- `POST /api/ai/*` — AI-related endpoints that accept prompts and return generated content.

Refer to `backend/routes/` for concrete route names: [backend/routes/user.routes.js](backend/routes/user.routes.js), [backend/routes/project.routes.js](backend/routes/project.routes.js), [backend/routes/ai.routes.js](backend/routes/ai.routes.js).

**Deployment & Testing**

- Containerize: Add Dockerfiles to containerize backend and frontend for production deployments.
- Environment: Ensure production env keys are set securely (e.g., secrets manager).
- Tests: If you add tests, use a dedicated test database and mock external AI calls in CI to avoid leaking API usage.

**Security & Best Practices**

- Always store `JWT_SECRET` and API keys outside source control and rotate them if suspected compromised.
- Sanitize and validate user input in controllers to avoid injection vectors.
- Rate-limit AI endpoints if exposed publicly to avoid abuse and unexpected costs.

**Contributing**

- Fork the repository, create a feature branch, open a PR with a clear description, and include tests for new functionality.

**License**

- Add your preferred license file at the repo root (e.g., `LICENSE`) and reference it here.

**Resume Highlights**

- Led development of a full-stack collaboration platform, designing RESTful APIs and realtime sync to enable seamless team workflows.
- Implemented robust JWT-based authentication and role-based access control to secure user data and protected endpoints.
- Integrated AI-driven features via backend services to generate contextual project summaries and recommendations for users.
- Optimized backend performance with Redis caching and modular service-layer architecture, improving responsiveness under load.
