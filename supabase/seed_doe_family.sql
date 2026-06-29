-- Doe Family Demo Seed Script
-- Using real registered user IDs:
--   John Doe:  9540e790-3f36-40cf-ab8b-703e5aad9e2b (nagavinay0905@gmail.com)
--   Jane Doe:  e1829f61-9e9c-4be1-9be0-3db445a3e830 (nagavinay.avvaru@gmail.com)
--   Jimmy Doe: 4ac8109f-f472-4336-b046-8421d947c6f9 (kingler2510@gmail.com)
--   Family ID: b23d53a4-94f2-4d8c-af42-cb99b21ab3f0

-- 1. CLEAN UP EXISTING DEMO DATA FOR THIS FAMILY
DELETE FROM public.families WHERE id = 'b23d53a4-94f2-4d8c-af42-cb99b21ab3f0';

-- 2. CREATE FAMILY
INSERT INTO public.families (id, name, invite_code, created_by, monthly_budget)
VALUES ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', 'Doe Family', 'DOE123', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 50000.00);

-- 3. ADD MEMBERS
INSERT INTO public.family_members (family_id, user_id, role, display_name)
VALUES 
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 'admin', 'John Doe'),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', 'e1829f61-9e9c-4be1-9be0-3db445a3e830', 'member', 'Jane Doe'),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '4ac8109f-f472-4336-b046-8421d947c6f9', 'child', 'Jimmy Doe');

-- 4. ADD CALENDAR EVENTS
INSERT INTO public.events (family_id, created_by, title, description, start_at, end_at, category, location)
VALUES
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 'Family Goa Vacation Plan', 'Discuss travel tickets and packing list', now() + interval '1 day', now() + interval '1 day 2 hours', 'family', 'Living Room'),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', 'e1829f61-9e9c-4be1-9be0-3db445a3e830', 'Jimmy Soccer Tournament', 'Cheer for Jimmy in the regional finals!', now() + interval '3 days', now() + interval '3 days 4 hours', 'school', 'City Sports Center'),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 'AC Filter Service Appointment', 'Climate Pro technician visiting for routine service', now() + interval '5 days', now() + interval '5 days 1 hour', 'other', 'Home'),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', 'e1829f61-9e9c-4be1-9be0-3db445a3e830', 'Annual Health Checkup', 'Routine checkup for Jane and Jimmy', now() + interval '6 days 2 hours', now() + interval '6 days 4 hours', 'medical', 'Apollo Clinics');

-- 5. ADD CHORES / TASKS
INSERT INTO public.tasks (family_id, created_by, title, description, due_date, priority, status, assigned_to)
VALUES
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 'Fix kitchen sink leak', 'Call plumber if needed. Pipe under sink is dripping.', (current_date + 1), 'high', 'in_progress', '9540e790-3f36-40cf-ab8b-703e5aad9e2b'),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', 'e1829f61-9e9c-4be1-9be0-3db445a3e830', 'Buy weekly groceries', 'Milk, eggs, apples, whole wheat bread, dish soap', current_date, 'medium', 'completed', 'e1829f61-9e9c-4be1-9be0-3db445a3e830'),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', 'e1829f61-9e9c-4be1-9be0-3db445a3e830', 'Finish math homework', 'Geometry practice exercises 4 to 8', (current_date + 2), 'medium', 'open', '4ac8109f-f472-4336-b046-8421d947c6f9'),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 'Mow front lawn', 'Trim the garden borders as well', (current_date + 4), 'low', 'open', '9540e790-3f36-40cf-ab8b-703e5aad9e2b'),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 'Clean study table and organize books', 'Put all school notebooks in correct drawers', current_date, 'low', 'completed', '4ac8109f-f472-4336-b046-8421d947c6f9');

-- 6. ADD SHOPPING LISTS AND ITEMS
INSERT INTO public.shopping_lists (id, family_id, created_by, name)
VALUES ('a2b3c4d5-e6f7-4a9b-8c1d-2e3f4a5b6c7d', 'b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', 'e1829f61-9e9c-4be1-9be0-3db445a3e830', 'Weekly Grocery Essentials');

