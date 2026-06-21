-- 1. Add monthly_budget to families table
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS monthly_budget numeric(10,2) default 0.00;

-- 2. Add plan_type and payment_method to subscriptions table
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_type text default 'Monthly';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_method text default 'Credit Card';

-- 3. Add values to document_category enum
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'aadhar';
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'passport';
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'license';
ALTER TYPE public.document_category ADD VALUE IF NOT EXISTS 'education';
