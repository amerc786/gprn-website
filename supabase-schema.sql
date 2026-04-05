-- ============================================================
-- GPRN Supabase Schema — Phase 2: Manual Account Approval Workflow
-- Paste this into: Supabase dashboard → SQL Editor → New query → Run
-- Safe to re-run: every statement is idempotent.
-- ============================================================

-- Extensions we rely on
create extension if not exists pg_net;  -- used by the email webhook (Edge Function call)

-- ============================================================
-- 1. approval_status enum
-- ============================================================
do $$ begin
    create type public.approval_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ============================================================
-- 2. profiles table — authoritative identity + status record
-- ============================================================
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    role text not null check (role in ('locum', 'practice')),
    approval_status public.approval_status not null default 'pending',
    is_admin boolean not null default false,
    profile_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    approved_at timestamptz,
    approved_by uuid references auth.users(id),
    rejected_at timestamptz,
    rejected_by uuid references auth.users(id),
    rejection_reason text
);

create index if not exists idx_profiles_status on public.profiles(approval_status);
create index if not exists idx_profiles_email on public.profiles(email);

-- ============================================================
-- 3. Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
    select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_approved()
returns boolean
language sql stable security definer
set search_path = public
as $$
    select coalesce(
        (select approval_status = 'approved' from public.profiles where id = auth.uid()),
        false
    );
$$;

-- ============================================================
-- 4. Trigger: non-admins cannot change status, is_admin, or approval metadata
--    (Belt-and-braces alongside RLS — blocks direct REST attacks.)
-- ============================================================
create or replace function public.enforce_profile_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare caller_is_admin boolean;
begin
    -- When auth.uid() is NULL the update is coming from a backend context
    -- (SQL Editor, service role, superuser, SECURITY DEFINER helpers like
    -- bootstrap_admin). Those are trusted — only guard REST-originated updates.
    if auth.uid() is null then
        return new;
    end if;
    caller_is_admin := public.is_admin();
    if not caller_is_admin then
        if new.approval_status is distinct from old.approval_status then
            raise exception 'Permission denied: cannot change approval_status';
        end if;
        if new.is_admin is distinct from old.is_admin then
            raise exception 'Permission denied: cannot change is_admin';
        end if;
        if new.approved_at is distinct from old.approved_at
           or new.approved_by is distinct from old.approved_by
           or new.rejected_at is distinct from old.rejected_at
           or new.rejected_by is distinct from old.rejected_by
           or new.rejection_reason is distinct from old.rejection_reason then
            raise exception 'Permission denied: cannot change approval metadata';
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_profiles_immutability on public.profiles;
create trigger trg_profiles_immutability
    before update on public.profiles
    for each row execute function public.enforce_profile_immutability();

-- ============================================================
-- 5. RLS policies on profiles
-- ============================================================
alter table public.profiles enable row level security;

-- Insert: a signed-in user can insert exactly one row keyed by their own auth.uid,
-- and only in the pending / non-admin state.
drop policy if exists "self insert pending" on public.profiles;
create policy "self insert pending"
    on public.profiles for insert
    to authenticated
    with check (
        id = auth.uid()
        and approval_status = 'pending'
        and is_admin = false
        and approved_at is null
        and rejected_at is null
    );

-- Read: user sees own row
drop policy if exists "self read" on public.profiles;
create policy "self read"
    on public.profiles for select
    to authenticated
    using (id = auth.uid());

-- Read: admin sees all
drop policy if exists "admin read all" on public.profiles;
create policy "admin read all"
    on public.profiles for select
    to authenticated
    using (public.is_admin());

-- Update: user may update their own row (trigger blocks sensitive columns)
drop policy if exists "self update" on public.profiles;
create policy "self update"
    on public.profiles for update
    to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());

-- Update: admin may update any row
drop policy if exists "admin update" on public.profiles;
create policy "admin update"
    on public.profiles for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- Delete: admin only
drop policy if exists "admin delete" on public.profiles;
create policy "admin delete"
    on public.profiles for delete
    to authenticated
    using (public.is_admin());

