-- sqlfluff: dialect=postgres
set search_path to signature_app, public;

drop function if exists signature_app.create_signature(uuid, uuid, jsonb, text) cascade;
create or replace function signature_app.create_signature(
  p_user_id uuid, p_template_id uuid, p_form jsonb, p_html text
)
returns signature_app.signatures
language plpgsql
security definer
set search_path = signature_app, public
as $fn$
declare
  s signature_app.signatures;
begin
  insert into signature_app.signatures(user_id, template_id, form_data, html_code)
  values (p_user_id, p_template_id, p_form, p_html)
  returning * into s;

  -- Analytics & audit handled by triggers.
  return s;
end;
$fn$;
