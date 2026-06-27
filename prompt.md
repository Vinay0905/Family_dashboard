# Google Stitch Master Prompt & Backend Integration Guide

This file contains the Google Stitch prompt (with frontend styling elements left as empty strings for customization) and the matching Supabase backend schema and visibility constraints.

---

## Part 1: Google Stitch Master Prompt

```text
=========================================
GOOGLE STITCH MASTER APPLICATION PROMPT
=========================================

[APPLICATION CONTEXT]
Product Name: Fam_Assist (Family Dashboard & Organizer)
Target Audience: Multi-generational families seeking to organize daily life, schedules, budgets, and files in a unified digital space.
Platform Type: Multi-page Web Application with responsive layout.

[FRONTEND VISUAL DESIGN & AESTHETIC SPECIFICATIONS]
Theme: ""
Typography: ""
Color Palette & Gradients: ""
Layout, Spacing & Borders: ""
Component Styling (Cards, Inputs, Buttons, Modals): ""
Transitions, Hover States & Micro-interactions: ""
Responsive & Layout Framework: ""

[APPLICATION ARCHITECTURE & SCREENS]
Generate a responsive web layout containing a Collapsible Sidebar Navigation and the following core views:

1. Dashboard Overview
   - Summary statistics cards:
     * Today's Events count
     * Active/Open Tasks count
     * Active Shopping Items count
     * Current Month's Total Expenses
   - A quick-action panel to add a task, event, or expense.
   - A modern feed of upcoming agenda events for today.

2. Family Shared Calendar
   - Interactive calendar layout (Monthly/Weekly/Daily views).
   - Event creation/editing dialog.
   - Inputs: Title, Category (family, school, work, travel, birthday, medical, other), Date/Time Range, Location, is_personal flag, and Color indicator.

3. Collaborative Task Board
   - Task cards organized by status: Open, In Progress, Completed.
   - Task fields: Title, Description, Due Date, Priority (low, medium, high), Assigned Family Member, and is_personal flag.
   - Drag-and-drop or state transitions to move tasks between statuses.

4. Shopping Lists & Items
   - Left pane: Manage list categories (e.g., Groceries, Home Improvement).
   - Right pane: List details showing items with Quantity, Unit, and a checkable "is_purchased" state.
   - Quick-add input field for adding new items to the selected list.

5. Reminders & Alerts
   - Reminders list sorted by target time.
   - Categories: Bill, Birthday, Anniversary, Renewal, Maintenance, Travel, Other.
   - Quick "Acknowledge" button to mark reminders as cleared.

6. Expenses Tracker
   - List of logs showing Date, Description, Payer, Amount, and Category (grocery, utilities, education, fuel, entertainment, medical, travel, miscellaneous).
   - Month-to-date total summary card.
   - Dynamic form to log a new expense.

7. Home & Asset Maintenance
   - Asset table/cards tracker.
   - Inputs: Asset Name, Vendor, Last Service Date, Next Service Date, and Notes.
   - Highlight assets whose next service dates are approaching or overdue.

8. Subscriptions Manager
   - Grid of recurring subscriptions.
   - Fields: Service Name, Cost, Billing Cycle (monthly, quarterly, yearly), Renewal Date, Active/Inactive switch, and Notes.

9. Holiday Planner
   - Destination title, date ranges, and budget estimator.
   - Packing list section containing interactive checkable items.
   - General trip notes field.

10. Contacts Directory
    - Rolodex style list sorted alphabetically.
    - Fields: Full Name, Category (doctor, school, electrician, plumber, driver, other), Phone Number, Email, and Notes.

11. Documents Vault
    - Folder/List view for uploaded files.
    - Grouped by Category (warranty, manual, travel, school, other).
    - Display file name, type, and size with upload and download actions.

12. Family Settings & Onboarding
    - Generate/display the Family Invite Code (8-character code).
    - Form to "Join Family by Code" using Invite Code input and Display Name.
    - Role management display showing user roles: Admin, Member, or Child.

[BACKEND DATA & CONTROLLER SCHEMAS]
(Bind UI elements to the data structures, tables, and visibility logic specified in the detailed backend documentation below.)
```

