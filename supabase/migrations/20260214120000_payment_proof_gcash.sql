-- Paste this in Supabase SQL Editor (or merge into your migrations).
-- Adds GCash payment proof URL on requests + storage bucket for client payment screenshots.

-- 1) Column on requests (public URL after upload to storage)
alter table public.requests
  add column if not exists payment_proof_url text;

comment on column public.requests.payment_proof_url is 'Public URL of client payment screenshot (Supabase storage payment-screenshots bucket).';

-- 2) Clients may update only payment proof on their own rows (enforced by trigger below).
-- Owners keep full update via existing requests_update_owner policy.
drop policy if exists requests_update_client_payment on public.requests;
create policy requests_update_client_payment on public.requests
  for update to authenticated
  using (user_id = auth.uid() and public.app_role() = 'client')
  with check (user_id = auth.uid() and public.app_role() = 'client');

-- 3) Trigger: when role is client, forbid changing anything except payment_proof_url
-- (updated_at is handled separately by requests_set_updated_at and is not compared here).
create or replace function public.requests_client_update_columns_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.app_role() = 'owner' then
    return new;
  end if;
  if new.user_id is distinct from auth.uid() then
    return new;
  end if;
  if public.app_role() <> 'client' then
    return new;
  end if;
  if old.id is distinct from new.id
     or old.user_id is distinct from new.user_id
     or old.title is distinct from new.title
     or old.description is distinct from new.description
     or old.notes is distinct from new.notes
     or old.status is distinct from new.status
     or old.created_at is distinct from new.created_at
  then
    raise exception 'Clients may only update payment proof on their requests'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_requests_client_columns_guard on public.requests;
create trigger trg_requests_client_columns_guard
  before update on public.requests
  for each row
  execute function public.requests_client_update_columns_guard();

-- 4) Storage bucket for payment screenshots (same path pattern as reference-images: uid/...)
insert into storage.buckets (id, name, public)
values ('payment-screenshots', 'payment-screenshots', true)
on conflict (id) do nothing;

drop policy if exists payment_screenshots_upload on storage.objects;
create policy payment_screenshots_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-screenshots'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists payment_screenshots_read on storage.objects;
create policy payment_screenshots_read on storage.objects
  for select using (bucket_id = 'payment-screenshots');
