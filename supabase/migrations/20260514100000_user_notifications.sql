-- In-app notifications for clients and owners (RLS: read/update own rows only).
-- Rows are inserted by SECURITY DEFINER triggers (no client INSERT policy).

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in (
    'new_request',
    'studio_reply',
    'payment_proof',
    'request_completed',
    'request_in_progress'
  )),
  title text not null,
  body text,
  request_id uuid references public.requests (id) on delete cascade,
  actor_user_id uuid references public.users (id) on delete set null,
  actor_name text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications (user_id)
  where read_at is null;

alter table public.user_notifications enable row level security;

drop policy if exists user_notifications_select_own on public.user_notifications;
create policy user_notifications_select_own on public.user_notifications
  for select using (user_id = auth.uid());

drop policy if exists user_notifications_update_own on public.user_notifications;
create policy user_notifications_update_own on public.user_notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No INSERT/DELETE for authenticated — triggers insert as definer.

-- --- Notify all owners: new request ---
create or replace function public.trg_requests_notify_new()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
  client_name text;
begin
  select coalesce(nullif(trim(u.name), ''), nullif(trim(u.email), ''), 'Client') into client_name
  from public.users u where u.id = new.user_id;

  for o in select id from public.users where role = 'owner' loop
    insert into public.user_notifications (user_id, type, title, body, request_id, actor_user_id, actor_name)
    values (
      o.id,
      'new_request',
      'New layout request',
      new.title,
      new.id,
      new.user_id,
      client_name
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_requests_notify_new on public.requests;
create trigger trg_requests_notify_new
  after insert on public.requests
  for each row execute function public.trg_requests_notify_new();

-- --- Notify owners: client uploaded / changed payment proof ---
create or replace function public.trg_requests_notify_payment_proof()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  o record;
  client_name text;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if new.payment_proof_url is null
     or new.payment_proof_url is not distinct from old.payment_proof_url then
    return new;
  end if;

  select coalesce(nullif(trim(u.name), ''), nullif(trim(u.email), ''), 'Client') into client_name
  from public.users u where u.id = new.user_id;

  for o in select id from public.users where role = 'owner' loop
    insert into public.user_notifications (user_id, type, title, body, request_id, actor_user_id, actor_name)
    values (
      o.id,
      'payment_proof',
      'Payment screenshot uploaded',
      new.title,
      new.id,
      new.user_id,
      client_name
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_requests_notify_payment_proof on public.requests;
create trigger trg_requests_notify_payment_proof
  after update on public.requests
  for each row execute function public.trg_requests_notify_payment_proof();

-- --- Notify client: status completed / in progress ---
create or replace function public.trg_requests_notify_status_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  if tg_op <> 'UPDATE' or new.status is not distinct from old.status then
    return new;
  end if;

  select coalesce(
    (select coalesce(nullif(trim(u.name), ''), nullif(trim(u.email), ''), 'Studio')
     from public.users u where u.id = auth.uid() limit 1),
    'Studio'
  ) into actor_name;

  if new.status = 'completed' and old.status is distinct from 'completed' then
    insert into public.user_notifications (user_id, type, title, body, request_id, actor_user_id, actor_name)
    values (
      new.user_id,
      'request_completed',
      'Request completed',
      new.title,
      new.id,
      auth.uid(),
      actor_name
    );
  elsif new.status = 'in_progress' and old.status = 'pending' then
    insert into public.user_notifications (user_id, type, title, body, request_id, actor_user_id, actor_name)
    values (
      new.user_id,
      'request_in_progress',
      'Work started on your request',
      new.title,
      new.id,
      auth.uid(),
      actor_name
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_requests_notify_status_client on public.requests;
create trigger trg_requests_notify_status_client
  after update on public.requests
  for each row execute function public.trg_requests_notify_status_client();

-- --- Notify client: studio reply (response row) ---
create or replace function public.trg_responses_notify_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client_id uuid;
  req_title text;
  owner_name text;
  has_msg boolean;
  has_layout boolean;
  should_notify boolean := false;
begin
  has_msg := length(trim(coalesce(new.owner_message, ''))) > 0;
  has_layout := new.layout_file_url is not null;

  if tg_op = 'INSERT' then
    should_notify := has_msg or has_layout;
  else
    should_notify :=
      (old.owner_message is distinct from new.owner_message and has_msg)
      or (old.layout_file_url is distinct from new.layout_file_url and has_layout);
  end if;

  if not should_notify then
    return new;
  end if;

  select r.user_id, r.title into client_id, req_title
  from public.requests r where r.id = new.request_id;

  if client_id is null then
    return new;
  end if;

  select coalesce(
    (select coalesce(nullif(trim(u.name), ''), nullif(trim(u.email), ''), 'Studio')
     from public.users u where u.id = auth.uid() limit 1),
    'Studio'
  ) into owner_name;

  insert into public.user_notifications (user_id, type, title, body, request_id, actor_user_id, actor_name)
  values (
    client_id,
    'studio_reply',
    'Update from the studio',
    case
      when has_msg then left(trim(new.owner_message), 280)
      when has_layout then 'A layout file is available for: ' || coalesce(req_title, 'your request')
      else coalesce(req_title, 'Your request')
    end,
    new.request_id,
    auth.uid(),
    owner_name
  );

  return new;
end;
$$;

drop trigger if exists trg_responses_notify_client on public.responses;
create trigger trg_responses_notify_client
  after insert or update on public.responses
  for each row execute function public.trg_responses_notify_client();

grant select, update on public.user_notifications to authenticated;
grant all on public.user_notifications to postgres, service_role;
