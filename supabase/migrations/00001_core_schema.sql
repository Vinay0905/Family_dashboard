create extension if not exists "uuid-ossp";

create type user_role as enum ('admin', 'member', 'child');
create type task_status as enum ('open', 'in_progress', 'completed');
create type task_priority as enum ('low', 'medium', 'high');
create type event_category as enum ('family', 'school', 'work', 'travel', 'birthday', 'medical', 'other');

create table public.families (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  invite_code text unique default substr(md5(random()::text), 1, 8),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_members (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role user_role not null default 'member',
  display_name text,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, user_id)
);

create table public.events (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default false,
  category event_category not null default 'other',
  location text,
  is_personal boolean not null default false,
  color text default '#6366f1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  assigned_to uuid references auth.users(id),
  title text not null,
  description text,
  due_date date,
  priority task_priority not null default 'medium',
  status task_status not null default 'open',
  is_personal boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_family_members_user on public.family_members(user_id);
create index idx_family_members_family on public.family_members(family_id);
create index idx_events_family_start on public.events(family_id, start_at);
create index idx_tasks_family_status on public.tasks(family_id, status);
create index idx_tasks_assigned_to on public.tasks(assigned_to);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_families_updated_at before update on public.families
for each row execute function public.set_updated_at();

create trigger trg_family_members_updated_at before update on public.family_members
for each row execute function public.set_updated_at();

create trigger trg_events_updated_at before update on public.events
for each row execute function public.set_updated_at();

create trigger trg_tasks_updated_at before update on public.tasks
for each row execute function public.set_updated_at();