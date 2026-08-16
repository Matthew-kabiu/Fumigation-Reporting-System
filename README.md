<div align="center">

# Fumivanta

### Offline-Capable Fumigation Operations & Reporting Platform

**From treatment to trusted report.**

Fumivanta is a production-grade, offline-first fumigation management system
that takes a fumigation company from job dispatch to an approved, customer-facing
report — with full traceability in between. Each deployment serves a single
fumigation company with branch-scoped teams, customers, sites, jobs, chemical
stock, evidence capture, configurable approvals, and a customer report portal.

[Features](#features) · [Tech Stack](#tech-stack) · [Architecture](#architecture) · [Getting Started](#getting-started) · [Docker](#docker) · [Verification](#verification) · [License](#license)

</div>

---

## About

Fumivanta solves a specific operational problem for fumigation and pest-control
companies: field teams capture treatments in the field — often with no
connectivity — and those records must become trustworthy, signed, approved
reports for customers. Most field software forces a trade-off between offline
capture and auditable reporting. Fumivanta does both.

Built with **Next.js**, **React**, **TypeScript**, **Clerk**, and **Convex**, the
platform is a progressive web app (PWA) that installs to the field worker's phone,
queues submissions when offline, and reconciles automatically when back online.
Administrators get role-based access across branches, live inventory usage
against jobs, and a configurable approval workflow that produces the final
customer report — complete with digital signatures and audit history.

## Features

**Field operations (offline-first)**

- Installable PWA with offline job download and local draft persistence
- Treatment form with chemical usage, checklists, digital signatures, and GPS location
- Photo and evidence capture queued for sync
- Durable submission outbox with automatic retry when connectivity returns

**Company operations**

- Branch-scoped users, customers, sites, jobs, and roles
- Role-based access control (company admin, branch roles, field technicians, customers)
- Job lifecycle from assignment through treatment to reporting
- Chemical stock tracking with usage recorded against each job

**Reporting & compliance**

- Configurable approval policy before a report is released
- Digital acceptance signature from the customer
- Customer report portal for approved reports
- Complete audit trail of actions and changes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js](https://nextjs.org/) (App Router, server components) |
| Frontend | React, TypeScript, CSS with design tokens |
| Authentication | [Clerk](https://clerk.com/) — custom sign-in/sign-up, Google SSO, role-based access |
| Backend | [Convex](https://convex.dev/) — reactive queries, functions, storage, auth |
| Offline sync | IndexedDB local database with retry-state outbox |
| Testing | Vitest (unit + backend integration) |
| Containerization | Docker + Compose (dev and production stacks) |

## Architecture

```text
frontend/   Next.js PWA, Clerk-authenticated UI, offline-first field workflows
backend/    Convex schema, functions, storage, authorization, and tests
```

The frontend is a Next.js application rendered against Convex's reactive data
layer. Convex functions run on a Convex deployment — never as a separate
persistent backend container — and enforce every authorization rule server-side.
Offline field work writes to a local IndexedDB database and flushes through a
retry-state submission outbox once the device reconnects.

## Getting Started

### Prerequisites

- Node.js 20+
- A Clerk application (for authentication)
- A Convex project (for the backend)
- Environment files: create `frontend/.env.local` for the frontend and
  `backend/.env.local` for Convex, following the key names used in each
  package's environment contract.

### Run the backend

```bash
cd backend
npm install
npx convex dev
```

### Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:${PORT}` using the `PORT` value from
`frontend/.env.local`. Clerk development origins are configured for
`localhost`; using `127.0.0.1` for protected routes may be rejected.

## Docker

Development (hot reload):

```bash
DOCKER_BUILDKIT=1 docker compose --env-file .env.dev \
  -f docker-compose.dev.yml up --build
```

Production frontend and the one-shot Convex deploy profile:

```bash
DOCKER_BUILDKIT=1 docker compose --env-file .env.prod \
  -f docker-compose.yml up --build
```

Convex functions always run on a Convex deployment, never as a duplicate
persistent backend container.

## Verification

```bash
cd backend && npm run typecheck && npm test
cd frontend && npm run typecheck && npm run lint
```

Production builds are run only with the project owner's explicit approval.

## Open Source

Fumivanta is open-source software — use it, adapt it, and build on it. See
[LICENSE](./LICENSE) for the full MIT license text.

## Maintainer

Built and maintained by **Matthew Kabiu**, CEO of
[SpookieLabsInc](https://www.spookielabsinc.site).

---

<div align="center">

Made with care by [SpookieLabsInc](https://www.spookielabsinc.site) — *From treatment to trusted report.*

</div>
