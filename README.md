# RabbyTrack

Open-source, enterprise-grade project tracking platform (Asana-style) built with Next.js, Prisma, PostgreSQL, and Auth.js.

## Current Status

This repository contains a GitHub-ready foundation:

- Multi-workspace schema designed for RBAC and collaboration
- Auth.js + Prisma adapter configuration
- Core RBAC permission utilities
- Workspace and project bootstrap API routes
- Dockerized PostgreSQL for local/dev team setup
- CI workflow for lint + typecheck + Prisma validation

## Tech Stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, Framer Motion, Zustand
- Backend: Next.js Route Handlers, Prisma ORM, PostgreSQL, Auth.js (NextAuth v5)
- DnD (planned screens): dnd-kit

## 1. Clone and Run

```bash
git clone <your-github-repo-url>
cd RabbyTrack
cp .env.example .env
```

If you want team self-registration enabled, set `ENABLE_SIGNUP=\"true\"` in `.env`.

Generate an auth secret and set it in `.env`:

```bash
openssl rand -base64 32
# or
node scripts/generate-auth-secret.mjs
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Install and initialize:

```bash
npm install
npm run db:generate
npm run db:migrate -- --name init_core
npm run db:seed
npm run dev
```

One-command setup alternative:

```bash
./scripts/setup.sh
```

Run verification before pushing:

```bash
./scripts/verify.sh
```

App: `http://localhost:3000`
Health check: `http://localhost:3000/api/health`

## 2. Default Seed Credentials (Local Only)

The seed creates this default admin user unless overridden via env vars:

- Email: `admin@rabbytrack.local`
- Password: `ChangeMe123!`

Override with:

```bash
DEMO_ADMIN_EMAIL=you@company.com DEMO_ADMIN_PASSWORD='yourStrongPass' npm run db:seed
```

## 3. API Endpoints (Foundation)

- `GET /api/workspaces` - List current user workspaces
- `POST /api/workspaces` - Create workspace and owner membership
- `GET /api/projects?workspaceId=...` - List projects in workspace
- `POST /api/projects` - Create project + default statuses + section
- `GET /api/health` - Service/database health probe
- `POST /api/auth/register` - Create a user (disabled unless `ENABLE_SIGNUP=true`)

## 4. Security/Sanitization

- Secrets are excluded via `.gitignore`
- `.env.example` contains placeholders only
- Runtime env validation is enforced in `src/lib/env.ts`
- Authentication and RBAC checks are in route handlers

## 5. CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs:

- `npm install`
- `npx prisma validate`
- `npm run sanitize`
- `npm run lint`
- `npm run typecheck`

## 6. Recommended GitHub Setup

1. Create repository on GitHub.
2. Push this directory.
3. Add repository secrets if needed (for deploy/OAuth).
4. Protect `main` branch with required CI checks.

## 7. Project Docs

- Architecture: `docs/ARCHITECTURE.md`
- Deployment: `docs/DEPLOYMENT.md`
- GitHub setup: `docs/GITHUB_SETUP.md`
- Contributing: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
- License: `LICENSE`
