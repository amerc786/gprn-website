-- ============================================================
-- GPRN Supabase Schema — Phase 3: Normalized Tables with RLS
-- Paste this into: Supabase dashboard → SQL Editor → New query → Run
-- Safe to re-run: every statement is idempotent.
-- IMPORTANT: Run AFTER supabase-schema.sql (Phase 2) is already applied.
-- ============================================================

-- ============================================================
-- 1. Helper function: get_app_id()
--    Maps auth.uid() → application-level ID (loc-001, prac-001)
-- ============================================================
create or replace function public.get_app_id()
returns text
language sql stable security definer
set search_path = public
as $$
    select coalesce(
        (select profile_data->>'id' from public.profiles where id = auth.uid()),
        ''
    );
$$;

create or replace function public.get_user_role()
returns text
language sql stable security definer
set search_path = public
as $$
    select coalesce(
        (select role from public.profiles where id = auth.uid()),
        ''
    );
$$;

-- ============================================================
-- 2. messages table
-- ============================================================
create table if not exists public.messages (
    id text primary key,
    thread_id text not null,
    from_id text not null,
    to_id text not null,
    subject text not null default '',
    body text not null,
    shift_id text,
    timestamp timestamptz not null default now(),
    read boolean not null default false,
    is_system boolean not null default false,
    deleted_for text[] not null default '{}',
    created_at timestamptz not null default now()
);

create index if not exists idx_messages_thread on public.messages(thread_id);
create index if not exists idx_messages_from on public.messages(from_id);
create index if not exists idx_messages_to on public.messages(to_id);

alter table public.messages enable row level security;

drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own"
    on public.messages for select to authenticated
    using (
        public.is_approved()
        and (from_id = public.get_app_id() or to_id = public.get_app_id())
        and not (public.get_app_id() = any(deleted_for))
    );

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
    on public.messages for insert to authenticated
    with check (
        public.is_approved()
        and from_id = public.get_app_id()
    );

drop policy if exists "messages_insert_system" on public.messages;
create policy "messages_insert_system"
    on public.messages for insert to authenticated
    with check (
        public.is_approved()
        and is_system = true
    );

drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own"
    on public.messages for update to authenticated
    using (
        public.is_approved()
        and (from_id = public.get_app_id() or to_id = public.get_app_id())
    );

drop policy if exists "messages_admin_select" on public.messages;
create policy "messages_admin_select"
    on public.messages for select to authenticated
    using (public.is_admin());

