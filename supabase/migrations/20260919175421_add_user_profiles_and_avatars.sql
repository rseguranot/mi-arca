create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) between 2 and 80),
  last_name text not null check (char_length(trim(last_name)) between 2 and 80),
  username text not null check (username ~ '^[a-z0-9][a-z0-9._-]{2,29}$'),
  sex text not null check (sex in ('female', 'male', 'undisclosed')),
  birth_date date not null check (birth_date <= current_date),
  phone text,
  email text not null,
  avatar_path text,
  terms_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_username_lower_unique on public.profiles (lower(username));

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;
create policy profile_owner_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profile_owner_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy avatar_owner_select on storage.objects for select to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy avatar_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy avatar_owner_update on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text))
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy avatar_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

create or replace function private.provision_new_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_church_id uuid;
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
  insert into public.churches (name) values ('Mi Iglesia') returning id into new_church_id;
  insert into public.memberships (church_id, user_id, role, display_name)
  values (new_church_id, new.id, 'director', concat_ws(' ', trim(new.raw_user_meta_data ->> 'first_name'), trim(new.raw_user_meta_data ->> 'last_name')));
  return new;
end;
$$;

-- Backfill only exists for environments that had accounts before this release.
insert into public.profiles (id, first_name, last_name, username, sex, birth_date, email, terms_accepted_at)
select id, 'Usuario', 'Migrado', 'user_' || replace(id::text, '-', ''), 'undisclosed', current_date, email, now()
from auth.users
on conflict (id) do nothing;
