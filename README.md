# OpsPilot AI — POC

**OpsPilot AI** is a proof-of-concept for confidence-gated L1 support triage and
auto-remediation, presented as a collaborative initiative between **StratifyIT.ai**
and **Zen & Art**.

Two independent gates decide how autonomous the AI is allowed to be on any ticket:
a **confidence score** (is this the right runbook, and are prerequisites met?) and a
**risk tier** (a ceiling on autonomy — read-only actions can go fully autonomous;
write/downtime/reboot actions require human approval at each gated step). Five sample
use cases drive the demo: certificate renewal, log collection, virtual disk degraded,
NIC port down, and a host CPU usage alert.

## Current status — UI prototype only

This repository currently contains the **working frontend prototype** with no backend.
All ticket/agent-run data is scripted client-side state that mirrors the intended
API contract. A **Supabase backend** (tickets, agent runs, runbooks, vendor cases,
auth/RBAC, realtime step streaming) is planned as the next step; the state store
(`frontend/src/state/DemoStore.tsx`) documents how each local behavior maps to it.

### Surfaces

- **Login** — demo account selection (L1 / Admin); auth is decorative until the backend lands.
- **External systems simulator** — deliberately un-branded page simulating ServiceNow,
  Jira, Email, and a raw monitoring-alert feed, with per-scenario "inject failure" toggles.
- **L1 console** — My queue, Auto-resolved monitor (with flag-for-review), and the
  Ticket detail live timeline: triage → KB lookup with citation → plan → step-by-step
  execution with approval gates, delayed reboot progress, before/after state cards, and
  cross-system status chips.
- **Admin dashboard** — Overview (stats, confidence/risk mapping, volume), Run history
  with audit trail, Vendor case tracker, Feedback review, and demo reset.

## Getting started

```bash
cd frontend
npm install
npm run dev
```

Other scripts (run from `frontend/`): `npm run build` (type-check + production build),
`npm run lint`, `npm run preview`.

## Deployment

Live at **https://ops-pilot-ai.stratifyit.ai** — deployed to GitHub Pages on every push
to `main` via `.github/workflows/deploy.yml` (builds `frontend/`, uploads `frontend/dist`
as the Pages artifact). The custom domain is set via `frontend/public/CNAME`, which Vite
copies into the build output; point a `CNAME` DNS record for `ops-pilot-ai` at
`<github-username>.github.io`.

## Stack

React 19 + TypeScript on Vite, Tailwind CSS v4, React Router (hash routing), and the
StratifyIT.ai design system tokens (Syne / Inter / JetBrains Mono, self-hosted via
Fontsource).

## Repository layout

```
ops-pilot-ai/
├── .github/workflows/deploy.yml   # GitHub Pages deploy on push to main
├── frontend/          # React SPA (this milestone)
│   ├── public/CNAME       # custom domain: ops-pilot-ai.stratifyit.ai
│   └── src/
│       ├── components/   # AppShell, badges, StratifyIT logo
│       ├── data/         # Scripted POC use-case scenarios & timeline builder
│       ├── state/        # Client-side demo store (→ Supabase later)
│       └── pages/        # Login, TicketGenerator, L1Console/, AdminDashboard/
└── README.md
```

Backend services (Supabase schema, agent orchestration, mocked infrastructure layer)
will be added alongside `frontend/` in later milestones.
