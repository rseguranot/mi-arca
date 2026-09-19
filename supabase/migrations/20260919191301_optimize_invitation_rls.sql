create function private.current_auth_email()
returns text
language sql
security invoker
set search_path = ''
stable
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;
revoke all on function private.current_auth_email() from public;
grant execute on function private.current_auth_email() to authenticated;

drop policy arca_invitation_select on public.arca_invitations;
create policy arca_invitation_select on public.arca_invitations
  for select to authenticated
  using (
    (select private.is_arca_admin(church_id))
    or email = (select private.current_auth_email())
  );
