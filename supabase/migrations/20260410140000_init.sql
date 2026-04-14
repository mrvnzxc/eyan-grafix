-- Layout requests schema for Supabase + PostGraphile
-- Run via Supabase SQL editor or: supabase db push

-- Profiles linked to auth.users
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'client' check (role in ('client', 'owner')),
  created_at timestamptz not null default now()
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  notes text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.request_images (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  image_url text not null
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  owner_message text,
  layout_file_url text,
  created_at timestamptz not null default now(),
  unique (request_id)
);

create index if not exists requests_user_id_idx on public.requests (user_id);
create index if not exists requests_status_idx on public.requests (status);
create index if not exists request_images_request_id_idx on public.request_images (request_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists requests_set_updated_at on public.requests;
create trigger requests_set_updated_at
  before update on public.requests
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.requests enable row level security;
alter table public.request_images enable row level security;
alter table public.responses enable row level security;

-- Helper: current app role
create or replace function public.app_role()
returns text as $$
  select u.role from public.users u where u.id = auth.uid() limit 1;
$$ language sql stable security definer set search_path = public;

grant execute on function public.app_role() to authenticated, anon;

-- users
drop policy if exists users_select_self_or_owner on public.users;
create policy users_select_self_or_owner on public.users
  for select using (
    id = auth.uid() or public.app_role() = 'owner'
  );

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert with check (id = auth.uid());

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update using (id = auth.uid());

-- requests
drop policy if exists requests_select on public.requests;
create policy requests_select on public.requests
  for select using (
    user_id = auth.uid() or public.app_role() = 'owner'
  );

drop policy if exists requests_insert_client on public.requests;
create policy requests_insert_client on public.requests
  for insert with check (
    user_id = auth.uid()
    and public.app_role() = 'client'
  );

drop policy if exists requests_update_owner on public.requests;
create policy requests_update_owner on public.requests
  for update using (public.app_role() = 'owner');

-- request_images
drop policy if exists request_images_select on public.request_images;
create policy request_images_select on public.request_images
  for select using (
    exists (
      select 1 from public.requests r
      where r.id = request_id and (r.user_id = auth.uid() or public.app_role() = 'owner')
    )
  );

drop policy if exists request_images_insert_client on public.request_images;
create policy request_images_insert_client on public.request_images
  for insert with check (
    exists (
      select 1 from public.requests r
      where r.id = request_id and r.user_id = auth.uid() and public.app_role() = 'client'
    )
  );

-- responses
drop policy if exists responses_select on public.responses;
create policy responses_select on public.responses
  for select using (
    exists (
      select 1 from public.requests r
      where r.id = request_id and (r.user_id = auth.uid() or public.app_role() = 'owner')
    )
  );

drop policy if exists responses_insert_owner on public.responses;
create policy responses_insert_owner on public.responses
  for insert with check (public.app_role() = 'owner');

drop policy if exists responses_update_owner on public.responses;
create policy responses_update_owner on public.responses
  for update using (public.app_role() = 'owner')
  with check (public.app_role() = 'owner');

drop policy if exists responses_delete_owner on public.responses;
create policy responses_delete_owner on public.responses
  for delete using (public.app_role() = 'owner');

-- Storage buckets (public read for simple delivery links)
insert into storage.buckets (id, name, public)
values ('reference-images', 'reference-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('layouts', 'layouts', true)
on conflict (id) do nothing;

drop policy if exists ref_images_upload on storage.objects;
create policy ref_images_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'reference-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists ref_images_read on storage.objects;
create policy ref_images_read on storage.objects
  for select using (bucket_id = 'reference-images');

drop policy if exists layouts_upload_owner on storage.objects;
create policy layouts_upload_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'layouts'
    and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'owner')
  );

drop policy if exists layouts_read on storage.objects;
create policy layouts_read on storage.objects
  for select using (bucket_id = 'layouts');

-- PostGraphile / API: grant usage (Supabase uses authenticated role)
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
