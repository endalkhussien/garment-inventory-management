# Garment Inventory Management

Garment manufacturing and retail management system for Ethiopia.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn-style UI primitives
- Prisma + PostgreSQL
- NextAuth (credentials, role-based session)

## Getting started (local)

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Set `DATABASE_URL` in `.env` to a running Postgres (local or Neon).
   Do **not** use `localhost` if you only have a cloud DB.

3. Install and set up the database:

```bash
npm install
npx prisma db push
npm run db:seed
```

4. Run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy on Vercel + Neon (required for production login)

Vercel **does not** load your local `.env` file. Production must get vars from the Vercel dashboard.

1. Create a Neon project → **Connect** → copy the pooled connection string.
2. On your machine (one-time), point `.env` `DATABASE_URL` at Neon, then:

```bash
npx prisma db push
npm run db:seed
```

3. In **Vercel → Project → Settings → Environment Variables** set:

| Variable | Production value |
|----------|------------------|
| `DATABASE_URL` | Neon URL (`…neon.tech…`, **never** `localhost:5432`) |
| `NEXTAUTH_URL` | `https://YOUR-APP.vercel.app` |
| `NEXTAUTH_SECRET` | long random string |

4. Redeploy the project.

If `DATABASE_URL` on Vercel is still `localhost:5432`, login will always fail with a DB / credentials error.

## Seed credentials

- Admin: `admin@example.com` / `admin123`
- Manager: `manager@example.com` / `admin123`
- Shop: `shop@example.com` / `admin123`

## Project structure

- `app/(dashboard)/` — authenticated shell and pages
- `app/(auth)/` — login
- `components/layout/` — sidebar, top bar, app shell
- `components/ui/` — shared UI primitives
- `lib/` — auth, prisma, validations
- `prisma/` — schema and seed