-- ============================================================
-- 6. app_state table — shared app data (shifts/offers/etc.)
--    Locked down: only approved users can read or write.
-- ============================================================
create table if not exists public.app_state (
    id integer primary key default 1,
    data jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    constraint single_row check (id = 1)
);

insert into public.app_state (id, data)
values (1, '{"locums": [], "practices": [], "shifts": [], "offers": [], "availability": {}, "messages": [], "invoices": [], "notifications": [], "cpdEvents": [], "feedback": []}'::jsonb)
on conflict (id) do nothing;

alter table public.app_state enable row level security;

-- Drop legacy Phase 1 policies that allowed any authenticated user
drop policy if exists "authenticated read" on public.app_state;
drop policy if exists "authenticated write" on public.app_state;
drop policy if exists "authenticated insert" on public.app_state;

drop policy if exists "approved read" on public.app_state;
create policy "approved read"
    on public.app_state for select
    to authenticated
    using (public.is_approved());

drop policy if exists "approved update" on public.app_state;
create policy "approved update"
    on public.app_state for update
    to authenticated
    using (public.is_approved())
    with check (public.is_approved());

-- Note: no INSERT policy. The single row is seeded above and never re-inserted.

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_app_state_touch on public.app_state;
create trigger trg_app_state_touch
    before update on public.app_state
    for each row execute function public.touch_updated_at();

-- ============================================================
-- 7. Admin bootstrap helper
--    After you sign up your own account via the website (it will be pending),
--    run this ONCE in the SQL Editor to make yourself admin + approved:
--      select public.bootstrap_admin('your-email@example.com');
-- ============================================================
create or replace function public.bootstrap_admin(admin_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare target_id uuid;
begin
    select id into target_id from auth.users where email = admin_email limit 1;
    if target_id is null then
        raise exception 'No auth user found with email %. Sign up via the website first.', admin_email;
    end if;
    update public.profiles
    set is_admin = true,
        approval_status = 'approved',
        approved_at = coalesce(approved_at, now()),
        approved_by = coalesce(approved_by, target_id)
    where id = target_id;
    if not found then
        raise exception 'No profile row for %. Complete the registration form on the website first.', admin_email;
    end if;
end;
$$;

-- ============================================================
-- 8. One-time migration: bring existing Phase 1 users into profiles
--    Any locum/practice currently in the app_state blob that matches an
--    auth.users email gets an approved profile row so they keep working.
--    Safe to re-run (on conflict do nothing).
-- ============================================================
do $$
declare
    blob_data jsonb;
    rec jsonb;
    auth_id uuid;
begin
    select data into blob_data from public.app_state where id = 1;
    if blob_data is null then return; end if;

    for rec in select * from jsonb_array_elements(coalesce(blob_data->'locums','[]'::jsonb)) loop
        select id into auth_id from auth.users where email = (rec->>'email') limit 1;
        if auth_id is not null then
            insert into public.profiles (id, email, role, approval_status, profile_data, approved_at, approved_by)
            values (auth_id, rec->>'email', 'locum', 'approved', rec, now(), auth_id)
            on conflict (id) do nothing;
        end if;
    end loop;

    for rec in select * from jsonb_array_elements(coalesce(blob_data->'practices','[]'::jsonb)) loop
        select id into auth_id from auth.users where email = (rec->>'email') limit 1;
        if auth_id is not null then
            insert into public.profiles (id, email, role, approval_status, profile_data, approved_at, approved_by)
            values (auth_id, rec->>'email', 'practice', 'approved', rec, now(), auth_id)
            on conflict (id) do nothing;
        end if;
    end loop;
end $$;

-- ============================================================
-- Done.
-- Next steps (do these in the Supabase dashboard, in order):
--   1. Sign up your admin account on the live site (it will land on the pending page — that's expected)
--   2. Come back here and run: select public.bootstrap_admin('your-email@example.com');
--   3. (Optional) Deploy the send-approval-email Edge Function and create a
--      database webhook on public.profiles for UPDATE events. See chat instructions.
-- ============================================================
