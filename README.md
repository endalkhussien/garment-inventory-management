<<<<<<< HEAD
# garment-inventory-management
=======
# Garment Inventory Management

Garment manufacturing and retail management system for Ethiopia.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn-style UI primitives
- Prisma + PostgreSQL
- NextAuth (credentials, role-based session)

## Getting started

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Start PostgreSQL and update `DATABASE_URL` in `.env`.

3. Install dependencies and set up the database:

```bash
npm install
npm run db:push
npm run db:seed
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seed credentials

- Admin: `admin@example.com` / `admin123`
- Manager: `manager@example.com` / `admin123`

## Project structure

- `app/(dashboard)/` — authenticated shell and pages
- `app/(auth)/` — login
- `components/layout/` — sidebar, top bar, app shell
- `components/ui/` — shared UI primitives
- `lib/` — auth, prisma, validations
- `prisma/` — schema and seed
>>>>>>> bad2872 (Scaffold Next.js foundation with auth, layout shell, and Prisma models)
