-- An Arca is the tenant boundary. Existing church_id columns remain as the
-- internal tenant key so historical school data stays intact.
create type public.arca_role as enum ('admin', 'educator');

alter table public.churches add column arca_code text;
update public.churches
set arca_code = 'ARCA-' || upper(substr(replace(id::text, '-', ''), 1, 10))
where arca_code is null;
alter table public.churches alter column arca_code set not null;
alter table public.churches add constraint churches_arca_code_unique unique (arca_code);

alter table public.memberships add column arca_role public.arca_role;
update public.memberships
set arca_role = case when role = 'director' then 'admin'::public.arca_role else 'educator'::public.arca_role end
where arca_role is null;
alter table public.memberships alter column arca_role set default 'educator';
alter table public.memberships alter column arca_role set not null;

create index memberships_church_role_idx on public.memberships(church_id, arca_role);

create table public.arca_invitations (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  email text not null check (email = lower(email)),
  arca_role public.arca_role not null default 'educator',
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_by uuid not null references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  check ((status = 'accepted') = (accepted_at is not null))
);
create unique index arca_invitations_pending_email_unique
  on public.arca_invitations(church_id, email) where status = 'pending';
create index arca_invitations_email_status_idx on public.arca_invitations(email, status);

alter table public.arca_invitations enable row level security;
revoke all on public.arca_invitations from anon, authenticated;
grant select on public.arca_invitations to authenticated;

create or replace function private.is_arca_admin(target_church_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.memberships
    where church_id = target_church_id
      and user_id = (select auth.uid())
      and arca_role = 'admin'
  )
$$;
revoke all on function private.is_arca_admin(uuid) from public;
grant execute on function private.is_arca_admin(uuid) to authenticated;

drop policy own_membership_select on public.memberships;
create policy arca_membership_select on public.memberships
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_arca_admin(church_id))
  );

create policy arca_invitation_select on public.arca_invitations
  for select to authenticated
  using (
    (select private.is_arca_admin(church_id))
    or email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

-- New users choose whether to create or join an Arca after they authenticate.
-- Profile fields are identity data only; they are not used for authorization.
create or replace function private.provision_new_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, username, sex, birth_date, phone, email, terms_accepted_at)
  values (
    new.id,
    trim(new.raw_user_meta_data ->> 'first_name'),
    trim(new.raw_user_meta_data ->> 'last_name'),
    lower(trim(new.raw_user_meta_data ->> 'username')),
    new.raw_user_meta_data ->> 'sex',
    (new.raw_user_meta_data ->> 'birth_date')::date,
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    new.email,
    now()
  );
  return new;
end;
$$;
revoke all on function private.provision_new_member() from public;

create or replace function public.create_arca(arca_name text, arca_city text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_arca_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required';
  end if;
  if char_length(trim(coalesce(arca_name, ''))) not between 2 and 120 then
    raise exception 'El nombre del Arca debe tener entre 2 y 120 caracteres';
  end if;

  insert into public.churches (name, city, arca_code)
  values (
    trim(arca_name),
    nullif(trim(coalesce(arca_city, '')), ''),
    'ARCA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  )
  returning id into new_arca_id;

  insert into public.memberships (church_id, user_id, role, arca_role, display_name)
  select new_arca_id, (select auth.uid()), 'director', 'admin', concat_ws(' ', first_name, last_name)
  from public.profiles where id = (select auth.uid());

  return new_arca_id;
end;
$$;
revoke all on function public.create_arca(text, text) from public;
grant execute on function public.create_arca(text, text) to authenticated;

create or replace function public.create_arca_invitation(target_church_id uuid, invitee_email text, invited_role public.arca_role default 'educator')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_token uuid;
  normalized_email text := lower(trim(coalesce(invitee_email, '')));
begin
  if (select auth.uid()) is null or not (select private.is_arca_admin(target_church_id)) then
    raise exception 'Only an Arca administrator can invite members';
  end if;
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'El correo de la invitación no es válido';
  end if;

  update public.arca_invitations
  set status = 'revoked'
  where church_id = target_church_id and email = normalized_email and status = 'pending';

  insert into public.arca_invitations (church_id, email, arca_role, created_by)
  values (target_church_id, normalized_email, invited_role, (select auth.uid()))
  returning token into invitation_token;
  return invitation_token;
end;
$$;
revoke all on function public.create_arca_invitation(uuid, text, public.arca_role) from public;
grant execute on function public.create_arca_invitation(uuid, text, public.arca_role) to authenticated;

create or replace function public.accept_arca_invitation(invitation_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.arca_invitations%rowtype;
  current_email text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required';
  end if;
  select lower(email) into current_email from auth.users where id = (select auth.uid());
  select * into invitation from public.arca_invitations where token = invitation_token for update;
  if not found or invitation.status <> 'pending' or invitation.expires_at <= now() then
    raise exception 'La invitación no está disponible';
  end if;
  if invitation.email <> current_email then
    raise exception 'Esta invitación fue enviada a otro correo';
  end if;

  insert into public.memberships (church_id, user_id, role, arca_role, display_name)
  select invitation.church_id, (select auth.uid()),
         case when invitation.arca_role = 'admin' then 'director'::public.member_role else 'teacher'::public.member_role end,
         invitation.arca_role, concat_ws(' ', first_name, last_name)
  from public.profiles where id = (select auth.uid())
  on conflict (church_id, user_id) do update set arca_role = excluded.arca_role,
    role = excluded.role;

  update public.arca_invitations
  set status = 'accepted', accepted_at = now(), accepted_by = (select auth.uid())
  where id = invitation.id;
  return invitation.church_id;
end;
$$;
revoke all on function public.accept_arca_invitation(uuid) from public;
grant execute on function public.accept_arca_invitation(uuid) to authenticated;
