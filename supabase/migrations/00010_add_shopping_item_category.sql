-- Add category column to shopping_items
ALTER TABLE public.shopping_items ADD COLUMN IF NOT EXISTS category text default 'groceries';
