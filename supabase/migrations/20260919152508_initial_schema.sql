create extension if not exists pgcrypto;
create schema if not exists private;

create type public.member_role as enum ('director', 'volunteer');
create type public.session_status as enum ('scheduled', 'completed', 'cancelled');
create type public.attendance_status as enum ('present', 'absent', 'late');
create type public.transaction_type as enum ('income', 'expense');

create table public.churches (
  id uuid primary key default gen_random_uuid(), name text not null, city text,
  created_at timestamptz not null default now()
);
create table public.memberships (
  id uuid primary key default gen_random_uuid(), church_id uuid not null references public.churches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role public.member_role not null default 'volunteer',
  display_name text, created_at timestamptz not null default now(), unique(church_id, user_id)
);
create table public.groups (
  id uuid primary key default gen_random_uuid(), church_id uuid not null references public.churches(id) on delete cascade,
  name text not null, min_age smallint, max_age smallint, active boolean not null default true, created_at timestamptz not null default now()
);
create table public.guardians (
  id uuid primary key default gen_random_uuid(), church_id uuid not null references public.churches(id) on delete cascade,
  full_name text not null, phone text, email text, created_at timestamptz not null default now()
);
create table public.students (
  id uuid primary key default gen_random_uuid(), church_id uuid not null references public.churches(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null, guardian_id uuid references public.guardians(id) on delete set null,
  first_name text not null, last_name text not null, birth_date date, allergies text, medical_notes text,
  active boolean not null default true, created_at timestamptz not null default now()
);
create table public.curricula (
  id uuid primary key default gen_random_uuid(), church_id uuid not null references public.churches(id) on delete cascade,
  title text not null, description text, starts_on date, ends_on date, created_at timestamptz not null default now()
);
create table public.lessons (
  id uuid primary key default gen_random_uuid(), church_id uuid not null references public.churches(id) on delete cascade,
  curriculum_id uuid references public.curricula(id) on delete set null, title text not null, bible_reference text,
  description text, material_url text, created_at timestamptz not null default now()
);
create table public.class_sessions (
  id uuid primary key default gen_random_uuid(), church_id uuid not null references public.churches(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete restrict, lesson_id uuid references public.lessons(id) on delete set null,
  starts_at timestamptz not null, ends_at timestamptz, status public.session_status not null default 'scheduled', notes text, created_at timestamptz not null default now()
);
create table public.session_volunteers (
  session_id uuid not null references public.class_sessions(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade,
  church_id uuid not null references public.churches(id) on delete cascade, assignment text not null check (assignment in ('teacher', 'assistant')),
  primary key(session_id, user_id)
);
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(), church_id uuid not null references public.churches(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade, student_id uuid not null references public.students(id) on delete cascade,
  status public.attendance_status not null, notes text, recorded_by uuid references auth.users(id), recorded_at timestamptz not null default now(), unique(session_id, student_id)
);
create table public.finance_categories (
  id uuid primary key default gen_random_uuid(), church_id uuid not null references public.churches(id) on delete cascade,
  name text not null, budget_amount numeric(12,2) not null default 0, active boolean not null default true, unique(church_id, name)
);
create table public.finance_transactions (
  id uuid primary key default gen_random_uuid(), church_id uuid not null references public.churches(id) on delete cascade,
  category_id uuid references public.finance_categories(id) on delete set null, type public.transaction_type not null,
  concept text not null, amount numeric(12,2) not null check (amount > 0), occurred_on date not null default current_date,
  receipt_url text, created_by uuid references auth.users(id), created_at timestamptz not null default now()
);

create index on public.memberships(user_id, church_id);
create index on public.students(church_id, group_id) where active;
create index on public.class_sessions(church_id, starts_at);
create index on public.attendance_records(church_id, session_id);
create index on public.finance_transactions(church_id, occurred_on);

create function private.current_church_ids() returns setof uuid language sql security definer set search_path = '' stable as $$
  select church_id from public.memberships where user_id = (select auth.uid())
$$;
revoke all on function private.current_church_ids() from public;
grant usage on schema private to authenticated;
grant execute on function private.current_church_ids() to authenticated;

create function private.is_director(target_church_id uuid) returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.memberships where church_id = target_church_id and user_id = (select auth.uid()) and role = 'director')
$$;
revoke all on function private.is_director(uuid) from public;
grant execute on function private.is_director(uuid) to authenticated;

-- All operational data is visible only to a member of the same church.
do $$ declare t text; begin
  foreach t in array array['groups','guardians','students','curricula','lessons','class_sessions','session_volunteers','attendance_records','finance_categories','finance_transactions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy member_select on public.%I for select to authenticated using (church_id in (select private.current_church_ids()))', t);
    execute format('create policy member_insert on public.%I for insert to authenticated with check (church_id in (select private.current_church_ids()))', t);
    execute format('create policy member_update on public.%I for update to authenticated using (church_id in (select private.current_church_ids())) with check (church_id in (select private.current_church_ids()))', t);
    execute format('create policy member_delete on public.%I for delete to authenticated using (church_id in (select private.current_church_ids()))', t);
  end loop;
end $$;

alter table public.churches enable row level security;
revoke all on public.churches from anon, authenticated;
grant select on public.churches to authenticated;
create policy member_church_select on public.churches for select to authenticated using (id in (select private.current_church_ids()));

alter table public.memberships enable row level security;
revoke all on public.memberships from anon, authenticated;
grant select on public.memberships to authenticated;
create policy own_membership_select on public.memberships for select to authenticated using (user_id = (select auth.uid()));

-- Financial administration is restricted to directors.
drop policy member_insert on public.finance_categories; drop policy member_update on public.finance_categories; drop policy member_delete on public.finance_categories;
drop policy member_insert on public.finance_transactions; drop policy member_update on public.finance_transactions; drop policy member_delete on public.finance_transactions;
create policy director_category_insert on public.finance_categories for insert to authenticated with check ((select private.is_director(church_id)));
create policy director_category_update on public.finance_categories for update to authenticated using ((select private.is_director(church_id))) with check ((select private.is_director(church_id)));
create policy director_category_delete on public.finance_categories for delete to authenticated using ((select private.is_director(church_id)));
create policy director_transaction_insert on public.finance_transactions for insert to authenticated with check ((select private.is_director(church_id)));
create policy director_transaction_update on public.finance_transactions for update to authenticated using ((select private.is_director(church_id))) with check ((select private.is_director(church_id)));
create policy director_transaction_delete on public.finance_transactions for delete to authenticated using ((select private.is_director(church_id)));
