# Plan of Action: Feature & UX Expansion 🚀

Here is the proposed design spec to add the daily routines, meal planner, savings goals, and kids points rewards modules. We will maintain the premium **Warmth & Order** visual style across all new additions.

---

## 💾 Database Schema Additions

We will create a new migration file [00012_feature_expansion.sql](file:///Users/mast/Documents/VInayPrograming/Fam_Assist/family-organizer/supabase/migrations/00012_feature_expansion.sql):

### 1. Daily Routines & Tracking
- **`public.routines`**: Stores the definition of daily recurring tasks.
  - `id` (UUID, primary key)
  - `family_id` (UUID, references families)
  - `created_by` (UUID, references auth.users)
  - `assigned_to` (UUID, references auth.users, optional)
  - `title` (text, e.g. "Water plants")
  - `description` (text)
  - `recurrence_time` (time without time zone, e.g. '08:00:00')
  - `points` (integer, default 0 - for rewards integration)
  - `created_at` / `updated_at`
- **`public.routine_completions`**: Tracks completion states per day.
  - `id` (UUID, primary key)
  - `routine_id` (UUID, references routines, on delete cascade)
  - `completed_by` (UUID, references auth.users)
  - `completed_date` (date, e.g. '2026-06-27')
  - `created_at` (timestamptz)
  - *Constraint*: Unique combination of `(routine_id, completed_date)` to prevent duplicate completions on the same day.

### 2. Kids Chore Points & Rewards Store
- **`public.rewards`**: Custom parent-defined items children can claim.
  - `id` (UUID, primary key)
  - `family_id` (UUID, references families)
  - `title` (text, e.g. "1 hour Xbox time")
  - `points_cost` (integer, default 10)
  - `created_by` (UUID, references auth.users)
- **`public.redeemed_rewards`**: Log of rewards claimed by family members.
  - `id` (UUID, primary key)
  - `family_id` (UUID, references families)
  - `reward_id` (UUID, references rewards)
  - `member_id` (UUID, references auth.users)
  - `points_spent` (integer)
  - `redeemed_at` (timestamptz)

### 3. Meal Planner & Recipe Shelf
- **`public.recipes`**: Card box of food options.
  - `id` (UUID)
  - `family_id` (UUID, references families)
  - `title` (text), `description` (text)
  - `ingredients` (jsonb array of strings/quantities)
  - `instructions` (text)
  - `created_by` (UUID)
- **`public.meal_plan`**: Weekly schedule.
  - `id` (UUID)
  - `family_id` (UUID, references families)
  - `recipe_id` (UUID, references recipes, optional)
  - `custom_meal_title` (text)
  - `meal_date` (date)
  - `meal_type` (text, e.g., 'breakfast', 'lunch', 'dinner')
  - `created_by` (UUID)
  - *Constraint*: Unique combination of `(family_id, meal_date, meal_type)`.

### 4. Piggy Bank (Shared Savings Goals)
- **`public.savings_goals`**: Milestones for family savings.
  - `id` (UUID)
  - `family_id` (UUID, references families)
  - `title` (text), `description` (text)
  - `target_amount` (numeric)
  - `current_amount` (numeric, default 0)
  - `target_date` (date)
  - `created_by` (UUID)
- **`public.savings_transactions`**: Audit contributions/withdrawals log.
  - `id` (UUID)
  - `goal_id` (UUID, references savings_goals)
  - `amount` (numeric)
  - `member_id` (UUID)
  - `note` (text)
  - `created_at` (timestamptz)

---

## 🎨 User Experience & Frontend Additions

### 1. Tasks Module Redesign
We will add a new tab selector at the top of `src/app/(app)/tasks/page.tsx`:
- **Kanban Board**: Existing multi-column tasks.
- **Daily Chores**: Displays recurring chores list.
  - **Checklist**: Check off routines for "Today".
  - **Weekly Streak Strip**: Row of 7 circular indicator tags (Mon-Sun) displaying a checkmark or cross showing the week's history.
  - **Rewards Wallet**: Simple summary pill displaying cumulative points earned by the member.

### 2. Meal Planner Screen (`/meal-planner`)
- A calendar-grid showing the current week (7 columns, 3 rows for Breakfast/Lunch/Dinner).
- Clicking a slot opens a sidebar:
  - Match to a saved recipe from the Family Cookbook tab.
  - Type a custom one-off meal title.
  - **Auto-Add Groceries**: A single button click parses the recipe's ingredient list and inserts the items directly into the shared **Shopping List** database table.

### 3. Piggy Bank Screen (`/piggy-bank`)
- **Milestone Cards**: Progress percentage bars, current balance, and countdown days left.
- **Deposit Drawer**: Select standard quick deposits (`+$10`, `+$50`, `+$100`) or input a custom savings transfer with a note.
- **Transaction Feed**: Scrollable audit logs (e.g., "Dad deposited $50 for Summer Trip").

---

## 🧭 Plan Validation

### Proceed?
If you agree with this design, click the **Proceed** button to let me create the database tables and start generating the subagents to build these screens concurrently.
