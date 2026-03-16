# PitchSense — Backend

NestJS backend for **PitchSense AI**: sales pitch practice and evaluation. It provides scenarios, sessions, streaming AI buyer replies (Anthropic Claude), real-time analytics over WebSockets, and post-session evaluations.

---

## Setup

### Prerequisites

- **Node.js** 20+
- **pnpm** (or npm/yarn)

### Environment

Create a `.env` in the project root (or set in the shell):

| Variable            | Required         | Description                                                 |
| ------------------- | ---------------- | ----------------------------------------------------------- | ----------------------- |
| `ANTHROPIC_API_KEY` | **Yes** (for AI) | Anthropic API key for Claude (buyer replies and evaluation) |
| `PORT`              | No               | HTTP port                                                   | `3001`                  |
| `CORS_ORIGIN`       | No               | Allowed origin for CORS                                     | `http://localhost:3000` |

Example:

```env
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### Install and run

```bash
pnpm install
pnpm run start:dev
```

The API is at `http://localhost:3001` with global prefix **`/api`**. The WebSocket gateway is at path **`/ws`** (same host, no `/api` prefix).

### Scripts

| Command               | Description              |
| --------------------- | ------------------------ |
| `pnpm run start`      | Start once               |
| `pnpm run start:dev`  | Start in watch mode      |
| `pnpm run start:prod` | Run compiled `dist/main` |
| `pnpm run build`      | Compile to `dist/`       |
| `pnpm run test`       | Unit tests               |
| `pnpm run test:e2e`   | E2E tests                |
| `pnpm run lint`       | ESLint                   |

---

## API overview

All HTTP routes are under **`/api`**.

### Scenarios

| Method | Path                 | Description                                                            |
| ------ | -------------------- | ---------------------------------------------------------------------- |
| `POST` | `/api/scenarios`     | Create scenario (persona, context, rubric). Body: `CreateScenarioDto`. |
| `GET`  | `/api/scenarios/:id` | Get scenario by id.                                                    |

### Sessions

| Method | Path                                  | Description                                                     |
| ------ | ------------------------------------- | --------------------------------------------------------------- |
| `POST` | `/api/scenarios/:scenarioId/sessions` | Create a new session for the scenario.                          |
| `POST` | `/api/sessions/:sessionId/messages`   | Send seller message; response is **NDJSON stream** (see below). |
| `POST` | `/api/sessions/:sessionId/end`        | End session and generate evaluation. Returns `Evaluation`.      |

### Evaluations

| Method | Path                                  | Description                             |
| ------ | ------------------------------------- | --------------------------------------- |
| `GET`  | `/api/sessions/:sessionId/evaluation` | Get evaluation for a completed session. |

### Streaming messages (`POST .../messages`)

- **Request body:** `{ "content": "string" }`
- **Response:** `Content-Type: application/x-ndjson`; each line is a JSON object:
  - `{ "type": "delta", "delta": "..." }` — chunk of buyer reply text
  - `{ "type": "done", "message": Message }` — final buyer message
  - `{ "type": "error", "error": "..." }` — stream error

### WebSocket (`/ws`)

- **Path:** `ws://localhost:3001/ws` (or `wss://` when using HTTPS).
- **Client sends:** `{ "event": "subscribe", "data": { "sessionId": "<id>" } }` (Nest uses `SubscribeMessage('subscribe')` with payload `{ sessionId }`).
- **Server sends:** `{ "event": "analytics", "data": AnalyticsPayload }` — real-time analytics (filler words, talk ratio, monologue flag, buyer interest).

---

## Architecture overview

- **Framework:** NestJS 11, TypeScript, Express; WebSockets via `@nestjs/websockets` and `@nestjs/platform-ws`.
- **Storage:** In-memory only (`StorageService` with `Map`s). No database; data is lost on restart.
- **AI:** Anthropic SDK; Claude used for buyer replies (streaming) and for generating evaluations (rubric-based scores and feedback).
- **Modules:** Storage, Scenarios, Sessions, Evaluations, Conversation (AI), Analytics (compute + gateway).

### Module layout

| Module               | Role                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `StorageModule`      | In-memory store for scenarios, sessions, evaluations.                                                               |
| `ScenariosModule`    | Create / get scenario.                                                                                              |
| `SessionsModule`     | Create session, stream messages, end session. Uses `ConversationService` and `AnalyticsService`/`AnalyticsGateway`. |
| `EvaluationsModule`  | Get evaluation by session id.                                                                                       |
| `ConversationModule` | Buyer reply (streaming) and evaluation generation via Claude.                                                       |
| `AnalyticsModule`    | Filler-word and talk-ratio computation; WebSocket broadcast to session subscribers.                                 |

### Request flow (high level)

1. **Create scenario** → `ScenariosService` → `StorageService.createScenario`.
2. **Create session** → `SessionsService.createSession` → load scenario, create session in storage.
3. **Send message** → `SessionsService.sendMessageStream`: append seller message, run analytics, broadcast WS; stream buyer reply via `ConversationService.replyStream`; append buyer message, broadcast again, yield `done`.
4. **End session** → `SessionsService.endSession`: mark completed, call `ConversationService.generateEvaluation`, store evaluation, return it.
5. **Get evaluation** → `EvaluationsService.findBySessionId` → read from storage.

---

## Design decisions

- **Global `/api` prefix:** Keeps HTTP API clearly namespaced; WebSocket stays at `/ws` for simple client URLs.
- **NDJSON for message stream:** Allows incremental delivery of buyer text and a final `done` event without custom binary protocol; easy to consume with `fetch` + body reader and split by newline.
- **WebSocket for analytics only:** Real-time metrics (filler words, talk ratio, monologue, interest) are pushed so the UI can update live without polling; chat history remains request/response and streamed NDJSON.
- **In-memory storage:** Simplifies deployment and avoids DB setup; suitable for a demo or single-user use. Persistence can be added behind `StorageService` later.
- **Anthropic-only for AI:** Buyer and evaluation prompts are tuned for Claude; a single provider keeps prompt and model logic in one place. Supporting other providers would be a separate adapter layer.
- **Global validation pipe and exception filter:** DTOs and `class-validator` keep input validation consistent; `HttpExceptionFilter` returns a uniform error shape for the frontend.

---

## Technical trade-offs

- **No persistence:** Restart wipes all data. Acceptable for a demo; production would use a database and possibly separate evaluation job queue.
- **No auth:** No API keys or user context; any client that can reach the server can create scenarios and sessions. Fine for local or single-tenant demo.
- **Synchronous evaluation on end:** Evaluation is generated inside `endSession`. For very long conversations this could make the request slow; with more time we’d consider a job queue and polling or WebSocket for “evaluation ready.”
- **Single process:** WebSocket subscriptions are per-process. Horizontal scaling would require a shared pub/sub (e.g. Redis) for analytics broadcasts.

---

## What I’d improve with more time

- **Database:** Persist scenarios, sessions, and evaluations (e.g. PostgreSQL or SQLite) and add a simple scenario/session list API.
- **Auth:** API key or JWT and user-scoped resources so multiple users can have their own scenarios and sessions.
- **Async evaluation:** On `endSession`, enqueue evaluation generation and return immediately; provide a “evaluation status” or WebSocket event when ready.
- **Structured logging and health:** Request IDs, structured logs, and a `/health` (or `/api/health`) endpoint for deployment and debugging.
- **Tests:** More unit tests for `AnalyticsService`, `ConversationService` (with mocked Anthropic), and E2E tests for the main API flows.
- **Rate limiting and timeouts:** Protect the AI endpoints and avoid long-running requests without limits.
