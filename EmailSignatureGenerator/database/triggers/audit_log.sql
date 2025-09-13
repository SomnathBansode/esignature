-- sqlfluff: dialect=postgres
set search_path to signature_app, public;

drop function if exists signature_app.trg_audit_signatures() cascade;
create or replace function signature_app.trg_audit_signatures()
returns trigger
language plpgsql
set search_path = signature_app, public
as $fn$
begin
  insert into signature_app.audit_log(action, data)
  values ('SIGNATURE_INSERT', to_jsonb(new));
  return new;
end;
$fn$;

drop trigger if exists audit_signature_insert on signature_app.signatures;
create trigger audit_signature_insert
after insert on signature_app.signatures
for each row execute function signature_app.trg_audit_signatures();
