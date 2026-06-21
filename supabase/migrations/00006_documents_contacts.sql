create type contact_category as enum ('doctor', 'school', 'electrician', 'plumber', 'driver', 'other');
create type document_category as enum ('warranty', 'manual', 'travel', 'school', 'other');

create table public.contacts (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  name text not null,
  category contact_category not null default 'other',
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid not null references public.families(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  name text not null,
  category document_category not null default 'other',
  storage_path text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  52428800,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do nothing;

alter table public.contacts enable row level security;
alter table public.documents enable row level security;

create policy "contacts_family_all" on public.contacts
for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

create policy "documents_family_all" on public.documents
for all using (public.is_family_member(family_id)) with check (public.is_family_member(family_id));

grant select, insert, update, delete on public.contacts to authenticated;
grant select, insert, update, delete on public.documents to authenticated;

