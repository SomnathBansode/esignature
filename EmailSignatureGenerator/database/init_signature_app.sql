-- sqlfluff: dialect=postgres
-- EmailSignatureGenerator: consolidated database setup
-- Run this whole script in pgAdmin4 (or psql). Safe to re-run.

-- ====================================
-- Schema & Extensions
-- ====================================
create schema if not exists signature_app;
set search_path to signature_app, public;

-- UUID generation (for gen_random_uuid)
create extension if not exists pgcrypto;

-- ====================================
-- Tables
-- ====================================
create table if not exists signature_app.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password_hash text not null,
  role text not null default 'user', -- 'user' | 'admin'
  created_at timestamptz not null default now()
);

create table if not exists signature_app.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  thumbnail text,
  tokens jsonb not null default '{}'::jsonb, -- template metadata/fields
  created_by uuid references signature_app.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists signature_app.signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references signature_app.users(id) on delete cascade,
  template_id uuid references signature_app.templates(id) on delete set null,
  form_data jsonb not null, -- user inputs
  html_code text not null,  -- saved HTML
  created_at timestamptz not null default now()
);

create table if not exists signature_app.analytics (
  id serial primary key,
  template_id uuid unique references signature_app.templates(id) on delete cascade,
  total_signatures int not null default 0,
  last_used timestamptz
);

create table if not exists signature_app.audit_log (
  id bigserial primary key,
  action text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- ====================================
-- Views (optional but handy)
-- ====================================
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

-- ====================================
-- Functions
-- ====================================

-- Register user
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

-- Create signature (insert only; analytics & audit handled by triggers)
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
  return s;
end;
$fn$;

-- Get all signatures for a user
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

-- Admin stats summary
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

-- ====================================
-- Trigger functions
-- ====================================

-- After insert on signatures -> bump analytics
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

-- After insert on signatures -> audit row
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

-- ====================================
-- Triggers
-- ====================================
drop trigger if exists after_signature_insert on signature_app.signatures;
create trigger after_signature_insert
after insert on signature_app.signatures
for each row execute function signature_app.trg_update_analytics();

drop trigger if exists audit_signature_insert on signature_app.signatures;
create trigger audit_signature_insert
after insert on signature_app.signatures
for each row execute function signature_app.trg_audit_signatures();

-- ====================================
-- Optional: seed an admin user (password hash required)
-- Replace <bcrypt-hash> with a real hash from your Node app (bcrypt.hash(...,10))
-- insert into signature_app.users(name,email,password_hash,role)
-- values ('Admin','admin@local','<bcrypt-hash>','admin');
-- =========================
-- Template CRUD functions (match backend/controllers/templateController.js)
-- =========================
set search_path to signature_app, public;

-- ADD
drop function if exists signature_app.add_template(text, text, jsonb, uuid) cascade;
create or replace function signature_app.add_template(
  p_name text,
  p_thumbnail text,
  p_tokens jsonb,
  p_created_by uuid
)
returns signature_app.templates
language plpgsql
security definer
set search_path = signature_app, public
as $fn$
declare
  t signature_app.templates;
begin
  insert into signature_app.templates(name, thumbnail, tokens, created_by)
  values (p_name, p_thumbnail, coalesce(p_tokens, '{}'::jsonb), p_created_by)
  returning * into t;
  return t;
end;
$fn$;

-- UPDATE
drop function if exists signature_app.update_template(uuid, text, text, jsonb) cascade;
create or replace function signature_app.update_template(
  p_id uuid,
  p_name text,
  p_thumbnail text,
  p_tokens jsonb
)
returns signature_app.templates
language plpgsql
security definer
set search_path = signature_app, public
as $fn$
declare
  t signature_app.templates;
begin
  update signature_app.templates
     set name      = coalesce(p_name, name),
         thumbnail = coalesce(p_thumbnail, thumbnail),
         tokens    = coalesce(p_tokens, tokens)
   where id = p_id
  returning * into t;

  if not found then
    raise exception 'Template not found for id=%', p_id;
  end if;

  return t;
end;
$fn$;

-- DELETE
drop function if exists signature_app.delete_template(uuid) cascade;
create or replace function signature_app.delete_template(p_id uuid)
returns void
language plpgsql
security definer
set search_path = signature_app, public
as $fn$
begin
  delete from signature_app.templates where id = p_id;
  -- analytics row (if any) cascades due to FK on analytics.template_id
  if not found then
    raise exception 'Template not found for id=%', p_id;
  end if;
end;
$fn$;

-- (Optional but recommended) Helpful indexes
create index if not exists idx_signatures_user_id     on signature_app.signatures(user_id);
create index if not exists idx_signatures_template_id on signature_app.signatures(template_id);
create index if not exists idx_templates_created_at   on signature_app.templates(created_at);
-- Function to update signature
drop function if exists signature_app.update_signature(uuid, uuid, jsonb, text) cascade;
create or replace function signature_app.update_signature(
  p_id uuid, p_user_id uuid, p_form jsonb, p_html text
)
returns signature_app.signatures
language plpgsql
security definer
set search_path = signature_app, public
as $fn$
declare
  s signature_app.signatures;
begin
  update signature_app.signatures
     set form_data = coalesce(p_form, form_data),
         html_code = coalesce(p_html, html_code)
   where id = p_id and user_id = p_user_id
  returning * into s;

  if not found then
    raise exception 'Signature not found or you do not own it for id=%', p_id;
  end if;

  return s;
end;
$fn$;

-- Function to delete signature
drop function if exists signature_app.delete_signature(uuid) cascade;
create or replace function signature_app.delete_signature(p_id uuid)
returns void
language plpgsql
security definer
set search_path = signature_app, public
as $fn$
begin
  delete from signature_app.signatures where id = p_id;
  if not found then
    raise exception 'Signature not found for id=%', p_id;
  end if;
end;
$fn$;
ALTER TABLE signature_app.users
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expiration BIGINT;