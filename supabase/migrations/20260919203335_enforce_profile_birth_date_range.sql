-- The UI constrains the picker, and this trigger keeps the same rule true for
-- every registration path that writes profile data through Auth metadata.
create or replace function private.validate_profile_birth_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birth_date < (current_date - interval '120 years')::date
     or new.birth_date > (current_date - interval '12 years')::date then
    raise exception 'La fecha de nacimiento debe corresponder a una edad entre 12 y 120 años'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists profile_birth_date_range on public.profiles;
create trigger profile_birth_date_range
before insert or update of birth_date on public.profiles
for each row execute function private.validate_profile_birth_date();
revoke all on function private.validate_profile_birth_date() from public;
