# Garment Inventory Management — System Guide

A product and architecture guide for **Esset Inventory** (multi-shop finished-goods inventory, sales, and finance), plus the manufacturing modules that still exist in the codebase.

Use this as the map of **what the system is**, **who uses it**, and **how the main flows work**.

---

## 1. What this system is

A web app for a garment business that sells finished goods across **multiple retail shops**, with a central **HQ / warehouse** view for admins.

**Primary use today (sidebar)**

| Need | Where it lives |
|------|----------------|
| Shared product catalogue | Products |
| Per-shop stock levels | Stock |
| Add stock (manual / CSV) | Restock |
| Record or import sales | Sales / Import |
| Shop staff roster | Staff |
| Cross-shop stock picture | Central inventory (admin) |
| Profit & loss by shop | Finance (admin) |
| Create / manage shops & logins | Manage shops (admin) |

**Still in the database and admin routes (not all in the current nav)**

- Raw materials, lots, stocktakes, capital assets  
- Production orders (BOM issue → output → finished goods at warehouse)  
- Shop warehouse orders & FG transfers  
- Approvals, payroll, classic reports  

Treat those as an **extended manufacturing / HQ subsystem**. They are real, but the simplified day-to-day product is multi-shop retail.

**Currency:** ETB (configurable via app settings).  
**Deploy model:** Next.js App Router on something like Vercel; Postgres (e.g. Neon).

---

## 2. Tech stack (short)

| Layer | Technology |
|-------|------------|
| App | Next.js 14 (App Router), React 18 |
| UI | Tailwind, shadcn-style components |
| Auth | NextAuth (Credentials + JWT, 12h session) |
| DB | PostgreSQL + Prisma |
| Forms | React Hook Form + Zod |
| Import | CSV / Excel (`xlsx`) |
| Charts | Recharts (finance) |

**Core env vars** (see `.env.example`):

```env
DATABASE_URL=...          # Postgres (pooled URL for serverless)
NEXTAUTH_URL=...          # Public app URL (localhost or Vercel)
NEXTAUTH_SECRET=...       # Session/JWT secret
```

**Local setup sketch**

```bash
cp .env.example .env   # fill the three vars
npm install
npx prisma db push
npm run db:seed
npm run dev
```

---

## 3. Roles and access

| Role | Who | Privilege model |
|------|-----|-----------------|
| **Admin** | HQ | Full admin surface |
| **Manager** | HQ-like | Same as Admin in code (`isAdminRole`) |
| **Shop** | One branch | Only shop portal paths; data limited to own shop |

### Auth behavior

- Login with **username or email** + password.  
- Session is a JWT: user id, role, branch (if shop), periodic revalidation (~15 minutes).  
- Inactive / missing users are invalidated and must log in again.  
- Middleware requires a valid token for almost everything except `/login` and auth API.

### Shop vs Admin (practical)

| Capability | Shop | Admin / Manager |
|------------|------|-----------------|
| Dashboard (scoped) | Own shop | Whole business |
| Products (create / view) | Yes (sell price; **no cost**) | Yes (full pricing) |
| Stock, restock, sales import | Own branch only | Any shop branch |
| Staff | Own shop | Any shop / HQ staff tools as implemented |
| Central inventory | No | Yes |
| Finance P&L | No | Yes |
| Manage shops, users, settings | No | Yes |
| Product **pricing** (buy / margin) | No | Yes |
| Production, raw materials, payroll, reports | No (blocked) | Routes exist (admin middleware) |

### Seed login (default after `npm run db:seed`)

| Field | Value |
|-------|--------|
| Username | `admin` |
| Email | `admin@example.com` |
| Password | `admin123` |

Seed creates roles, HQ warehouse, starter `SHOP1`, categories, and **only the Admin user**. Additional shop logins are created when an admin **initiates a shop** with a username/password.

---

## 4. Domain model (ideas)

### Organization

- **Branch** — warehouse and/or shop (`isWarehouse`, `isShop`).  
- **User** — optional `branchId` (required in practice for shop users).  
- **Role** — Admin / Manager / Shop.  
- **AppSetting** — company name, currency, thresholds, default margins, etc.

### Catalogue & money on products

```
Category → Product → ProductVariant (size, color, SKU)
                         ├── buyingPrice, sellingPrice, labor, overhead
                         ├── BOM lines → RawMaterial
                         └── PriceHistory
```

