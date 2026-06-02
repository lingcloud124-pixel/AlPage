# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AlPage (Theme Studio) is a **pre-sales Portal Agent workbench** — a web app where pre-sales staff generate customer portal proposals through AI-assisted conversations. The system generates visual themes, applies them to portal templates (login page, desktop workspace with configurable card layouts), and supports preview, editing, confirmation, and export.

The product is transitioning from a "theme design & export tool" to a "Portal Agent workbench". Current automated capabilities focus on visual theme generation; portal structure and sample content automation are target capabilities.

## Commands

```bash
# Install all dependencies (three package.json files)
npm install && cd web && npm install && cd ../server && npm install && cd ..

# Development (two terminals)
cd web && npm run dev          # Vite dev server on :5173
cd server && npm run dev       # Express API on :3001 (tsx watch)

# Run both at once
npm run dev:all

# Tests
npm test                       # Run all vitest tests
npx vitest run tests/unit/SomeFile.test.ts   # Single test file
npx vitest run --reporter=verbose             # Verbose output
npm run test:coverage          # Coverage report
npm run test:types             # TypeScript type-check (server + web)

# Build
npm run build                  # tsc server + vite build web

# Production (PM2)
npm start                      # pm2 start ecosystem.config.cjs
npm run stop / restart / logs / status

# Docker
docker build -t theme-studio .
```

## Architecture

### Two-Part System: Web Frontend + Express Server

**Web** (`web/`) — SPA built with Vite + TypeScript (no React/Vue). Pure vanilla TS with DOM manipulation. Uses Tailwind CSS v4 via Vite plugin.

- `index.html` — Main app shell (chat panel, preview panel, sidebar, workspace editor)
- `src/main.ts` — Entry point; initializes all modules on DOMContentLoaded
- `src/chat-manager.ts` (~54KB) — Core chat loop: sends messages to AI, parses tool calls, executes them, manages conversation flow. The largest and most critical file.
- `src/portal-agent.ts` — Portal profile extraction from chat messages, profile completeness scoring, draft generation, summary building
- `src/project-manager.ts` — In-memory project store (`Map<string, Project>`); project CRUD with color/workspace/portal state
- `src/theme-engine.ts` — CSS variable manipulation on the preview panel (`setThemeVar`, `applyTemplateSpecificThemeVars`)
- `src/ui-setup.ts` — Tab switching, preview panel, collapsible panels, result actions
- `src/workspace/` — Workspace grid editor (configurable card layout with drag/resize)

**Server** (`server/`) — Express 4 + sql.js (SQLite in-process). Single-file DB at `data/theme-studio.db`.

- `src/index.ts` — Express app setup, middleware chain, route mounting, graceful shutdown
- `src/db.ts` — SQLite via sql.js with debounced disk writes and periodic backups
- `src/routes/ai-proxy.ts` — Proxies chat/image requests to configured AI model providers
- `src/routes/model-config.ts` — Admin CRUD for AI model endpoint/key/model settings (stored in DB)
- `src/routes/workspace.ts` — Project persistence (save/load workspace configs)
- `src/routes/conversations.ts` — Chat history persistence
- `src/routes/export-jobs.ts` — Async export job management (screenshot + zip packaging)
- `src/export-job-runner.ts` — Background job processor for export pipeline
- `admin/` — Static admin panel for configuring model settings

Vite dev server proxies `/api` requests to `localhost:3001`.

### AI Integration

The AI flow is browser-centric: the frontend constructs system prompts (`web/src/agent/system-prompt.ts`), sends chat completion requests through the server's `/api/theme/chat` proxy, parses tool calls from the response, and executes them client-side via `web/src/tools/executor.ts`.

Available tools: `generate_theme_pipeline` (full theme generation), `update_colors` (apply color vars), `analyze_image`, `generate_background`, `screenshot`, `build`, `verify`.

The Portal Agent workflow: extract customer profile from chat → score completeness → build summary → generate portal draft → apply to project (theme + workspace seed).

### Templates & Theming

`web/src/templates/` contains HTML partials for portal components (login, desktop, header variants, sidebar). Each has paired `.html` + `.css` files. `loader.ts` assembles them into preview iframes.

Templates are `light-ui` or `dark-ui`. Theme is applied via CSS custom properties on `#previewPanel`. Color derivation: `web/src/theme/color-utils.ts` generates a full palette from a single primary color.

`config/web-template-registry.json` maps template metadata; `config/variable-mapping.json` maps CSS variables.

### Export Pipeline

Export uses Playwright to screenshot template pages, then packages them via `theme_builder.py` (Python) or the JS-based zip archiver. The server manages async export jobs with status tracking (`queued → preparing → capturing → packaging → verifying → completed`).

### Test Suite

147 unit tests in `tests/unit/`, using Vitest in Node environment. Tests are mostly **contract/style tests** that read source files and assert on CSS properties, HTML structure, or API contracts — they don't spin up browsers. Helper `tests/helpers/read-css.ts` reads CSS from `web/src/styles.css` and its imports.

## Key Conventions

- **Language**: Code comments and UI text are in Chinese (zh-CN). Variable/function names are English.
- **No framework**: The web frontend is vanilla TypeScript with direct DOM manipulation — no React, Vue, or component framework.
- **Three separate npm projects**: Root (scripts/tests), `web/`, `server/` — each has its own `package.json`, `tsconfig.json`, and `node_modules`.
- **Auth**: EKP SSO cookie-based auth in production. Dev mode bypasses auth on localhost (`ENABLE_DEV_AUTH=true`).
- **Model config**: AI model settings (endpoint, API key, model name) are stored in SQLite via `/admin` panel, not in `.env`.
- **CSS variables**: Theme is applied exclusively through CSS custom properties on `#previewPanel`. Never mutate template HTML directly for theming.
- **Project state**: Projects live in browser memory (`Map`). Persistence to server happens via `/api/theme/projects` and conversation snapshots.

## Environment Setup

1. `cp .env.example .env` and set `ADMIN_PASSWORD`
2. Start server first, then web
3. Visit `http://localhost:5173/admin` to configure AI model (API Key, Endpoint, Model Name)
