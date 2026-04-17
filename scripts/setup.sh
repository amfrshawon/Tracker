#!/usr/bin/env bash
set -euo pipefail

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install Node.js 20+ first."
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

echo "Installing dependencies..."
npm install

echo "Generating Prisma client..."
npm run db:generate

echo "Starting Postgres with Docker Compose..."
docker compose up -d postgres

echo "Running database migrations..."
npm run db:migrate -- --name init_core

echo "Seeding database..."
npm run db:seed

echo "Setup complete. Start app with: npm run dev"
