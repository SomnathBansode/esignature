-- sqlfluff: dialect=postgres
set search_path to signature_app, public;

drop function if exists signature_app.register_user(text, text, text, text) cascade;
create or replace function signature_app.register_user(
  p_name text, p_email text, p_hash text, p_role text
)
returns signature_app.users
language plpgsql
security definer
set search_path = signature_app, public
as $fn$
declare
  u signature_app.users;
begin
  insert into signature_app.users(name,email,password_hash,role)
  values (p_name,p_email,p_hash,coalesce(p_role,'user'))
  returning * into u;
  return u;
end;
$fn$;
