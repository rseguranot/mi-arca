-- RPCs remain SECURITY DEFINER because they create cross-table membership
-- records, but only signed-in callers receive EXECUTE and each function
-- validates auth.uid() before changing state.
revoke all on function public.create_arca(text, text) from anon;
revoke all on function public.create_arca_invitation(uuid, text, public.arca_role) from anon;
revoke all on function public.accept_arca_invitation(uuid) from anon;

drop policy arca_invitation_select on public.arca_invitations;
create policy arca_invitation_select on public.arca_invitations
  for select to authenticated
  using (
    (select private.is_arca_admin(church_id))
    or email = (select lower(coalesce(auth.jwt() ->> 'email', '')))
  );