---

## Part 2: Backend Architecture & UI Integration Guide

This section details how your Supabase database schema governs the user interface visibility, permissions, and service calls. Use this to bind the Google Stitch frontend to your real backend services.

### 1. Core Data Models & Schemas

| Table Name | UI Page / Component | Key Fields | Primary Key / Relations |
| :--- | :--- | :--- | :--- |
| **`families`** | Settings | `id` (UUID), `name`, `invite_code` (8-char string), `created_by` | Primary Key: `id` |
| **`family_members`** | Dashboard / Settings | `family_id`, `user_id`, `role` (`admin`, `member`, `child`), `display_name` | Composite Unique: (`family_id`, `user_id`) |
| **`events`** | Calendar | `title`, `description`, `start_at`, `end_at`, `category`, `is_personal` | Foreign Key: `family_id` |
| **`tasks`** | Task Board | `title`, `description`, `due_date`, `priority`, `status`, `assigned_to`, `is_personal` | Foreign Key: `family_id` |
| **`shopping_lists`** | Shopping | `name`, `family_id` | Foreign Key: `family_id` |
| **`shopping_items`** | Shopping | `list_id`, `name`, `quantity`, `unit`, `is_purchased` | Foreign Key: `list_id` |
| **`reminders`** | Reminders | `title`, `remind_at`, `category`, `is_acknowledged` | Foreign Key: `family_id` |
| **`expenses`** | Expenses | `amount` (numeric), `paid_by`, `category`, `description`, `expense_date` | Foreign Key: `family_id` |
| **`maintenance_assets`** | Maintenance | `name`, `last_service_date`, `next_due_date`, `vendor`, `notes` | Foreign Key: `family_id` |
| **`subscriptions`** | Subscriptions | `name`, `cost`, `billing_cycle`, `renewal_date`, `is_active` | Foreign Key: `family_id` |
| **`holiday_plans`** | Holiday | `destination`, `start_date`, `end_date`, `budget_estimate`, `packing_list` (JSONB) | Foreign Key: `family_id` |
| **`contacts`** | Contacts | `name`, `category`, `phone`, `email`, `notes` | Foreign Key: `family_id` |
| **`documents`** | Documents | `name`, `category`, `storage_path`, `file_size`, `mime_type` | Foreign Key: `family_id` |

---

### 2. Role-Based Visibility Matrix

The database runs a strict visibility function `can_see_content(item_family_id, item_creator_id)` which filters SELECT queries via Row Level Security (RLS). Ensure the UI reflects these rules visually:

*   **Admin Role**: Has full access. Admin users see all cards, logs, events, expenses, and documents in the family workspace.
*   **Member Role**: Can see items created by other **Members** or **Children**, but content created by **Admins** is automatically filtered out by RLS.
    *   *UI Instruction*: Disable or hide edit and delete actions on Admin-created items when logged in as a Member.
*   **Child Role**: Restricted views. Children can only see items created by other **Children** (such as chores, school events, or specific lists). All Admin and Member records are hidden.

---

### 3. Privacy Visibility Constraints (`is_personal`)
The `events` and `tasks` modules support an `is_personal` flag (Boolean):
*   If `is_personal = true`, only the user who created the event or task (and in the case of tasks, the user assigned to it) can view or modify it.
*   The UI must clearly distinguish personal tasks and events using a lock icon or a visual tag.

---

### 4. File Storage Service
*   **Bucket**: `documents`
*   **Upload Path**: Storage path must begin with the `family_id` as the top-level directory: `/{family_id}/{file_name}`.
*   **File Constraints**: Limited to PDF, JPEG, PNG, and WebP, with a maximum size limit of **50 MB** per document. RLS policies verify that only authenticated family members can upload or download within their family directory.

---

### 5. RPC Join Function
To onboard users, the UI must call the Postgres remote procedure function:
```sql
select join_family_by_code(invite_code_input := '...', display_name_input := '...');
```
This safely inserts the user into `family_members` as a `'member'` role and returns the corresponding `family_id`, bypassing the default RLS limits.
