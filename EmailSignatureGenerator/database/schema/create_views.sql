-- sqlfluff: dialect=postgres
set search_path to signature_app, public;

drop view if exists signature_app.v_signatures_detailed;
create view signature_app.v_signatures_detailed as
select
  s.id,
  s.created_at,
  u.name  as user_name,
  u.email as user_email,
  t.name  as template_name,
  s.form_data,
  s.html_code
from signature_app.signatures s
left join signature_app.users u on u.id = s.user_id
left join signature_app.templates t on t.id = s.template_id
order by s.created_at desc;

drop view if exists signature_app.v_templates_stats;
create view signature_app.v_templates_stats as
select
  t.id, t.name, t.created_at,
  coalesce(a.total_signatures,0) as uses,
  a.last_used
from signature_app.templates t
left join signature_app.analytics a on a.template_id = t.id
order by uses desc, t.created_at desc;