- **Product** = style (name, code, category).  
- **Variant** = sellable unit (size/color optional in UI; empty stored as a neutral placeholder).  
- **Shop create**: sets **selling** only; **buy cost forced to 0** until admin sets it.  
- Cost for finance/COGS uses **variant buying price**, not live BOM at sale time (unless you re-run cost tooling).

### Finished goods (retail inventory)

```
ProductVariant × Branch → FinishedGoodsStock (on-hand, reorder)
                       → FinishedGoodsMovement (ledger of every change)
```

Every stock change goes through a movement (sale, return, restock, transfer, order fulfill, adjustment). Negative stock is rejected.

### Sales & cash

```
Sale (receipt, branch, optional customer)
  → SaleItem (variant, qty, unit price)
  → Payment (cash / mobile money / bank)
```

Returns can link back and restore stock.

### Shops logistics

- **Restock** — quantity in for a shop (manual or import by code/SKU).  
- **Shop stock order** — shop asks warehouse → admin approves/fulfills (transfer + stock movements).  
- **Stock transfer** — FG between branches (admin tools).

### Factory side (extended)

```
RawMaterial → stock per branch, lots (FIFO), transfers, stocktakes
ProductionOrder → issue materials → output / wastage → FG at warehouse
Employee + PayrollRun
Expense (by branch / category)
Approval (large stock-out, price under cost, stocktake, …)
```

---

## 5. Main business flows

### 5.1 Create a shop (admin)

1. **Manage shops** → Initiate shop.  
2. System creates a **Branch** (`isShop`).  
3. Optionally creates a **Shop** user tied to that branch (login + password).  
4. Soft-close / delete rules depend on history (sales exist → prefer deactivate; empty may hard-delete).  
5. **Clear all shops** exists for bulk wipe (UI + CLI script when DB is up).

### 5.2 Products

1. Admin or shop opens **New product**.  
2. Form: name, code, category, optional size/color, sell price; admin also enters **buy** price.  
3. Server creates Product + first Variant; SKU can be auto-built from code-size-color.  
4. Admin can add more variants, BOM, and use **Pricing** (margin % or manual sell).  
5. Recompute costs from BOM + labor + overhead when materials/labor change.

### 5.3 Stock levels

- View **Stock** per branch (shop = own; admin filters shops).  
- Balances are `FinishedGoodsStock`.  
- Category filters appear on stock/sales/restock and related lists.

### 5.4 Restock

- **Manual**: pick variant + quantity (+ note).  
- **Import**: CSV/Excel with product code/SKU and quantity.  
- Credits shop FG with movement type restock; shop always hits own branch.

### 5.5 Sales

**Live sale (where implemented)**  
- Line + payment; stock deducted; large sale can notify admins.

**Import (shops)**  
- Paste/upload external POS-style CSV → sales records + stock decrease.  
- Useful when POS is outside this app.

**Returns**  
- Restore FG and reverse financial effect as coded.

### 5.6 Central inventory (admin)

- Cross-shop snapshot of finished goods, sales/expense signals for oversight.  
- Not for shop users.

### 5.7 Finance P&L (admin)

Over a date range (e.g. last N days) and selected shops:

| Line | Meaning |
|------|---------|
| Revenue | Non-return sale lines |
| − Returns | Return sales |
| − COGS | `buyingPrice × qty` |
| = Gross | Rough gross margin |
| − Expenses | Operating expense records |
| − Staff estimate | Prorated salaries + commission % of revenue (employee fields) |
| = Net after staff | Bottom line used on the page |

Charts: trends, shop comparison, payment/expense mix.

### 5.8 Warehouse order (extended)

1. Shop requests stock from warehouse branch.  
2. Admin approves / rejects.  
3. Fulfill: warehouse out + shop in + transfer record (single transaction).  

Note: path guards historically focus the **sidebar** on restock/import; orders routes exist and may need allowlist attention if shops should request from warehouse in production.

### 5.9 Production → warehouse FG (extended)

1. Draft order for a variant at warehouse.  
2. Start: BOM required; materials deducted (FIFO lots where used).  
3. Record good output / wastage.  
4. Complete: finished goods land on **warehouse** branch, later transferred or ordered to shops.

---

## 6. Navigation map (what users see)

### Admin / Manager sidebar (current)