INSERT INTO public.shopping_items (family_id, list_id, name, quantity, unit, category, is_purchased, added_by)
VALUES
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', 'a2b3c4d5-e6f7-4a9b-8c1d-2e3f4a5b6c7d', 'Organic Whole Milk 2L', 2, 'bottles', 'groceries', true, 'e1829f61-9e9c-4be1-9be0-3db445a3e830'),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', 'a2b3c4d5-e6f7-4a9b-8c1d-2e3f4a5b6c7d', 'Red Fuji Apples', 1, 'kg', 'groceries', false, 'e1829f61-9e9c-4be1-9be0-3db445a3e830'),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', 'a2b3c4d5-e6f7-4a9b-8c1d-2e3f4a5b6c7d', 'Whole Wheat Sourdough Bread', 1, 'loaf', 'groceries', false, 'e1829f61-9e9c-4be1-9be0-3db445a3e830'),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', 'a2b3c4d5-e6f7-4a9b-8c1d-2e3f4a5b6c7d', 'Fresh Cage-Free Eggs (Dozen)', 1, 'carton', 'groceries', true, 'e1829f61-9e9c-4be1-9be0-3db445a3e830'),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', 'a2b3c4d5-e6f7-4a9b-8c1d-2e3f4a5b6c7d', 'Liquid Dish Soap', 1, 'bottle', 'other', false, 'e1829f61-9e9c-4be1-9be0-3db445a3e830');

-- 7. ADD EXPENSES
INSERT INTO public.expenses (family_id, created_by, paid_by, amount, category, description, expense_date)
VALUES
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', 'e1829f61-9e9c-4be1-9be0-3db445a3e830', 'e1829f61-9e9c-4be1-9be0-3db445a3e830', 3500.00, 'utilities', 'June Electricity Bill Payment', current_date - 3),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 4500.00, 'grocery', 'Weekly groceries at Nature Basket', current_date),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 1500.00, 'utilities', 'Water Purifier filter replacement service', current_date - 1),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', 'e1829f61-9e9c-4be1-9be0-3db445a3e830', 'e1829f61-9e9c-4be1-9be0-3db445a3e830', 2800.00, 'education', 'Jimmy school textbooks & geometry box', current_date - 5),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 1800.00, 'entertainment', 'Family outing - Dinner and Movie ticket', current_date - 2);

-- 8. ADD ACTIVE SUBSCRIPTIONS
INSERT INTO public.subscriptions (family_id, created_by, name, cost, billing_cycle, renewal_date, is_active, notes)
VALUES
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 'Netflix Premium 4K', 649.00, 'monthly', current_date + 3, true, 'Auto-renewal linked to ICICI CC'),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 'Spotify Family Plan', 179.00, 'monthly', current_date + 10, true, 'Primary account: John Doe'),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', 'e1829f61-9e9c-4be1-9be0-3db445a3e830', 'Amazon Prime Annual', 1499.00, 'yearly', current_date + 45, true, 'Charged yearly. Shopping & Video.');

-- 9. ADD HOLIDAY PLANS
INSERT INTO public.holiday_plans (family_id, created_by, destination, start_date, end_date, budget_estimate, notes, packing_list)
VALUES
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 'Goa Summer Vacation', (current_date + 15), (current_date + 22), 45000.00, 
   'Staying at Taj Exotica South Goa. Discuss renting a self-drive car.', 
   '[{"item":"Swimwear","checked":true},{"item":"Sunscreen","checked":false},{"item":"Sunglasses","checked":false},{"item":"Camera & Chargers","checked":true}]'::jsonb);

-- 10. ADD MAINTENANCE ASSETS
INSERT INTO public.maintenance_assets (family_id, created_by, name, last_service_date, next_due_date, vendor, notes)
VALUES
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 'Living Room Split AC', (current_date - 30), (current_date + 150), 'Climate Pro Services', 'Needs filter cleaning every 6 months. Model No: Voltas 1.5 Ton'),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 'Tesla Model 3', (current_date - 60), (current_date + 120), 'Tesla Service Center', 'Tire rotations and wiper fluid check. Recommended cold pressure: 42 PSI.');

-- 11. ADD REMINDERS
INSERT INTO public.reminders (family_id, created_by, title, remind_at, category, is_acknowledged)
VALUES
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 'Pay Monthly Rent (INR 25,000)', (current_date + 2)::timestamp + time '10:00:00', 'bill', false),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', '9540e790-3f36-40cf-ab8b-703e5aad9e2b', 'Car Pollution Certificate Renewal', (current_date + 7)::timestamp + time '09:00:00', 'renewal', false),
  ('b23d53a4-94f2-4d8c-af42-cb99b21ab3f0', 'e1829f61-9e9c-4be1-9be0-3db445a3e830', 'Janes Anniversary Dinner Reservation', (current_date + 12)::timestamp + time '19:30:00', 'birthday', false);
