-- ============================================================
-- GPRN Supabase Phase 1 Schema
-- Paste this into: Supabase dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1. Create the shared app_state table (single-row JSON blob)
create table if not exists public.app_state (
    id integer primary key default 1,
    data jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now(),
    constraint single_row check (id = 1)
);

-- 2. Seed the initial row if it doesn't exist yet
insert into public.app_state (id, data)
values (1, '{"locums": [], "practices": [], "shifts": [], "offers": [], "availability": {}, "messages": [], "invoices": [], "notifications": [], "cpdEvents": [], "feedback": []}'::jsonb)
on conflict (id) do nothing;

-- 3. Enable Row Level Security
alter table public.app_state enable row level security;

-- 4. Policies: any signed-in user can read and write the shared blob.
--    (Phase 2 will split this into per-user tables with stricter policies.)
drop policy if exists "authenticated read" on public.app_state;
create policy "authenticated read"
    on public.app_state for select
    to authenticated
    using (true);

drop policy if exists "authenticated write" on public.app_state;
create policy "authenticated write"
    on public.app_state for update
    to authenticated
    using (true)
    with check (true);

drop policy if exists "authenticated insert" on public.app_state;
create policy "authenticated insert"
    on public.app_state for insert
    to authenticated
    with check (true);

-- 5. Trigger to keep updated_at fresh on every write
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_app_state_touch on public.app_state;
create trigger trg_app_state_touch
    before update on public.app_state
    for each row execute function public.touch_updated_at();

-- ============================================================
-- Done. Next: in the dashboard, go to
--   Authentication → Providers → Email
--   and DISABLE "Confirm email" so signups work without clicking a link.
-- ============================================================
