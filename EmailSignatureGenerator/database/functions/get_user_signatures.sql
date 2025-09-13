-- sqlfluff: dialect=postgres
set search_path to signature_app, public;

drop function if exists signature_app.get_user_signatures(uuid) cascade;
create or replace function signature_app.get_user_signatures(p_user_id uuid)
returns setof signature_app.signatures
language plpgsql
stable
set search_path = signature_app, public
as $fn$
begin
  return query
  select * from signature_app.signatures
  where user_id = p_user_id
  order by created_at desc;
end;
$fn$;
