-- ====================================================================
-- Seed Script: seed_doe_family.sql
-- Sets up the Doe Family with complete demo data.
-- Run this script in your Supabase SQL Editor.
-- Password for all accounts is: password123
-- ====================================================================

-- 1. CLEAN UP PREVIOUS DEMO DATA (Ensures Idempotency)
DELETE FROM auth.identities WHERE user_id IN ('a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', 'c3d4e5f6-a7b8-4c9d-8e1f-2f3a4b5c6d7e');
DELETE FROM auth.users WHERE id IN ('a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', 'c3d4e5f6-a7b8-4c9d-8e1f-2f3a4b5c6d7e');
DELETE FROM public.families WHERE id = 'f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c';

-- 2. CREATE AUTH USERS
-- Encrypted password hash is for: password123
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
VALUES 
  ('a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', '00000000-0000-0000-0000-000000000000', 'john.doe@example.com', '$2a$10$VdG0p.2L.yFwZ3pX8zGZAuYvjH4S/a8/vKq27p6nJbV1S/T7eQkRy', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"John Doe"}', 'authenticated', 'authenticated', now(), now()),
  ('b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', '00000000-0000-0000-0000-000000000000', 'jane.doe@example.com', '$2a$10$VdG0p.2L.yFwZ3pX8zGZAuYvjH4S/a8/vKq27p6nJbV1S/T7eQkRy', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Jane Doe"}', 'authenticated', 'authenticated', now(), now()),
  ('c3d4e5f6-a7b8-4c9d-8e1f-2f3a4b5c6d7e', '00000000-0000-0000-0000-000000000000', 'jimmy.doe@example.com', '$2a$10$VdG0p.2L.yFwZ3pX8zGZAuYvjH4S/a8/vKq27p6nJbV1S/T7eQkRy', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Jimmy Doe"}', 'authenticated', 'authenticated', now(), now());

-- 3. LINK PROVIDER IDENTITIES
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
  ('a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', '{"sub":"a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d","email":"john.doe@example.com"}'::jsonb, 'email', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', now(), now(), now()),
  ('b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', '{"sub":"b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e","email":"jane.doe@example.com"}'::jsonb, 'email', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', now(), now(), now()),
  ('c3d4e5f6-a7b8-4c9d-8e1f-2f3a4b5c6d7e', 'c3d4e5f6-a7b8-4c9d-8e1f-2f3a4b5c6d7e', '{"sub":"c3d4e5f6-a7b8-4c9d-8e1f-2f3a4b5c6d7e","email":"jimmy.doe@example.com"}'::jsonb, 'email', 'c3d4e5f6-a7b8-4c9d-8e1f-2f3a4b5c6d7e', now(), now(), now());

-- 4. CREATE FAMILY
INSERT INTO public.families (id, name, invite_code, created_by, monthly_budget)
VALUES ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'Doe Family', 'DOE123', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 50000.00);

-- 5. ADD MEMBERS
INSERT INTO public.family_members (family_id, user_id, role, display_name)
VALUES 
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'admin', 'John Doe'),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', 'member', 'Jane Doe'),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'c3d4e5f6-a7b8-4c9d-8e1f-2f3a4b5c6d7e', 'child', 'Jimmy Doe');

-- 6. ADD CALENDAR EVENTS
INSERT INTO public.events (family_id, created_by, title, description, start_at, end_at, category, location)
VALUES
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'Family Goa Vacation Plan', 'Discuss travel tickets and packing list', now() + interval '1 day', now() + interval '1 day 2 hours', 'family', 'Living Room'),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', 'Jimmy Soccer Tournament', 'Cheer for Jimmy in the regional finals!', now() + interval '3 days', now() + interval '3 days 4 hours', 'school', 'City Sports Center'),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'AC Filter Service Appointment', 'Climate Pro technician visiting for routine service', now() + interval '5 days', now() + interval '5 days 1 hour', 'other', 'Home'),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', 'Annual Health Checkup', 'Routine checkup for Jane and Jimmy', now() + interval '6 days 2 hours', now() + interval '6 days 4 hours', 'medical', 'Apollo Clinics');

-- 7. ADD CHORES / TASKS
INSERT INTO public.tasks (family_id, created_by, title, description, due_date, priority, status, assigned_to)
VALUES
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'Fix kitchen sink leak', 'Call plumber if needed. Pipe under sink is dripping.', (current_date + 1), 'high', 'in_progress', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d'),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', 'Buy weekly groceries', 'Milk, eggs, apples, whole wheat bread, dish soap', current_date, 'medium', 'completed', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e'),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', 'Finish math homework', 'Geometry practice exercises 4 to 8', (current_date + 2), 'medium', 'open', 'c3d4e5f6-a7b8-4c9d-8e1f-2f3a4b5c6d7e'),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'Mow front lawn', 'Trim the garden borders as well', (current_date + 4), 'low', 'open', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d'),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'Clean study table and organize books', 'Put all school notebooks in correct drawers', current_date, 'low', 'completed', 'c3d4e5f6-a7b8-4c9d-8e1f-2f3a4b5c6d7e');

