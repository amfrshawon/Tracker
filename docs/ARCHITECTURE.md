# Architecture (Foundation)

## Core Domains

- Identity/Auth: Auth.js + Prisma adapter
- Tenancy: Workspaces as top-level boundary
- Authorization: Workspace roles + permission matrix
- Delivery: Next.js Route Handlers, later background workers
- Data: PostgreSQL via Prisma

## Multi-Tenant Model

- `Workspace` is tenant root
- `WorkspaceMember` controls access
- `Project` belongs to exactly one `Workspace`
- `Task` belongs to one `Project` and one `Workspace`

## RBAC

Roles:

- `ADMIN`
- `MEMBER`
- `VIEWER`

Permission checks live in:

- `src/lib/rbac.ts`
- `src/lib/permissions.ts`

## API Pattern

- Parse/validate input using Zod
- Run `requireUser` or workspace/project permission guards
- Execute Prisma transaction for write-heavy endpoints
- Return structured JSON + explicit error status codes

## Data Integrity

- Unique indexes for slug/key collisions
- Transactional creation for workspace/project bootstrap
- Seed script for deterministic local setup

## Next Expansion Phases

- Task CRUD + List/Board/Calendar data APIs
- Custom fields + field value engines
- Dependency graph validation
- Automation engine with trigger/action executor
- Time tracking and portfolio dashboards
