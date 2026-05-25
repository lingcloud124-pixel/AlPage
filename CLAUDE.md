# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Theme Studio — AI-assisted OA theme design and packaging tool for Landray EKP products (MK, V14–V17). Users chat with an AI to describe a theme; the system generates a background image, extracts/computes a full color palette, previews the theme in real-time HTML, then packages everything into product-specific ZIP files.

## Commands

### Development

```bash
# Install all dependencies (3 separate package.json files)
npm install && cd web && npm install && cd .. && cd server && npm install && cd ..

# Configure environment
cp .env.example .env
# Edit .env — set ADMIN_PASSWORD (required), EKP SSO vars if needed

# Start all dev services (server :3001, web :5173, export bridge :5174)
npm run dev:all

# Individual services
cd web && npm run dev          # Vite dev server only
cd server && npm run dev       # Express server only (tsx watch)
cd web && npm run export-bridge  # Playwright screenshot bridge only
```

### Build & Production

```bash
npm run build          # Compile server TS + build web (vite build)
npm start              # PM2 start (serves web/dist + API on :3001)
npm stop               # PM2 stop
npm run restart        # PM2 restart
npm run logs           # PM2 logs
```

### Testing

```bash
npm test                      # Vitest (all unit tests)
npm run test:coverage         # Vitest with v8 coverage
npm run test:types            # TypeScript check (server + web)
npx vitest run tests/unit/WebColorUtils.test.ts  # Single test file
```

### Export CLI (bypass web UI)

```bash
# Build + verify theme packages
npm run export:check -- "Theme Name" theme-id '#HEXCOLOR' light-ui /path/to/bg.jpg mk,ekp_v17

# Verify existing output only
npm run export:verify -- output/path/输出包 --products mk,ekp_v17
```

## Architecture

### Three Services

| Service | Port | Tech | Role |
|---------|------|------|------|
| **Web** | 5173 (dev) | Vite 6 + Tailwind v4 + vanilla TS | Single-page theme editor with AI chat |
| **Server** | 3001 | Express 4 + sql.js (SQLite) | API proxy, auth, export jobs, admin config |
| **Export Bridge** | 5174 | Playwright (Chromium) | Headless screenshots for theme packaging |

In production, Express serves the built `web/dist/` static files directly.

### Web ↔ Server Communication

- Dev mode: Vite proxies `/api/*` to Express at `:3001` (600s timeout for AI streaming)
- API client (`web/src/api-base.ts`) auto-resolves base URL based on environment
- AI API keys never reach the browser — server proxies all chat/image requests

### Key Data Flow: Theme Generation Pipeline

1. User describes theme → AI chat (`web/src/chat-manager.ts` → `/api/theme/chat`)
2. AI generates background image (`/api/theme/image` → MiniMax/Volcengine)
3. Primary color extracted from background via Canvas quantization
4. Full palette derived by `deriveColorsFromPrimary()` in `web/src/theme/color-utils.ts` — computes all 23 CSS variables
5. CSS variables applied to HTML templates (login + desktop + 8 header variants) in `#previewPanel`
6. User iterates via chat or manual color editor (`web/src/components/color-editor.ts`)
7. User triggers export → server creates background job → asset prep → Playwright screenshots → `theme_builder.py` packages ZIPs → `verify-build.py` validates

### Code Organization

```
web/src/
  chat-manager.ts          # Core chat loop (72KB) — message handling, tool call parsing
  theme-engine.ts          # CSS variable application, template rendering
  project-manager.ts       # Project CRUD in localStorage
  package-manager.ts       # Export UI, product selection, job dispatch
  api-base.ts              # API client with auto base URL resolution
  auth.ts                  # EKP SSO token exchange
  agent/                   # AI layer
    system-prompt.ts       # 29KB system prompt defining AI as "OA Theme Designer"
    chat-client.ts         # Chat API client, routes through backend proxy
    tool-call-utils.ts     # Parses AI tool call responses
    knowledge-base.ts      # Preset theme matching
  tools/                   # Tool execution
    executor.ts            # Central executor (42KB) — generate_theme_pipeline, update_colors, etc.
  theme/                   # Color computation
    color-utils.ts         # deriveColorsFromPrimary() — core algorithm
  templates/               # 31 HTML/CSS preview templates
  export/                  # Export pipeline client-side
  components/              # Color editor, sidebar

server/src/
  index.ts                 # Express app setup, DB init, route registration
  db.ts                    # SQLite via sql.js (users, model_config, conversations, credits, usage_logs)
  export-job-runner.ts     # Background job queue for export
  crypto.ts                # AES encryption for stored API keys
  routes/
    ai-proxy.ts            # /api/theme/chat, /api/theme/image — proxies to AI providers
    export-jobs.ts         # /api/theme/export-jobs — create/monitor export jobs
    model-config.ts        # Admin model config (API keys, endpoints)
  middleware/
    auth.ts                # EKP SSO cookie validation
    admin-auth.ts          # Admin session cookie
    credits.ts             # Per-user credit deduction
    rate-limit.ts          # Per-user rate limiting
  admin/                   # Pre-built static admin panel HTML

config/                    # JSON config files (NOT hardcoded in source)
  variable-mapping.json    # CSS variable mapping per product version (36KB)
  header-mapping-light-ui.json  # Header type mappings
  build-verification-rules.json # Expected zip structure per product
  theme-relations.json     # Dark-UI color relationships
```

## Important Patterns

- **Config-as-data**: All product-specific rules live in `config/*.json`, not in source code. `variable-mapping.json` is the single source of truth for CSS variable mapping across MK/V14–V17.
- **CSS variable-driven theming**: All visual customization flows through 23 CSS custom properties on `#previewPanel`. Templates are pure HTML+CSS that respond to variable changes.
- **Reference template packaging**: `theme_builder.py` works by cloning reference ZIP templates from `assets/references/samples/` and injecting new colors/images, not generating from scratch.
- **Server-side AI proxy**: API keys stored encrypted in SQLite, never exposed to browser. All AI calls route through server endpoints.
- **Multi-tenant**: User isolation via EKP SSO cookies, per-user credits and conversations.
- **Dual export paths**: Local (Playwright bridge on :5174) or server-side export job runner.

## Environment Variables

Configured via `.env` (git-ignored). Key variables:
- `PORT` — Server port (default 3001)
- `ADMIN_PASSWORD` — Required. Admin panel access password.
- `EKP_BASE_URL` — EKP SSO integration endpoint
- `ENABLE_DEV_AUTH=true` — Bypass SSO for local dev (use `DEV_LOGIN_NAME`)
- `SECRET_ENCRYPTION_KEY` — AES key for encrypting stored API keys (16+ chars)

Model provider config (API keys, endpoints, model names) is managed through `/admin` web UI and stored in SQLite, not in `.env`.

## Testing

128 unit tests in `tests/unit/` using Vitest. Tests are contract-style — they verify expected behaviors and constraints rather than implementation details. Coverage includes server routes, web components, color utilities, export pipeline, build verification, and multi-user isolation.

Web E2E tests use Playwright in `web/e2e/` (smoke, preview-scale).

## Product Versions

Supported theme packages: **MK, EKP V14, V15, V16, V17** — each generates a theme ZIP + login ZIP (up to 10 total). V12/V13/V13.5 are no longer supported.