-- 8. ADD SHOPPING LISTS AND ITEMS
INSERT INTO public.shopping_lists (id, family_id, created_by, name)
VALUES ('a2b3c4d5-e6f7-4a9b-8c1d-2e3f4a5b6c7d', 'f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', 'Weekly Grocery Essentials');

INSERT INTO public.shopping_items (family_id, list_id, name, quantity, unit, category, is_purchased, added_by)
VALUES
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a2b3c4d5-e6f7-4a9b-8c1d-2e3f4a5b6c7d', 'Organic Whole Milk 2L', 2, 'bottles', 'groceries', true, 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e'),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a2b3c4d5-e6f7-4a9b-8c1d-2e3f4a5b6c7d', 'Red Fuji Apples', 1, 'kg', 'groceries', false, 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e'),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a2b3c4d5-e6f7-4a9b-8c1d-2e3f4a5b6c7d', 'Whole Wheat Sourdough Bread', 1, 'loaf', 'groceries', false, 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e'),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a2b3c4d5-e6f7-4a9b-8c1d-2e3f4a5b6c7d', 'Fresh Cage-Free Eggs (Dozen)', 1, 'carton', 'groceries', true, 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e'),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a2b3c4d5-e6f7-4a9b-8c1d-2e3f4a5b6c7d', 'Liquid Dish Soap', 1, 'bottle', 'other', false, 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e');

-- 9. ADD EXPENSES (For the current month and last week)
INSERT INTO public.expenses (family_id, created_by, paid_by, amount, category, description, expense_date)
VALUES
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', 3500.00, 'utilities', 'June Electricity Bill Payment', current_date - 3),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 4500.00, 'grocery', 'Weekly groceries at Nature Basket', current_date),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 1500.00, 'utilities', 'Water Purifier filter replacement service', current_date - 1),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', 2800.00, 'education', 'Jimmy school textbooks & geometry box', current_date - 5),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 1800.00, 'entertainment', 'Family outing - Dinner and Movie ticket', current_date - 2);

-- 10. ADD ACTIVE SUBSCRIPTIONS
INSERT INTO public.subscriptions (family_id, created_by, name, cost, billing_cycle, renewal_date, is_active, notes)
VALUES
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'Netflix Premium 4K', 649.00, 'monthly', current_date + 3, true, 'Auto-renewal linked to ICICI CC'),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'Spotify Family Plan', 179.00, 'monthly', current_date + 10, true, 'Primary account: John Doe'),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', 'Amazon Prime Annual', 1499.00, 'yearly', current_date + 45, true, 'Charged yearly. Shopping & Video.');

-- 11. ADD HOLIDAY PLANS
INSERT INTO public.holiday_plans (family_id, created_by, destination, start_date, end_date, budget_estimate, notes, packing_list)
VALUES
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'Goa Summer Vacation', (current_date + 15), (current_date + 22), 45000.00, 
   'Staying at Taj Exotica South Goa. Discuss renting a self-drive car.', 
   '[{"item":"Swimwear","checked":true},{"item":"Sunscreen","checked":false},{"item":"Sunglasses","checked":false},{"item":"Camera & Chargers","checked":true}]'::jsonb);

-- 12. ADD MAINTENANCE ASSETS
INSERT INTO public.maintenance_assets (family_id, created_by, name, last_service_date, next_due_date, vendor, notes)
VALUES
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'Living Room Split AC', (current_date - 30), (current_date + 150), 'Climate Pro Services', 'Needs filter cleaning every 6 months. Model No: Voltas 1.5 Ton'),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'Tesla Model 3', (current_date - 60), (current_date + 120), 'Tesla Service Center', 'Tire rotations and wiper fluid check. Recommended cold pressure: 42 PSI.');

-- 13. ADD REMINDERS
INSERT INTO public.reminders (family_id, created_by, title, remind_at, category, is_acknowledged)
VALUES
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'Pay Monthly Rent (INR 25,000)', (current_date + 2)::timestamp + time '10:00:00', 'bill', false),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d', 'Car Pollution Certificate Renewal', (current_date + 7)::timestamp + time '09:00:00', 'renewal', false),
  ('f1a9b8c7-d6e5-4f3a-8b9c-0d1e2f3a4b5c', 'b2c3d4e5-f6a7-4b9c-8d1e-2f3a4b5c6d7e', 'Janes Anniversary Dinner Reservation', (current_date + 12)::timestamp + time '19:30:00', 'birthday', false);
