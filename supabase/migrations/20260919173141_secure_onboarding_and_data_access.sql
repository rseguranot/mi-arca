-- This event-trigger helper is legitimate, but it never needs to be an API endpoint.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

-- Every new authenticated user receives an isolated starter church and director membership.
-- It avoids trusting editable user metadata for authorization decisions.
create function private.provision_new_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_church_id uuid;
begin
  insert into public.churches (name) values ('Mi Iglesia') returning id into new_church_id;
  insert into public.memberships (church_id, user_id, role, display_name)
  values (new_church_id, new.id, 'director', coalesce(new.raw_user_meta_data ->> 'full_name', 'Administración'));
  return new;
end;
$$;
revoke all on function private.provision_new_member() from public;

drop trigger if exists provision_new_member_on_signup on auth.users;
create trigger provision_new_member_on_signup
  after insert on auth.users
  for each row execute procedure private.provision_new_member();

grant update on public.churches to authenticated;
create policy director_church_update on public.churches
  for update to authenticated
  using ((select private.is_director(id)))
  with check ((select private.is_director(id)));
