-- Add category column to subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS category text default 'Entertainment';
