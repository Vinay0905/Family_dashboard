create type reminder_category as enum ('bill', 'birthday', 'anniversary', 'renewal', 'maintenance', 'travel', 'other');

create table public.shopping_lists (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shopping_items (
  id uuid primary key default uuid_generate_v4(),
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  added_by uuid not null references auth.users(id),
  name text not null,
  quantity numeric default 1,
  unit text,
  is_purchased boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null,
  remind_at timestamptz not null,
  category reminder_category not null default 'other',
  is_acknowledged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shopping_lists enable row level security;
alter table public.shopping_items enable row level security;
alter table public.reminders enable row level security;

create policy "shopping_lists_family_all" on public.shopping_lists
for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy "shopping_items_family_all" on public.shopping_items
for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy "reminders_family_all" on public.reminders
for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));