# 🏡 FamAssist (Family Organizer)

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-blueviolet?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind--blue?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![Vercel](https://img.shields.io/badge/Vercel-Deployment-black?style=for-the-badge&logo=vercel)](https://vercel.com)

**FamAssist** is a premium, private web application designed to help modern families organize, synchronize, and simplify their daily lives. From chore tracking and shared calendars to budgeting, active subscription monitoring, holiday planning, and home asset maintenance—FamAssist acts as the digital home base for your family.

---

## 🌟 Modules & Features

| Module | Description | Screenshots / Previews |
| :--- | :--- | :--- |
| **📊 Dashboard** | An interactive command center displaying today's schedule, chores breakdown, grocery counts, monthly expenses, and active reminders. | *[Insert Dashboard Screenshot]* |
| **🧹 Task & Chore Tracker** | Create chores, set priorities (Low, Medium, High), assign them to family members, and track status (`Open`, `In Progress`, `Completed`). | *[Insert Chores Screenshot]* |
| **📅 Shared Calendar** | A color-coded calendar categorized by School, Travel, Family, Birthdays, and Medical appointments to keep everyone in sync. | *[Insert Calendar Screenshot]* |
| **🛒 Smart Shopping** | Create shopping lists, add items with quantities and categories, and check them off in real-time. | *[Insert Shopping Screenshot]* |
| **💳 Expenses & Budgets** | Log monthly expenditures, view spending analytics by category, and track family spending against a shared monthly budget. | *[Insert Expenses Screenshot]* |
| **🔔 Subscriptions Monitor** | Monitor active services (Netflix, Spotify, Gym, etc.), track costs, and display upcoming renewal dates. | *[Insert Subscriptions Screenshot]* |
| **✈️ Holiday Planner** | Plan upcoming trips with custom itineraries, budget estimations, and collaborative packing checklists. | *[Insert Holiday Screenshot]* |
| **🔧 Maintenance Tracker** | Keep home systems (AC, Water Filter, Vehicles) running smoothly. Log service costs, record last service dates, and track next due dates. | *[Insert Maintenance Screenshot]* |
| **📁 Document Vault** | Securely store and catalog links to important files (identity proofs, bills, insurance policies). | *[Insert Documents Screenshot]* |

---

## ⚙️ Engineering & Performance Highlights

This app is built to be secure, production-grade, and responsive.

### 1. 🏎️ Sub-100ms Page Navigation (Zustand Cache)
Standard server-rendered pages suffer from query waterfalls (e.g., waiting for session Auth -> fetching user -> fetching family -> fetching data). We integrated a **Zustand global cache** that pre-warms on initial load. Subsequent page changes read context instantly, eliminating redundant database roundtrips and yielding a **100/100 Vercel Speed Performance** score.

### 2. ⚡ Postgres Plan Cache Tuning
To optimize Row-Level Security (RLS) evaluation on high-traffic tables, all policies have been rewritten to use subquery evaluations:
```sql
USING (created_by = (SELECT auth.uid()))
```
By placing `auth.uid()` inside a `(SELECT ...)` subquery, Postgres is forced to evaluate the current session variable exactly once per query (as an `InitPlan`) and cache it, rather than calling the user evaluation function for every single row scanned.

### 3. 🔒 SQL Injection & RPC Hardening
All PostgreSQL custom database functions are hardened to execute strictly under a secure path:
```sql
ALTER FUNCTION public.is_family_member(uuid) SET search_path = public, pg_temp;
```
Execution privileges on helper functions used by the backend are revoked from default `public` and guest `anon` roles to restrict direct RPC endpoint exposure.

### 4. 📈 Covering Database Indexes
Added covering B-Tree indexes for all foreign key relationships (e.g., `family_id`, `created_by`, `paid_by`) to ensure joins and cascaded deletions run at `O(log N)` complexity.

---

## 🚀 Setup & Installation

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Vinay0905/Family_dashboard.git
cd Family_dashboard/family-organizer
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the `family-organizer` directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Initialize Database & Seed Demo Data
1. Copy the contents of [`supabase_schema_complete.sql`](../supabase_schema_complete.sql) and paste them into your **Supabase SQL Editor** to create the tables, types, indexes, and RLS rules.
2. Execute the [`seed_doe_family.sql`](./supabase/seed_doe_family.sql) script in the SQL editor to pre-populate the **Doe Family** test accounts and demo data.
3. Start the local server:
   ```bash
   npm run dev
   ```

---

## 👥 Demo Family Credentials

Log in using any of the following accounts to see the pre-populated dashboard:

* **Father / Family Admin**: 
  * **Email**: `john.doe@example.com`
  * **Password**: `password123`
* **Mother / Family Member**:
  * **Email**: `jane.doe@example.com`
  * **Password**: `password123`
* **Child / Family Child**:
  * **Email**: `jimmy.doe@example.com`
  * **Password**: `password123`

---

> [!TIP]
> Log in as **John Doe** to access admin settings (like adding members or changing the family name). Log in as **Jimmy Doe** to view the app through a child's chore list!
