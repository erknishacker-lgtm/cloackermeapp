# Anti-Bot Smart Router Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a ready-to-run MyCloaker-style dashboard with a functional anti-bot smart link router, campaign creation, redirects, and access logs.

**Architecture:** React + Vite renders the admin dashboard. Express serves API endpoints and public redirect routes. A pure security decision module scores requests so it can be tested independently from HTTP.

**Tech Stack:** React, Vite, Express, Vitest, Supertest, Lucide React, CSS.

## Global Constraints

- Keep the dark operational UI from the supplied screenshot.
- Build legitimate anti-bot protection for suspicious automation, not ad-platform evasion.
- Real destination URLs must be protected by deployment architecture as well as routing rules.
- Use TDD for request classification and HTTP routing behavior.

---

### Task 1: Security Decision Engine

**Files:**
- Create: `src/server/security.js`
- Test: `tests/security.test.js`

**Interfaces:**
- Produces: `evaluateRequest(input, campaign, state)` returning `{ decision, riskScore, reasons, targetUrl, device }`.

- [ ] Write tests for obvious bot, human browser, and rate limit decisions.
- [ ] Run tests and verify they fail because `security.js` is missing.
- [ ] Implement the minimal scoring logic.
- [ ] Run tests and verify they pass.

### Task 2: HTTP Backend

**Files:**
- Create: `src/server/app.js`
- Create: `src/server/index.js`
- Test: `tests/server.test.js`

**Interfaces:**
- Consumes: `evaluateRequest(input, campaign, state)`.
- Produces: Express app with `/api/campaigns`, `/api/events`, `/api/stats`, `/r/:slug`, and `/health`.

- [ ] Write tests for campaign creation and redirect/fallback behavior.
- [ ] Run tests and verify they fail because the Express app is missing.
- [ ] Implement in-memory campaign/event storage with seed data.
- [ ] Run tests and verify they pass.

### Task 3: Dashboard UI

**Files:**
- Create: `src/ui/main.jsx`
- Create: `src/ui/App.jsx`
- Create: `src/ui/styles.css`
- Create: `index.html`

**Interfaces:**
- Consumes: backend APIs.
- Produces: MyCloaker-style dashboard with campaign form, sidebar, stats, events, and test link panel.

- [ ] Build app shell and reusable form controls.
- [ ] Wire create campaign form to `/api/campaigns`.
- [ ] Render recent events and stats from APIs.
- [ ] Add responsive layout and visual match pass.

### Task 4: Verification

**Files:**
- Modify: `README.md`

- [ ] Document local run and DNS/deploy architecture.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Start dev server and verify browser screenshot against supplied concept.