| Label | Path idea |
|-------|-----------|
| Dashboard | `/` |
| Inventory (central) | `/central` |
| Finance | `/shops/finance` |
| Products | `/products` |
| Categories | `/setup/categories` |
| Manage shops | `/setup/shops` |
| Stock / Restock / Import / Staff | `/shops/*` |
| Users | `/users` |
| Settings | `/setup/settings` |

### Shop sidebar (current)

| Label | Path idea |
|-------|-----------|
| Dashboard | `/` |
| Products / New product | `/products`, `/products/new` |
| Stock / Restock / Import / Staff | `/shops/*` |
| Account | `/account` |

### Extra admin URLs (exist, not all linked)

`/production/*`, `/inventory/*`, `/sales`, `/approvals`, `/payroll`, `/reports/*`, `/shops/orders`, `/shops/transfers`, …

---

## 7. Code map (for developers)

| Concern | Where to look |
|---------|----------------|
| Auth session | `lib/auth.ts`, `middleware.ts` |
| Roles / path rules | `lib/rbac.ts`, `lib/rbac-shared.ts` |
| Nav | `components/layout/nav-config.ts` |
| Schema | `prisma/schema.prisma` |
| Product rules | `lib/actions/products.ts`, `lib/validations/products.ts` |
| FG stock safety | `lib/finished-goods-stock.ts` |
| Restock / sales import | `lib/actions/restock.ts`, `lib/actions/import-sales.ts` |
| Shops lifecycle | `lib/actions/shops.ts` |
| Shop staff | `lib/actions/shop-staff.ts` |
| Orders warehouse | `lib/actions/shop-orders.ts` |
| Finance math | `app/(dashboard)/shops/finance/page.tsx` (+ expenses actions) |
| Pricing helpers | `lib/pricing.ts` |
| Seed | `prisma/seed.ts` |

**Pattern:** pages are mostly Server Components; mutations are `"use server"` actions with Zod validation and Prisma transactions for stock.

---

## 8. Operating rules to remember

1. **Branch is the unit of stock and sales.** Shop users are pinned to one branch.  
2. **Never invent on-hand stock outside movements** — use the finished-goods adjust helper.  
3. **Shop does not own “buy price”** — HQ sets cost; until then COGS can be zero.  
4. **Admin and Manager are equivalent** for access checks.  
5. **Password policy** for new/changed passwords is stricter than seed defaults (length + letter + number).  
6. **Vercel must use real production env** — a `localhost` DB or secret mismatch breaks login/deploy.  
7. **UI ≠ full schema** — production/raw materials may be intentional next phase or legacy HQ tools; clear with product intent before relying on them in training docs for shop staff.

---

## 9. Typical day scenarios

### Shop manager

1. Login as shop user.  
2. Check **Stock** / low levels.  
3. **Restock** arrived cartons (or paste vendor sheet).  
4. **Import** end-of-day POS file if sales aren’t entered live.  
5. Update **Staff** if needed.  
6. Create a new **Product** when HQ hasn’t catalogued it yet (admin adds cost later).

### HQ admin

1. Login as admin.  
2. **Manage shops** — new location + login.  
3. Set **buying prices** / margins on products shops created.  
4. Watch **Central** inventory and **Finance** P&L.  
5. Create users, tweak **Settings** (company, thresholds).  
6. Optionally run production/warehouse transfers when those modules are in use.

---

## 10. Glossary

| Term | Meaning |
|------|---------|
| Branch | Physical location: warehouse and/or shop |
| FG | Finished goods (sellable stock) |
| Variant | Size/color/SKU of a product |
| BOM | Bill of materials (materials per unit) |
| COGS | Cost of goods sold (here: buy price × qty) |
| Restock | Inbound finished goods to a shop |
| Central | Admin multi-shop inventory overview |
| Initiate shop | Create shop branch (+ optional login) |

---

## 11. Quick reference — scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local app |
| `npm run build` | Production build |
| `npx prisma db push` | Sync schema (dev) |
| `npm run db:seed` | Seed roles, HQ, admin |
| `npm run db:clean` | Clean data (see clean script) |
| `npm run db:clear-shops` | Clear shops (when DB reachable) |

---

*Generated for use as an internal product/architecture guide. Behavior should match the repository; if nav or middleware changes, update sections 3, 6, and 7 first.*
