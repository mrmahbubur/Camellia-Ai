# Camellia AI — Assistant of M R S

A responsive full-stack conversational AI web application built with **React**, **Vite**, **Tailwind CSS**, **Express**, and a **multi-provider AI routing backend** supporting **Google Gemini**, **Anthropic Claude** (e.g., Claude Fable 5.2), and **OpenRouter**.

## Architecture & Key Handling

```text
Browser (React + Vite UI)
   │  GET /api/models          → loads approved models dynamically
   │  POST /api/chat/stream    → SSE stream with modelUsed & providerUsed metadata
   │  /api/admin/catalogue*    → admin governance (refresh, approve/disable, caps)
   ▼
Express Backend (server.ts + server/modelRegistry.ts + server/providers.ts)
   ├─► Google Gemini (@google/genai)         [reads process.env.GEMINI_API_KEY]
   ├─► Anthropic Messages API (SSE)          [reads process.env.ANTHROPIC_API_KEY]
   └─► OpenRouter Chat Completions API (SSE) [reads process.env.OPENROUTER_API_KEY]
```

- **Server-Side API Key Security:** Provider keys (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`) are read exclusively by the Express backend from environment variables / **Settings → Secrets**. They are never sent to the browser, stored in `localStorage`, prefixed with `VITE_`, or bundled into `dist/`. Clients receive only boolean configuration flags (`providers: { gemini, anthropic, openrouter }`).
- **Strict No-Silent-Paid-Fallback Policy:**
  - Unapproved (`needs_review`) or `disabled`/`retired` models are blocked at `/api/chat/stream` with HTTP `403`.
  - Free-tier requests never fall back silently to paid models; `updateRegistrySettings` explicitly rejects setting a paid model as `fallbackModelId`.
  - Paid models enforce a configurable `dailySpendCapUsd` and return HTTP `429` if reached.
- **Input & History Bounds:** `/api/chat/stream` enforces per-IP rate limiting (30 req/min), validates message types and length (max 32,000 characters), limits attachment count, and caps conversation history to the 40 most recent turns.

## Dynamic Governance vs. Redeploy-Required Changes

| Change Type | Requires GitHub Commit / Redeploy? | How It Works |
| --- | --- | --- |
| Refresh provider catalogues (Anthropic / OpenRouter APIs) | **No** (Dynamic) | Admin clicks **Refresh Catalogue** (`POST /api/admin/catalogue/refresh`); updates `server/data/model-catalogue.json`. Newly discovered models default to `needs_review`. |
| Approve, review, or disable models | **No** (Dynamic) | Admin toggles status via `PATCH /api/admin/catalogue/models/:id` in **Manage Model Catalogue**; `GET /api/models` and the frontend `ModelSelector` reflect changes immediately. |
| Change default model, free fallback, max tokens, or daily spend cap | **No** (Dynamic) | Updated live via `PATCH /api/admin/catalogue/settings` in `server/data/model-catalogue.json`. |
| Add/rotate `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, or `ADMIN_EMAIL` | **Restart / Secret Update** | Update server Secrets / environment variables and restart the backend server process. |
| Add a new provider SDK adapter or change UI/backend code | **Yes** | Modify source code, rebuild (`npm run build`), and redeploy. |

## Implemented Features

- **Camellia Neural Garden Theme & Dual Modes:** Obsidian/midnight obsidian-and-glass dark interface (`#080C14` / `#0E1522`) and crisp light mode with a custom inline-SVG botanical/circuit Camellia mark, subtle ambient constellation lattice, responsive collapsible sidebar/drawer, and `prefers-reduced-motion` support.
- **Multi-Provider Streaming Chat:** Real-time Server-Sent Events (SSE) token streaming across Google Gemini (`gemini-4-hydrogen`, `gemini-3.1-flash-lite`), Anthropic (`claude-fable-5-2` and discovered Claude models), and OpenRouter (`openrouter/free` and discovered models), displaying `modelUsed · providerUsed` on every assistant message.
- **Dynamic Model Selector, Free-Only Enforcement & Paid Confirmation:** Frontend `ModelSelector` loads configured & approved models dynamically from `GET /api/models` with provider and truthful pricing labels (`Free`, `Paid`, or `Price not verified`), clear provider/cost disclosure, a server-enforced **Free models only** toggle, and explicit confirmation before dispatching a paid/unverified model request.
- **Admin Governance UI & Scheduled Refresh:** Authenticated admins (`ADMIN_EMAIL` or first registered user) can manage **Model Catalogue Governance** from the header, model dropdown, or account modal, backed by periodic scheduled background refreshes and persistent `server/data/model-catalogue.json`.
- **Multi-Turn Conversations & Device History:** Conversation threads, renaming, full-text chat search, and device-local persistence (`localStorage`) with a one-click **Clear** history control in the sidebar.
- **Safe Markdown, Math & Code Blocks:** Safe Markdown rendering (`react-markdown`) with `remark-gfm`, KaTeX equations (`remark-math` + `rehype-katex`), and syntax-highlighted code blocks (`highlight.js` + `rehype-highlight`) with copy buttons.
- **Optional Grounding & Multimodal Attachments:** Toggleable Google Search grounding on supported Gemini models with cited source cards, plus image, PDF, audio, and UTF-8 code/text file analysis.
- **On-Demand Voice & Account Sync:** Browser Web Speech narration supporting English and Bengali, optional server-backed account sync (`server/authStore.ts`), and an optional standalone FastAPI backend in `camellia-ai/`.

## Planned Features (Not Yet Implemented)

- **Managed Database & Cloud Persistence:** Replacing local JSON storage (`server/data/*.json`) and browser `localStorage` with a hosted database (e.g., PostgreSQL / Cloud SQL) for cross-device account synchronization.
- **Per-User Billing & Bring-Your-Own-Key (BYOK):** Allowing end users to supply encrypted personal provider keys or metered individual usage quotas.
- **Bounded Agent Tool Use:** Optional server-authorized external tool integrations beyond built-in Gemini Google Search grounding.

## What Is Not Implemented

- **No Payment Processor or Real-Time Provider Billing Webhooks:** Usage caps use server-side output estimation (`dailySpendCapUsd`) rather than live billing webhooks.
- **Static Hosting Requires a Separate Backend:** GitHub Pages only serves static frontend files (`dist/`). Multi-provider chat, auth, and dynamic catalogue routes require running `server.ts` and setting `VITE_API_BASE_URL` if hosted on a separate origin.

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set `GEMINI_API_KEY` (and optionally `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `ADMIN_EMAIL`) in your server environment (never commit `.env` files).
3. Start development server on port `3000`:
   ```bash
   npm run dev
   ```
4. Build and run production server:
   ```bash
   npm run build
   npm start
   ```

## Testing Checklist

1. Open the app and verify `GET /api/models` populates `ModelSelector` dynamically with approved models (excluding `needs_review` models).
2. Send a message and confirm streamed Markdown output plus the `modelUsed · providerUsed` footer label on the assistant reply.
3. Sign up / log in as admin, open **Manage Model Catalogue (Admin)**, and verify catalogue refresh, approve/disable toggles, default/free-fallback switching, and rejection of setting a paid model as automatic fallback.
4. Attempt calling an unapproved (`needs_review` / `disabled`) model or an approved model with no configured provider key, and confirm clear `403`/`500` errors with no silent paid fallback or secret exposure.
5. Run `npm run lint` and `npm run build`, and confirm `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, and `OPENROUTER_API_KEY` never appear in `src/` or `dist/`.
