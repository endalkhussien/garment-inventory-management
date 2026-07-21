# Cursor Execution Kit — Sprint-Scoped Prompts

## How to use this
1. Drop the `.cursorrules` file (shared separately) into your repo root — **before** the first prompt. Cursor reads it automatically in every chat, so you never re-paste the design system or data model again.
2. For each sprint below: **open a new Cursor chat** (don't reuse an old long thread — it accumulates context and cost), use the `@` file references listed to scope Cursor's attention, then paste the prompt.
3. Only move to the next sprint's prompt once the current one is working and committed. Commit after each sprint (or each feature within it) — small clean diffs keep future prompts cheap.
4. If a prompt still feels big for one pass, ask Cursor first: *"Give me a short plan — files to touch and schema changes — before writing code."* Approve the plan, then say "implement it."

---

## Sprint 0 — Foundation
**New chat. No `@` references yet (fresh repo).**

```
Using the conventions in .cursorrules, scaffold this project:
- Next.js 14 (App Router) + TypeScript + Tailwind + Prisma + PostgreSQL
- Apply the design tokens from .cursorrules as Tailwind theme / CSS variables
- Build the shared layout shell: collapsible left sidebar with the nav sections listed in
  .cursorrules (empty links are fine for now), top bar with search/notification/profile
  placeholders
- Set up Prisma with the User, Role, and Branch models only for now
- Build login/logout with NextAuth, role-based session data
- An empty dashboard page at "/" that renders inside the shell

Give me a short plan first (files/folders you'll create), then implement it.
```

**Done when:** you can log in and see an empty dashboard inside the sidebar/top-bar shell.

---

## Sprint 1 — Inventory: Raw Materials & Capital Assets
**New chat. Reference: `@prisma/schema.prisma` `@app/layout.tsx`**

```
Using .cursorrules conventions, add the RawMaterial, CapitalAsset, Supplier, and
StockMovement models to the Prisma schema, then build the Inventory module:
- List + create/edit pages for Raw Materials (name, category, unit of measure, supplier,
  cost per unit, reorder threshold, current quantity, location)
- List + create/edit pages for Capital Assets (name, type, serial number, purchase
  date/cost, condition, assigned location)
- Stock-in and stock-out forms with a required reason code, wired as a DB transaction
  that updates quantity and writes a StockMovement record
- A stock movement history view per item
- A low-stock badge/alert on the list view when quantity is below reorder threshold

Plan first, then implement.
```

**Done when:** the client can register their real yarn, thread, buttons, and machines, and see stock levels update.

---

## Sprint 2 — BOM & Pricing Engine
**New chat. Reference: `@prisma/schema.prisma` `@app/inventory` (the raw materials module you just built)**

```
Using .cursorrules conventions, add Product, ProductVariant, BillOfMaterial, and
PriceHistory models. Build the Product module:
- Create a product with variants (size/color), e.g. "Men's Crew Neck Sweater"
- Attach a BOM to each variant: list of RawMaterial + quantity required per unit
- Auto-calculate material cost per unit from current RawMaterial.costPerUnit x BOM
  quantities
- Add fields for labor cost per unit and overhead % to compute total cost per unit
- Pricing screen: set selling price via cost-plus margin % or manual override; always
  display resulting margin in ETB and %
- Every price change writes a PriceHistory record (old price, new price, date, user)
- When a RawMaterial's cost changes, flag which products' computed cost is now stale

Plan first, then implement.
```

**Done when:** the client can price an actual sweater from real material costs and see their margin.

---

## Sprint 3 — Production Management
**New chat. Reference: `@prisma/schema.prisma` `@app/products` (BOM/pricing module) `@app/inventory`**

```
Using .cursorrules conventions, add ProductionOrder, ProductionOutput, and Employee
models. Build the Production module:
- Create a Production Order: product/variant, quantity, target date, assigned
  supervisor
- On approval, deduct required raw materials from inventory per the BOM x quantity, as
  a single transaction; warn (don't silently fail) if stock is insufficient
- Daily/batch output entry: quantity produced (good units) and rejected units, linked to
  a production order and to individual employees
- Employee performance report: units produced and defect rate by employee, by day/week/
  month
- On order completion, move produced quantity into FinishedGoodsStock automatically
- Track wastage (raw material lost) separately for cost accuracy

Plan first, then implement.
```

**Done when:** a real production run works end to end — raw material is deducted, output is recorded per employee, finished stock increases.

---

## Sprint 4 — Finished Goods, Shop Transfer & POS
**New chat. Reference: `@prisma/schema.prisma` `@app/production` `@app/inventory`**

```
Using .cursorrules conventions, add FinishedGoodsStock, StockTransfer, Sale, SaleItem,
Payment, and Customer models. Build:
- Stock transfer screen: warehouse -> a specific Branch/shop, with quantity, date,
  sender/receiver, updating both sides' stock as a transaction
- Per-shop stock view (real-time, filtered by Branch)
- Low-stock alert per shop
- A simple POS-style sale screen: select product/variant, quantity, price (editable
  with permission), payment method (cash/mobile money/bank transfer), generate a
  receipt; deduct shop stock on sale as a transaction
- Daily sales summary per shop (total sales, transaction count, top products)
- Returns/exchanges flow that restores stock and logs a reason

Plan first, then implement.
```

**Done when:** a sweater can be traced from raw yarn -> produced -> transferred to a shop -> sold, with stock correct at every step.

---

## Sprint 5 — Dashboard & Reports
**New chat. Reference: all module folders built so far (`@app/inventory` `@app/products` `@app/production` `@app/shops`)**

```
Using .cursorrules conventions, build the real dashboard (replacing the placeholder from
Sprint 0):
- KPI cards: total raw material stock value, total finished goods stock value, units
  produced vs. target (period), total sales revenue, gross margin, low-stock alert count
- Top performers: employees (by output) and shops (by sales)
- Date range filter and Branch/shop scope filter (an "All branches" dropdown like the
  reference UI)
- Charts (Recharts): member/production growth over time, sales over time
- Separate report pages: Production, Inventory, Sales, Cost & Pricing — each with a CSV
  export button

Plan first, then implement.
```

**Done when:** the dashboard reflects real data generated by Sprints 1–4, not placeholders.

---

## Sprint 6 — Approvals, Notifications & Polish
**New chat. Reference: relevant module(s) per approval type, e.g. `@app/inventory` for stock adjustments**

```
Using .cursorrules conventions, add Approval and Notification models. Build:
- An approval requirement for: stock adjustments, price overrides, large stock-outs
  (configurable threshold)
- An "Approvals" queue (for approvers) and "My Submissions" view (for requesters)
- An in-app notification bell: low stock, pending approvals, completed production
  orders, large sales
- Pass over role-based access edge cases and fix any permission gaps found
- General UI polish pass to match .cursorrules design tokens consistently across all
  modules built so far

Plan first, then implement.
```

**Done when:** the core workflow is gated appropriately and the app feels consistent end to end.

---

## Token-usage checkpoints
After each sprint, glance at your Cursor usage against the sprint's scope. If a sprint burned noticeably more tokens than the others, it's usually one of:
- The chat thread ran too long (should've started a fresh one for a sub-task)
- `@` references were too broad (whole folders instead of specific files)
- A plan wasn't requested first, so a wrong first attempt got fully generated and thrown away

Catch that after Sprint 1 rather than after Sprint 6 — the pattern compounds.
