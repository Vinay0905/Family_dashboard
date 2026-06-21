create type expense_category as enum ('grocery', 'utilities', 'education', 'fuel', 'entertainment', 'medical', 'travel', 'miscellaneous');

create table public.expenses (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  paid_by uuid not null references auth.users(id),
  amount numeric(10,2) not null check (amount > 0),
  category expense_category not null default 'miscellaneous',
  description text,
  expense_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_expenses_family_date on public.expenses(family_id, expense_date);

alter table public.expenses enable row level security;

create policy "expenses_select_family" on public.expenses
for select using (public.is_family_member(family_id));

create policy "expenses_insert_family" on public.expenses
for insert with check (public.is_family_member(family_id) and created_by = auth.uid());

create policy "expenses_update_owner_admin" on public.expenses
for update using (created_by = auth.uid() or public.is_family_admin(family_id));

create policy "expenses_delete_owner_admin" on public.expenses
for delete using (created_by = auth.uid() or public.is_family_admin(family_id));

grant select, insert, update, delete on public.expenses to authenticated;

