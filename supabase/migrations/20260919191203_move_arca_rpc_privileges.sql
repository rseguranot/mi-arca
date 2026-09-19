-- Keep privileged implementations out of the exposed API schema. Public RPC
-- wrappers run as the caller and delegate only after PostgreSQL verifies that
-- the caller is authenticated.
alter function public.create_arca(text, text) set schema private;
alter function public.create_arca_invitation(uuid, text, public.arca_role) set schema private;
alter function public.accept_arca_invitation(uuid) set schema private;

revoke all on function private.create_arca(text, text) from public;
revoke all on function private.create_arca_invitation(uuid, text, public.arca_role) from public;
revoke all on function private.accept_arca_invitation(uuid) from public;
grant execute on function private.create_arca(text, text) to authenticated;
grant execute on function private.create_arca_invitation(uuid, text, public.arca_role) to authenticated;
grant execute on function private.accept_arca_invitation(uuid) to authenticated;

create function public.create_arca(arca_name text, arca_city text default null)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.create_arca(arca_name, arca_city) $$;
revoke all on function public.create_arca(text, text) from public, anon;
grant execute on function public.create_arca(text, text) to authenticated;

create function public.create_arca_invitation(target_church_id uuid, invitee_email text, invited_role public.arca_role default 'educator')
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.create_arca_invitation(target_church_id, invitee_email, invited_role) $$;
revoke all on function public.create_arca_invitation(uuid, text, public.arca_role) from public, anon;
grant execute on function public.create_arca_invitation(uuid, text, public.arca_role) to authenticated;

create function public.accept_arca_invitation(invitation_token uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.accept_arca_invitation(invitation_token) $$;
revoke all on function public.accept_arca_invitation(uuid) from public, anon;
grant execute on function public.accept_arca_invitation(uuid) to authenticated;