-- ============================================================
-- 3. notifications table
-- ============================================================
create table if not exists public.notifications (
    id text primary key,
    user_id text not null,
    type text not null,
    title text not null,
    message text not null,
    date timestamptz not null default now(),
    read boolean not null default false,
    acknowledged boolean not null default false,
    created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
    on public.notifications for select to authenticated
    using (
        public.is_approved()
        and user_id = public.get_app_id()
    );

drop policy if exists "notifications_insert_approved" on public.notifications;
create policy "notifications_insert_approved"
    on public.notifications for insert to authenticated
    with check (public.is_approved());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
    on public.notifications for update to authenticated
    using (user_id = public.get_app_id());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
    on public.notifications for delete to authenticated
    using (user_id = public.get_app_id());

-- ============================================================
-- 4. session_needs table (shift requests)
-- ============================================================
create table if not exists public.session_needs (
    id text primary key,
    practice_id text not null,
    practice_name text not null,
    health_board text,
    date date not null,
    session_type text not null,
    start_time text,
    end_time text,
    budget_rate numeric(10,2),
    notes text default '',
    housecalls boolean not null default false,
    status text not null default 'open',
    created_date date,
    offers_count integer not null default 0,
    created_at timestamptz not null default now()
);

create index if not exists idx_session_needs_practice on public.session_needs(practice_id);
create index if not exists idx_session_needs_status on public.session_needs(status);

alter table public.session_needs enable row level security;

-- Practice sees its own shifts
drop policy if exists "session_needs_select_own" on public.session_needs;
create policy "session_needs_select_own"
    on public.session_needs for select to authenticated
    using (
        public.is_approved()
        and practice_id = public.get_app_id()
    );

-- Locums can view open shifts (needed for available-shifts page)
drop policy if exists "session_needs_select_open" on public.session_needs;
create policy "session_needs_select_open"
    on public.session_needs for select to authenticated
    using (
        public.is_approved()
        and status = 'open'
        and public.get_user_role() = 'locum'
    );

drop policy if exists "session_needs_insert_own" on public.session_needs;
create policy "session_needs_insert_own"
    on public.session_needs for insert to authenticated
    with check (
        public.is_approved()
        and practice_id = public.get_app_id()
    );

drop policy if exists "session_needs_update_own" on public.session_needs;
create policy "session_needs_update_own"
    on public.session_needs for update to authenticated
    using (practice_id = public.get_app_id());

drop policy if exists "session_needs_delete_own" on public.session_needs;
create policy "session_needs_delete_own"
    on public.session_needs for delete to authenticated
    using (practice_id = public.get_app_id());

drop policy if exists "session_needs_admin" on public.session_needs;
create policy "session_needs_admin"
    on public.session_needs for select to authenticated
    using (public.is_admin());

-- ============================================================
-- 5. offers table
-- ============================================================
create table if not exists public.offers (
    id text primary key,
    session_need_id text not null,
    locum_id text not null,
    practice_id text not null,
    practice_name text not null,
    health_board text,
    session_date date not null,
    start_time text,
    end_time text,
    session_type text not null,
    proposed_rate numeric(10,2),
    locum_published_rate numeric(10,2),
    agreed_rate numeric(10,2),
    housecalls boolean not null default false,
    housecall_rate numeric(10,2) default 0,
    status text not null default 'sent',
    initiated_by text not null default 'practice',
    sent_date text,
    viewed_date text,
    expires_at text,
    accepted_date text,
    confirmed_date text,
    completed_date text,
    completed_by text,
    declined_date text,
    withdrawn_date text,
    auto_withdrawn boolean default false,
    expired_date text,
    cancelled_date text,
    cancelled_by text,
    late_cancellation boolean default false,
    no_show_date text,
    practice_message text default '',
    negotiations jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_offers_locum on public.offers(locum_id);
create index if not exists idx_offers_practice on public.offers(practice_id);
create index if not exists idx_offers_session_need on public.offers(session_need_id);
create index if not exists idx_offers_status on public.offers(status);

alter table public.offers enable row level security;

drop policy if exists "offers_select_own" on public.offers;
create policy "offers_select_own"
    on public.offers for select to authenticated
    using (
        public.is_approved()
        and (locum_id = public.get_app_id() or practice_id = public.get_app_id())
    );

drop policy if exists "offers_insert_approved" on public.offers;
create policy "offers_insert_approved"
    on public.offers for insert to authenticated
    with check (
        public.is_approved()
        and practice_id = public.get_app_id()
    );

drop policy if exists "offers_update_participant" on public.offers;
create policy "offers_update_participant"
    on public.offers for update to authenticated
    using (
        public.is_approved()
        and (locum_id = public.get_app_id() or practice_id = public.get_app_id())
    );

drop policy if exists "offers_admin" on public.offers;
create policy "offers_admin"
    on public.offers for select to authenticated
    using (public.is_admin());

-- ============================================================
-- 6. invoices table
-- ============================================================
create table if not exists public.invoices (
    id text primary key,
    invoice_number text not null,
    offer_id text,
    locum_id text not null,
    locum_name text,
    practice_id text not null,
    practice_name text,
    session_date text,
    shift_date text,
    session_type text,
    start_time text,
    end_time text,
    session_rate numeric(10,2),
    housecall_fee numeric(10,2) default 0,
    total numeric(10,2) not null,
    status text not null default 'pending',
    generated_date text,
    due_date text,
    paid_date text,
    dispute_reason text,
    created_at timestamptz not null default now()
);

create index if not exists idx_invoices_locum on public.invoices(locum_id);
create index if not exists idx_invoices_practice on public.invoices(practice_id);

alter table public.invoices enable row level security;

drop policy if exists "invoices_select_own" on public.invoices;
create policy "invoices_select_own"
    on public.invoices for select to authenticated
    using (
        public.is_approved()
        and (locum_id = public.get_app_id() or practice_id = public.get_app_id())
    );

drop policy if exists "invoices_insert_approved" on public.invoices;
create policy "invoices_insert_approved"
    on public.invoices for insert to authenticated
    with check (public.is_approved());

drop policy if exists "invoices_update_participant" on public.invoices;
create policy "invoices_update_participant"
    on public.invoices for update to authenticated
    using (
        locum_id = public.get_app_id() or practice_id = public.get_app_id()
    );

drop policy if exists "invoices_admin" on public.invoices;
create policy "invoices_admin"
    on public.invoices for select to authenticated
    using (public.is_admin());

-- ============================================================
-- 7. feedback table
-- ============================================================
create table if not exists public.feedback (
    id text primary key,
    from_id text not null,
    to_id text not null,
    offer_id text,
    ratings jsonb not null default '{}'::jsonb,
    comment text default '',
    from_role text,
    type text,
    locum_name text,
    timestamp timestamptz not null default now()
);

create index if not exists idx_feedback_to on public.feedback(to_id);
create index if not exists idx_feedback_from on public.feedback(from_id);

alter table public.feedback enable row level security;

drop policy if exists "feedback_select_approved" on public.feedback;
create policy "feedback_select_approved"
    on public.feedback for select to authenticated
    using (public.is_approved());

drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own"
    on public.feedback for insert to authenticated
    with check (
        public.is_approved()
        and from_id = public.get_app_id()
    );

drop policy if exists "feedback_delete_admin" on public.feedback;
create policy "feedback_delete_admin"
    on public.feedback for delete to authenticated
    using (public.is_admin());

-- ============================================================
-- 8. availability table
-- ============================================================
create table if not exists public.availability (
    locum_id text not null,
    date date not null,
    am text not null default 'none',
    pm text not null default 'none',
    primary key (locum_id, date)
);

create index if not exists idx_availability_locum on public.availability(locum_id);

alter table public.availability enable row level security;

drop policy if exists "availability_select_approved" on public.availability;
create policy "availability_select_approved"
    on public.availability for select to authenticated
    using (public.is_approved());

drop policy if exists "availability_insert_own" on public.availability;
create policy "availability_insert_own"
    on public.availability for insert to authenticated
    with check (locum_id = public.get_app_id());

drop policy if exists "availability_update_own" on public.availability;
create policy "availability_update_own"
    on public.availability for update to authenticated
    using (locum_id = public.get_app_id());

drop policy if exists "availability_delete_own" on public.availability;
create policy "availability_delete_own"
    on public.availability for delete to authenticated
    using (locum_id = public.get_app_id());

-- ============================================================
-- 9. barred_locums table
-- ============================================================
create table if not exists public.barred_locums (
    practice_id text not null,
    locum_id text not null,
    reason text,
    date text,
    primary key (practice_id, locum_id)
);

alter table public.barred_locums enable row level security;

drop policy if exists "barred_select_own" on public.barred_locums;
create policy "barred_select_own"
    on public.barred_locums for select to authenticated
    using (
        public.is_approved()
        and (practice_id = public.get_app_id() or locum_id = public.get_app_id())
    );

drop policy if exists "barred_insert_practice" on public.barred_locums;
create policy "barred_insert_practice"
    on public.barred_locums for insert to authenticated
    with check (practice_id = public.get_app_id());

drop policy if exists "barred_delete_practice" on public.barred_locums;
create policy "barred_delete_practice"
    on public.barred_locums for delete to authenticated
    using (practice_id = public.get_app_id());

-- ============================================================
-- 10. preferred_locums table
-- ============================================================
create table if not exists public.preferred_locums (
    practice_id text not null,
    locum_id text not null,
    primary key (practice_id, locum_id)
);

alter table public.preferred_locums enable row level security;

drop policy if exists "preferred_select_own" on public.preferred_locums;
create policy "preferred_select_own"
    on public.preferred_locums for select to authenticated
    using (
        public.is_approved()
        and practice_id = public.get_app_id()
    );

drop policy if exists "preferred_insert_practice" on public.preferred_locums;
create policy "preferred_insert_practice"
    on public.preferred_locums for insert to authenticated
    with check (practice_id = public.get_app_id());

drop policy if exists "preferred_delete_practice" on public.preferred_locums;
create policy "preferred_delete_practice"
    on public.preferred_locums for delete to authenticated
    using (practice_id = public.get_app_id());

-- ============================================================
-- 11. Data migration: blob → tables
--     Extracts data from app_state.data into the new tables.
--     Safe to re-run (on conflict do nothing).
-- ============================================================

-- Migrate messages
insert into public.messages (id, thread_id, from_id, to_id, subject, body, shift_id, timestamp, read, is_system, deleted_for)
select
    coalesce(m->>'id', 'msg-' || gen_random_uuid()::text),
    coalesce(m->>'threadId', ''),
    coalesce(m->>'fromId', ''),
    coalesce(m->>'toId', ''),
    coalesce(m->>'subject', ''),
    coalesce(m->>'body', ''),
    m->>'shiftId',
    coalesce((m->>'timestamp')::timestamptz, now()),
    coalesce((m->>'read')::boolean, false),
    coalesce((m->>'_system')::boolean, false),
    coalesce(
        (select array_agg(x::text) from jsonb_array_elements_text(m->'_deletedFor') x),
        '{}'
    )
from jsonb_array_elements(
    (select coalesce(data->'messages', '[]'::jsonb) from public.app_state where id = 1)
) as m
where m->>'id' is not null
on conflict (id) do nothing;

-- Migrate notifications
insert into public.notifications (id, user_id, type, title, message, date, read)
select
    coalesce(n->>'id', 'notif-' || gen_random_uuid()::text),
    coalesce(n->>'userId', ''),
    coalesce(n->>'type', 'info'),
    coalesce(n->>'title', ''),
    coalesce(n->>'message', ''),
    coalesce((n->>'date')::timestamptz, now()),
    coalesce((n->>'read')::boolean, false)
from jsonb_array_elements(
    (select coalesce(data->'notifications', '[]'::jsonb) from public.app_state where id = 1)
) as n
where n->>'id' is not null or n->>'userId' is not null
on conflict (id) do nothing;

-- Migrate session needs
insert into public.session_needs (id, practice_id, practice_name, health_board, date, session_type, start_time, end_time, budget_rate, notes, housecalls, status, created_date, offers_count)
select
    s->>'id',
    coalesce(s->>'practiceId', ''),
    coalesce(s->>'practiceName', ''),
    s->>'healthBoard',
    (s->>'date')::date,
    coalesce(s->>'sessionType', ''),
    s->>'startTime',
    s->>'endTime',
    (s->>'budgetRate')::numeric,
    coalesce(s->>'notes', ''),
    coalesce((s->>'housecalls')::boolean, false),
    coalesce(s->>'status', 'open'),
    (s->>'createdDate')::date,
    coalesce((s->>'offersCount')::integer, 0)
from jsonb_array_elements(
    (select coalesce(data->'shifts', '[]'::jsonb) from public.app_state where id = 1)
) as s
where s->>'id' is not null
on conflict (id) do nothing;

-- Migrate offers
insert into public.offers (id, session_need_id, locum_id, practice_id, practice_name, health_board, session_date, start_time, end_time, session_type, proposed_rate, locum_published_rate, agreed_rate, housecalls, housecall_rate, status, initiated_by, sent_date, viewed_date, expires_at, accepted_date, confirmed_date, completed_date, completed_by, declined_date, withdrawn_date, auto_withdrawn, expired_date, cancelled_date, cancelled_by, late_cancellation, no_show_date, practice_message, negotiations)
select
    o->>'id',
    coalesce(o->>'sessionNeedId', ''),
    coalesce(o->>'locumId', ''),
    coalesce(o->>'practiceId', ''),
    coalesce(o->>'practiceName', ''),
    o->>'healthBoard',
    coalesce((o->>'sessionDate')::date, (o->>'shiftDate')::date, current_date),
    o->>'startTime',
    o->>'endTime',
    coalesce(o->>'sessionType', ''),
    (o->>'proposedRate')::numeric,
    (o->>'locumPublishedRate')::numeric,
    (o->>'agreedRate')::numeric,
    coalesce((o->>'housecalls')::boolean, false),
    coalesce((o->>'housecallRate')::numeric, 0),
    coalesce(o->>'status', 'sent'),
    coalesce(o->>'initiatedBy', 'practice'),
    o->>'sentDate',
    o->>'viewedDate',
    o->>'expiresAt',
    o->>'acceptedDate',
    o->>'confirmedDate',
    o->>'completedDate',
    o->>'completedBy',
    o->>'declinedDate',
    o->>'withdrawnDate',
    coalesce((o->>'autoWithdrawn')::boolean, false),
    o->>'expiredDate',
    o->>'cancelledDate',
    o->>'cancelledBy',
    coalesce((o->>'lateCancellation')::boolean, false),
    o->>'noShowDate',
    coalesce(o->>'practiceMessage', ''),
    coalesce(o->'negotiations', '[]'::jsonb)
from jsonb_array_elements(
    (select coalesce(data->'offers', '[]'::jsonb) from public.app_state where id = 1)
) as o
where o->>'id' is not null
on conflict (id) do nothing;

-- Migrate invoices
insert into public.invoices (id, invoice_number, offer_id, locum_id, locum_name, practice_id, practice_name, session_date, shift_date, session_type, start_time, end_time, session_rate, housecall_fee, total, status, generated_date, due_date, paid_date, dispute_reason)
select
    i->>'id',
    coalesce(i->>'invoiceNumber', ''),
    i->>'offerId',
    coalesce(i->>'locumId', ''),
    i->>'locumName',
    coalesce(i->>'practiceId', ''),
    i->>'practiceName',
    i->>'sessionDate',
    i->>'shiftDate',
    i->>'sessionType',
    i->>'startTime',
    i->>'endTime',
    (i->>'sessionRate')::numeric,
    coalesce((i->>'housecallFee')::numeric, 0),
    coalesce((i->>'total')::numeric, 0),
    coalesce(i->>'status', 'pending'),
    i->>'generatedDate',
    i->>'dueDate',
    i->>'paidDate',
    i->>'disputeReason'
from jsonb_array_elements(
    (select coalesce(data->'invoices', '[]'::jsonb) from public.app_state where id = 1)
) as i
where i->>'id' is not null
on conflict (id) do nothing;

-- Migrate feedback
insert into public.feedback (id, from_id, to_id, offer_id, ratings, comment, from_role, type, locum_name, timestamp)
select
    coalesce(f->>'id', 'fb-' || gen_random_uuid()::text),
    coalesce(f->>'fromId', ''),
    coalesce(f->>'toId', ''),
    f->>'offerId',
    coalesce(f->'ratings', '{}'::jsonb),
    coalesce(f->>'comment', ''),
    f->>'fromRole',
    f->>'type',
    f->>'locumName',
    coalesce((f->>'timestamp')::timestamptz, now())
from jsonb_array_elements(
    (select coalesce(data->'feedback', '[]'::jsonb) from public.app_state where id = 1)
) as f
where f->>'fromId' is not null
on conflict (id) do nothing;

-- Migrate availability
insert into public.availability (locum_id, date, am, pm)
select
    locum_id,
    date_key::date,
    coalesce(day_data->>'am', 'none'),
    coalesce(day_data->>'pm', 'none')
from (
    select
        key as locum_id,
        jsonb_each(value) as kv
    from jsonb_each(
        (select coalesce(data->'availability', '{}'::jsonb) from public.app_state where id = 1)
    )
) sub,
lateral (select (sub.kv).key as date_key, (sub.kv).value as day_data) expanded
where date_key ~ '^\d{4}-\d{2}-\d{2}$'
on conflict (locum_id, date) do nothing;

-- Migrate barred lists
insert into public.barred_locums (practice_id, locum_id, reason, date)
select
    key as practice_id,
    b->>'locumId',
    b->>'reason',
    b->>'date'
from jsonb_each(
    (select coalesce(data->'barredLists', '{}'::jsonb) from public.app_state where id = 1)
) practice_lists,
lateral jsonb_array_elements(practice_lists.value) as b
where b->>'locumId' is not null
on conflict (practice_id, locum_id) do nothing;

-- Migrate preferred lists
insert into public.preferred_locums (practice_id, locum_id)
select
    key as practice_id,
    trim(both '"' from pref::text) as locum_id
from jsonb_each(
    (select coalesce(data->'preferredLists', '{}'::jsonb) from public.app_state where id = 1)
) practice_lists,
lateral jsonb_array_elements(practice_lists.value) as pref
where trim(both '"' from pref::text) != ''
on conflict (practice_id, locum_id) do nothing;

-- ============================================================
-- Done. All tables created, RLS applied, data migrated.
-- The app_state blob is preserved as a fallback.
-- ============================================================
