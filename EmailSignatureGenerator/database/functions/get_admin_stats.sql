-- sqlfluff: dialect=postgres
set search_path to signature_app, public;

drop function if exists signature_app.get_admin_stats() cascade;
create or replace function signature_app.get_admin_stats()
returns json
language plpgsql
stable
set search_path = signature_app, public
as $fn$
declare
  out json;
begin
  select json_build_object(
    'total_users', (select count(*) from signature_app.users),
    'total_signatures', (select count(*) from signature_app.signatures),
    'popular_templates', (
       select coalesce(json_agg(t), '[]'::json) from (
         select t.id, t.name, coalesce(a.total_signatures,0) as uses
         from signature_app.templates t
         left join signature_app.analytics a on a.template_id = t.id
         order by uses desc, t.created_at desc
         limit 10
       ) t
    )
  ) into out;
  return out;
end;
$fn$;
