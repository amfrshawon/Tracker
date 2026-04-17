# Deployment Checklist

This guide makes the app visible on the web by deploying `RabbyTrack` to Vercel with a managed PostgreSQL database.

## 1. Prerequisites

- GitHub repo is already pushed (done)
- Vercel account (can sign in with GitHub)
- Managed PostgreSQL database (Neon, Supabase, Railway, or similar)

## 2. Create Production Database

1. Create a new PostgreSQL database in your provider.
2. Copy connection strings:
   - Pooled/read-write URL for app runtime
   - Direct URL for migrations
3. Keep SSL enabled if your provider requires it.

## 3. Configure Vercel Project

1. Open [https://vercel.com/new](https://vercel.com/new)
2. Import your `RabbyTrack` GitHub repository
3. Framework should auto-detect as `Next.js`
4. Before deploy, add these environment variables:

```bash
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
AUTH_SECRET=<long-random-secret>
AUTH_URL=https://<your-vercel-domain>
ENABLE_SIGNUP=false
```

Optional OAuth env vars:

```bash
GITHUB_ID=...
GITHUB_SECRET=...
```

Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

## 4. Deploy

1. Click `Deploy` in Vercel.
2. Wait for build to complete.
3. Open the deployment URL.

At this point, UI should load, but database tables may not exist yet.

## 5. Run Production Migrations and Seed (Once)

Run these commands from your local machine in this repo:

```bash
cd <your-local-repo-path>

# Set production DB URLs for this terminal session
export DATABASE_URL="postgresql://..."
export DIRECT_URL="postgresql://..."

npx prisma migrate deploy
npx tsx prisma/seed.ts
```

If you want different initial admin credentials for production seed:

```bash
export DEMO_ADMIN_EMAIL="you@yourcompany.com"
export DEMO_ADMIN_PASSWORD="StrongPassword123!"
npx tsx prisma/seed.ts
```

## 6. Verify Deployment

1. Open app URL: `https://<your-vercel-domain>`
2. Open health endpoint: `https://<your-vercel-domain>/api/health`
3. Confirm database is connected and pages load without 500 errors.

## 7. Recommended Hardening

1. Keep `ENABLE_SIGNUP=false` unless you need open sign-up.
2. Rotate temporary tokens and secrets after setup.
3. Use branch protection on `main` with required CI checks.
4. Add custom domain in Vercel if needed.
   - Planned domain: `track.fazlayrabby.com`

## 8. Common Issues

- `Prisma P1001`:
  - Usually wrong host/port or blocked network.
  - Recheck DB URL and provider network settings.
- Auth redirect/login issues:
  - Ensure `AUTH_URL` exactly matches deployed base URL.
- Build succeeds but app errors on API routes:
  - Missing env vars in Vercel project settings.
