-- sqlfluff: dialect=postgres
set search_path to signature_app, public;

drop function if exists signature_app.trg_update_analytics() cascade;
create or replace function signature_app.trg_update_analytics()
returns trigger
language plpgsql
set search_path = signature_app, public
as $fn$
begin
  if new.template_id is not null then
    insert into signature_app.analytics(template_id, total_signatures, last_used)
    values (new.template_id, 1, now())
    on conflict (template_id) do update
      set total_signatures = signature_app.analytics.total_signatures + 1,
          last_used = now();
  end if;
  return new;
end;
$fn$;

drop trigger if exists after_signature_insert on signature_app.signatures;
create trigger after_signature_insert
after insert on signature_app.signatures
for each row execute function signature_app.trg_update_analytics();
