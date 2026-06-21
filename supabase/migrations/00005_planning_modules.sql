create type billing_cycle as enum ('monthly', 'quarterly', 'yearly');

create table public.maintenance_assets (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  name text not null,
  last_service_date date,
  next_due_date date,
  vendor text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  name text not null,
  cost numeric(10,2) not null,
  billing_cycle billing_cycle not null default 'monthly',
  renewal_date date not null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.holiday_plans (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  destination text not null,
  start_date date not null,
  end_date date not null,
  budget_estimate numeric(10,2),
  notes text,
  packing_list jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.maintenance_assets enable row level security;
alter table public.subscriptions enable row level security;
alter table public.holiday_plans enable row level security;

create policy "maintenance_family_all" on public.maintenance_assets
for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy "subscriptions_family_all" on public.subscriptions
for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy "holiday_family_all" on public.holiday_plans
for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

grant select, insert, update, delete on public.maintenance_assets to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.holiday_plans to authenticated;

