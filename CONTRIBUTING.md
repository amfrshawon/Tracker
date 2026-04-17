# Contributing

## Prerequisites

- Node.js 20+
- npm 10+
- Docker (for local PostgreSQL)

## Local Development

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:generate
npm run db:migrate -- --name init_core
npm run db:seed
npm run dev
```

## Quality Checks

```bash
./scripts/verify.sh
# or manually:
npm run sanitize
npm run lint
npm run typecheck
```

## Commit Guidelines

- Keep commits focused and small
- Include migration files with schema changes
- Update docs when behavior changes
