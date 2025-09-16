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

ALTER TABLE signature_app.users
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE;









-- Add html column to templates table if it doesn't exist
ALTER TABLE signature_app.templates
ADD COLUMN IF NOT EXISTS html TEXT;

-- Create or replace the add_template function with p_created_by as UUID
CREATE OR REPLACE FUNCTION signature_app.add_template(
  p_name TEXT,
  p_thumbnail TEXT,
  p_tokens JSONB,
  p_html TEXT,
  p_created_by UUID
) RETURNS signature_app.templates AS $$
  INSERT INTO signature_app.templates (name, thumbnail, tokens, html, created_by)
  VALUES (p_name, p_thumbnail, p_tokens, p_html, p_created_by)
  RETURNING *;
$$ LANGUAGE SQL;

-- Create or replace the update_template function (unchanged from previous fix)
CREATE OR REPLACE FUNCTION signature_app.update_template(
  p_id UUID,
  p_name TEXT,
  p_thumbnail TEXT,
  p_tokens JSONB,
  p_html TEXT
) RETURNS signature_app.templates AS $$
  UPDATE signature_app.templates
  SET name = p_name, thumbnail = p_thumbnail, tokens = p_tokens, html = p_html, created_at = NOW()
  WHERE id = p_id
  RETURNING *;
$$ LANGUAGE SQL;

select * from signature_app.templates;

SELECT id, name, thumbnail, tokens, html, created_by, created_at
FROM signature_app.templates;

desc signature_app.templates;

UPDATE signature_app.templates
SET html = '<div style="font-family: {{font}}; color: {{accent}};">{{name}} - {{title}}</div>'
WHERE html IS NULL;


UPDATE signature_app.templates
SET tokens = '["name", "title"]'::jsonb
WHERE tokens->>'font' IS NOT NULL;

ALTER TABLE signature_app.templates
ADD COLUMN IF NOT EXISTS placeholders JSONB;

UPDATE signature_app.templates
SET placeholders = '["name", "title"]'::jsonb
WHERE placeholders IS NULL;

CREATE OR REPLACE FUNCTION signature_app.add_template(
  p_name TEXT,
  p_thumbnail TEXT,
  p_tokens JSONB,
  p_html TEXT,
  p_placeholders JSONB,
  p_created_by UUID
) RETURNS signature_app.templates AS $$
  INSERT INTO signature_app.templates (name, thumbnail, tokens, html, placeholders, created_by)
  VALUES (p_name, p_thumbnail, p_tokens, p_html, p_placeholders, p_created_by)
  RETURNING *;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION signature_app.update_template(
  p_id UUID,
  p_name TEXT,
  p_thumbnail TEXT,
  p_tokens JSONB,
  p_html TEXT,
  p_placeholders JSONB
) RETURNS signature_app.templates AS $$
  UPDATE signature_app.templates
  SET name = p_name, thumbnail = p_thumbnail, tokens = p_tokens, html = p_html, placeholders = p_placeholders, created_at = NOW()
  WHERE id = p_id
  RETURNING *;
$$ LANGUAGE SQL;

ALTER TABLE signature_app.users ADD COLUMN is_active BOOLEAN DEFAULT true;

-- sqlfluff: dialect=postgres
-- EmailSignatureGenerator: Database updates for existing schema
-- Run in pgAdmin4 or psql. Safe to re-run.

SET search_path TO signature_app, public;

-- ====================================
-- Update register_user to include audit logging
-- ====================================
DROP FUNCTION IF EXISTS signature_app.register_user(text, text, text, text) CASCADE;
CREATE OR REPLACE FUNCTION signature_app.register_user(
  p_name TEXT, 
  p_email TEXT, 
  p_hash TEXT, 
  p_role TEXT
)
RETURNS signature_app.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = signature_app, public
AS $$
DECLARE
  u signature_app.users;
BEGIN
  INSERT INTO signature_app.users(name, email, password_hash, role)
  VALUES (p_name, p_email, p_hash, COALESCE(p_role, 'user'))
  RETURNING * INTO u;
  INSERT INTO signature_app.audit_log(action, data)
  VALUES ('USER_REGISTER', jsonb_build_object('user_id', u.id, 'email', u.email));
  RETURN u;
END;
$$;

-- ====================================
-- Update get_admin_stats to include recent activity
-- ====================================
DROP FUNCTION IF EXISTS signature_app.get_admin_stats() CASCADE;
CREATE OR REPLACE FUNCTION signature_app.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SET search_path = signature_app, public
AS $$
DECLARE
  out JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM signature_app.users),
    'total_signatures', (SELECT COUNT(*) FROM signature_app.signatures),
    'popular_templates', (
      SELECT COALESCE(json_agg(t), '[]'::json) FROM (
        SELECT t.id, t.name, COALESCE(a.total_signatures, 0) AS uses
        FROM signature_app.templates t
        LEFT JOIN signature_app.analytics a ON a.template_id = t.id
        ORDER BY COALESCE(a.total_signatures, 0) DESC, t.created_at DESC
        LIMIT 10
      ) t
    ),
    'recent_activity', (
      SELECT COALESCE(json_agg(a), '[]'::json) FROM (
        SELECT
          CASE
            WHEN action = 'SIGNATURE_INSERT' THEN 'User ' || (data->>'user_id')::text || ' created signature'
            WHEN action = 'SIGNATURE_UPDATE' THEN 'User ' || (data->>'user_id')::text || ' updated signature'
            WHEN action = 'SIGNATURE_DELETE' THEN 'User ' || (data->>'user_id')::text || ' deleted signature'
            WHEN action = 'TEMPLATE_ADD' THEN 'Admin ' || (data->>'user_id')::text || ' created template ' || (data->>'name')::text
            WHEN action = 'TEMPLATE_UPDATE' THEN 'Admin ' || (data->>'user_id')::text || ' updated template ' || (data->>'name')::text
            WHEN action = 'TEMPLATE_DELETE' THEN 'Admin ' || (data->>'user_id')::text || ' deleted template ' || (data->>'name')::text
            WHEN action = 'USER_REGISTER' THEN 'User ' || (data->>'email')::text || ' registered'
            WHEN action = 'USER_SUSPEND' THEN 'Admin ' || (data->>'admin_id')::text || ' suspended user ' || (data->>'email')::text
            WHEN action = 'USER_ACTIVATE' THEN 'Admin ' || (data->>'admin_id')::text || ' activated user ' || (data->>'email')::text
            WHEN action = 'USER_DELETE' THEN 'Admin ' || (data->>'admin_id')::text || ' deleted user ' || (data->>'email')::text
          END AS description,
          created_at AS timestamp
        FROM signature_app.audit_log
        WHERE action IN (
          'SIGNATURE_INSERT', 'SIGNATURE_UPDATE', 'SIGNATURE_DELETE',
          'TEMPLATE_ADD', 'TEMPLATE_UPDATE', 'TEMPLATE_DELETE',
          'USER_REGISTER', 'USER_SUSPEND', 'USER_ACTIVATE', 'USER_DELETE'
        )
        ORDER BY created_at DESC
        LIMIT 5
      ) a
    )
  ) INTO out;
  RETURN out;
END;
$$;

-- ====================================
-- Trigger functions for audit logging
-- ====================================

-- Audit signature actions (INSERT, UPDATE, DELETE)
DROP FUNCTION IF EXISTS signature_app.trg_audit_signatures() CASCADE;
CREATE OR REPLACE FUNCTION signature_app.trg_audit_signatures()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = signature_app, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES ('SIGNATURE_INSERT', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES ('SIGNATURE_UPDATE', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES ('SIGNATURE_DELETE', jsonb_build_object('user_id', OLD.user_id, 'signature_id', OLD.id));
  END IF;
  RETURN NEW;
END;
$$;

-- Audit template actions
DROP FUNCTION IF EXISTS signature_app.trg_audit_templates() CASCADE;
CREATE OR REPLACE FUNCTION signature_app.trg_audit_templates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = signature_app, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES ('TEMPLATE_ADD', jsonb_build_object('user_id', NEW.created_by, 'template_id', NEW.id, 'name', NEW.name));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES ('TEMPLATE_UPDATE', jsonb_build_object('user_id', NEW.created_by, 'template_id', NEW.id, 'name', NEW.name));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES ('TEMPLATE_DELETE', jsonb_build_object('user_id', OLD.created_by, 'template_id', OLD.id, 'name', OLD.name));
  END IF;
  RETURN NEW;
END;
$$;

-- Audit user actions
DROP FUNCTION IF EXISTS signature_app.trg_audit_users() CASCADE;
CREATE OR REPLACE FUNCTION signature_app.trg_audit_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = signature_app, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES (
      CASE WHEN NEW.is_active THEN 'USER_ACTIVATE' ELSE 'USER_SUSPEND' END,
      jsonb_build_object('admin_id', NULL, 'user_id', NEW.id, 'email', NEW.email)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES ('USER_DELETE', jsonb_build_object('admin_id', NULL, 'user_id', OLD.id, 'email', OLD.email));
  END IF;
  RETURN NEW;
END;
$$;

-- ====================================
-- Update triggers
-- ====================================
DROP TRIGGER IF EXISTS audit_signature_insert ON signature_app.signatures;
CREATE TRIGGER audit_signature_actions
AFTER INSERT OR UPDATE OR DELETE ON signature_app.signatures
FOR EACH ROW EXECUTE FUNCTION signature_app.trg_audit_signatures();

DROP TRIGGER IF EXISTS audit_template_actions ON signature_app.templates;
CREATE TRIGGER audit_template_actions
AFTER INSERT OR UPDATE OR DELETE ON signature_app.templates
FOR EACH ROW EXECUTE FUNCTION signature_app.trg_audit_templates();

DROP TRIGGER IF EXISTS audit_user_actions ON signature_app.users;
CREATE TRIGGER audit_user_actions
AFTER UPDATE OR DELETE ON signature_app.users
FOR EACH ROW EXECUTE FUNCTION signature_app.trg_audit_users();

-- ====================================
-- Add indexes for performance
-- ====================================
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON signature_app.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON signature_app.audit_log(created_at);
-- sqlfluff: dialect=postgres
-- EmailSignatureGenerator: Fix for a.total_signatures error and admin mode audit logging
-- Run in pgAdmin4 or psql. Safe to re-run.

SET search_path TO signature_app, public;

-- ====================================
-- Update get_admin_stats to ensure proper aggregation
-- ====================================
DROP FUNCTION IF EXISTS signature_app.get_admin_stats() CASCADE;
CREATE OR REPLACE FUNCTION signature_app.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SET search_path = signature_app, public
AS $$
DECLARE
  out JSON;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM signature_app.users),
    'total_signatures', (SELECT COUNT(*) FROM signature_app.signatures),
    'popular_templates', (
      SELECT COALESCE(json_agg(t), '[]'::json) FROM (
        SELECT t.id, t.name, COALESCE(a.total_signatures, 0) AS uses
        FROM signature_app.templates t
        LEFT JOIN signature_app.analytics a ON a.template_id = t.id
        ORDER BY COALESCE(a.total_signatures, 0) DESC, t.created_at DESC
        LIMIT 10
      ) t
    ),
    'recent_activity', (
      SELECT COALESCE(json_agg(a), '[]'::json) FROM (
        SELECT
          CASE
            WHEN action = 'SIGNATURE_INSERT' THEN 'User ' || (data->>'user_id')::text || ' created signature'
            WHEN action = 'SIGNATURE_UPDATE' THEN 'User ' || (data->>'user_id')::text || ' updated signature'
            WHEN action = 'SIGNATURE_DELETE' THEN 'User ' || (data->>'user_id')::text || ' deleted signature'
            WHEN action = 'TEMPLATE_ADD' THEN 'Admin ' || (data->>'user_id')::text || ' created template ' || (data->>'name')::text
            WHEN action = 'TEMPLATE_UPDATE' THEN 'Admin ' || (data->>'user_id')::text || ' updated template ' || (data->>'name')::text
            WHEN action = 'TEMPLATE_DELETE' THEN 'Admin ' || (data->>'user_id')::text || ' deleted template ' || (data->>'name')::text
            WHEN action = 'USER_REGISTER' THEN 'User ' || (data->>'email')::text || ' registered'
            WHEN action = 'USER_SUSPEND' THEN 'Admin ' || (data->>'admin_id')::text || ' suspended user ' || (data->>'email')::text
            WHEN action = 'USER_ACTIVATE' THEN 'Admin ' || (data->>'admin_id')::text || ' activated user ' || (data->>'email')::text
            WHEN action = 'USER_DELETE' THEN 'Admin ' || (data->>'admin_id')::text || ' deleted user ' || (data->>'email')::text
            WHEN action = 'ADMIN_MODE_SWITCH' THEN 'User ' || (data->>'user_id')::text || ' switched to admin mode'
          END AS description,
          created_at AS timestamp
        FROM signature_app.audit_log
        WHERE action IN (
          'SIGNATURE_INSERT', 'SIGNATURE_UPDATE', 'SIGNATURE_DELETE',
          'TEMPLATE_ADD', 'TEMPLATE_UPDATE', 'TEMPLATE_DELETE',
          'USER_REGISTER', 'USER_SUSPEND', 'USER_ACTIVATE', 'USER_DELETE',
          'ADMIN_MODE_SWITCH'
        )
        ORDER BY created_at DESC
        LIMIT 5
      ) a
    )
  ) INTO out;
  RETURN out;
END;
$$;

-- ====================================
-- Update register_user to include audit logging
-- ====================================
DROP FUNCTION IF EXISTS signature_app.register_user(text, text, text, text) CASCADE;
CREATE OR REPLACE FUNCTION signature_app.register_user(
  p_name TEXT, 
  p_email TEXT, 
  p_hash TEXT, 
  p_role TEXT
)
RETURNS signature_app.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = signature_app, public
AS $$
DECLARE
  u signature_app.users;
BEGIN
  INSERT INTO signature_app.users(name, email, password_hash, role, is_active)
  VALUES (p_name, p_email, p_hash, COALESCE(p_role, 'user'), true)
  RETURNING * INTO u;
  INSERT INTO signature_app.audit_log(action, data)
  VALUES ('USER_REGISTER', jsonb_build_object('user_id', u.id, 'email', u.email));
  RETURN u;
END;
$$;

-- ====================================
-- Add function to log admin mode switch
-- ====================================
DROP FUNCTION IF EXISTS signature_app.log_admin_mode_switch(uuid) CASCADE;
CREATE OR REPLACE FUNCTION signature_app.log_admin_mode_switch(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = signature_app, public
AS $$
BEGIN
  INSERT INTO signature_app.audit_log(action, data)
  VALUES ('ADMIN_MODE_SWITCH', jsonb_build_object('user_id', p_user_id));
END;
$$;

-- ====================================
-- Update trigger functions for audit logging
-- ====================================

-- Audit signature actions (INSERT, UPDATE, DELETE)
DROP FUNCTION IF EXISTS signature_app.trg_audit_signatures() CASCADE;
CREATE OR REPLACE FUNCTION signature_app.trg_audit_signatures()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = signature_app, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES ('SIGNATURE_INSERT', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES ('SIGNATURE_UPDATE', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES ('SIGNATURE_DELETE', jsonb_build_object('user_id', OLD.user_id, 'signature_id', OLD.id));
  END IF;
  RETURN NEW;
END;
$$;

-- Audit template actions
DROP FUNCTION IF EXISTS signature_app.trg_audit_templates() CASCADE;
CREATE OR REPLACE FUNCTION signature_app.trg_audit_templates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = signature_app, public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES ('TEMPLATE_ADD', jsonb_build_object('user_id', NEW.created_by, 'template_id', NEW.id, 'name', NEW.name));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES ('TEMPLATE_UPDATE', jsonb_build_object('user_id', NEW.created_by, 'template_id', NEW.id, 'name', NEW.name));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES ('TEMPLATE_DELETE', jsonb_build_object('user_id', OLD.created_by, 'template_id', OLD.id, 'name', OLD.name));
  END IF;
  RETURN NEW;
END;
$$;

-- Audit user actions
DROP FUNCTION IF EXISTS signature_app.trg_audit_users() CASCADE;
CREATE OR REPLACE FUNCTION signature_app.trg_audit_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = signature_app, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES (
      CASE WHEN NEW.is_active THEN 'USER_ACTIVATE' ELSE 'USER_SUSPEND' END,
      jsonb_build_object('admin_id', NULL, 'user_id', NEW.id, 'email', NEW.email)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES ('USER_DELETE', jsonb_build_object('admin_id', NULL, 'user_id', OLD.id, 'email', OLD.email));
  END IF;
  RETURN NEW;
END;
$$;

-- ====================================
-- Update triggers
-- ====================================
DROP TRIGGER IF EXISTS audit_signature_insert ON signature_app.signatures;
CREATE TRIGGER audit_signature_actions
AFTER INSERT OR UPDATE OR DELETE ON signature_app.signatures
FOR EACH ROW EXECUTE FUNCTION signature_app.trg_audit_signatures();

DROP TRIGGER IF EXISTS audit_template_actions ON signature_app.templates;
CREATE TRIGGER audit_template_actions
AFTER INSERT OR UPDATE OR DELETE ON signature_app.templates
FOR EACH ROW EXECUTE FUNCTION signature_app.trg_audit_templates();

DROP TRIGGER IF EXISTS audit_user_actions ON signature_app.users;
CREATE TRIGGER audit_user_actions
AFTER UPDATE OR DELETE ON signature_app.users
FOR EACH ROW EXECUTE FUNCTION signature_app.trg_audit_users();

-- ====================================
-- Add indexes for performance
-- ====================================
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON signature_app.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON signature_app.audit_log(created_at);
-- sqlfluff: dialect=postgres
-- EmailSignatureGenerator: Fix user suspension audit logging
-- Run in pgAdmin4 or psql. Safe to re-run.

SET search_path TO signature_app, public;

-- Update audit user trigger to accept admin_id from backend
DROP FUNCTION IF EXISTS signature_app.trg_audit_users() CASCADE;
CREATE OR REPLACE FUNCTION signature_app.trg_audit_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = signature_app, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES (
      CASE WHEN NEW.is_active THEN 'USER_ACTIVATE' ELSE 'USER_SUSPEND' END,
      jsonb_build_object(
        'admin_id', current_setting('app.current_user_id', true)::uuid,
        'user_id', NEW.id,
        'email', NEW.email
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES (
      'USER_DELETE',
      jsonb_build_object(
        'admin_id', current_setting('app.current_user_id', true)::uuid,
        'user_id', OLD.id,
        'email', OLD.email
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_user_actions ON signature_app.users;
CREATE TRIGGER audit_user_actions
AFTER UPDATE OR DELETE ON signature_app.users
FOR EACH ROW EXECUTE FUNCTION signature_app.trg_audit_users();

-- sqlfluff: dialect=postgres
-- EmailSignatureGenerator: Add token blacklist table
-- Run in pgAdmin4 or psql. Safe to re-run.

SET search_path TO signature_app, public;

CREATE TABLE IF NOT EXISTS signature_app.token_blacklist (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES signature_app.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_user_id ON signature_app.token_blacklist(user_id);

-- sqlfluff: dialect=postgres
-- EmailSignatureGenerator: Enhance token management
-- Run in pgAdmin4 or psql. Safe to re-run.

SET search_path TO signature_app, public;

-- Add column to store current token in users table
ALTER TABLE signature_app.users
ADD COLUMN IF NOT EXISTS current_token TEXT;

-- sqlfluff: dialect=postgres
-- EmailSignatureGenerator: Enhance token management
-- Run in pgAdmin4 or psql. Safe to re-run.

SET search_path TO signature_app, public;

-- Add column to store current token in users table
ALTER TABLE signature_app.users
ADD COLUMN IF NOT EXISTS current_token TEXT;

-- sqlfluff: dialect=postgres
-- EmailSignatureGenerator: Enhance token management
-- Run in pgAdmin4 or psql. Safe to re-run.

SET search_path TO signature_app, public;

-- Add column to store current token in users table
ALTER TABLE signature_app.users
ADD COLUMN IF NOT EXISTS current_token TEXT;

-- sqlfluff: dialect=postgres
-- EmailSignatureGenerator: Enhance token management
-- Run in pgAdmin4 or psql. Safe to re-run.

SET search_path TO signature_app, public;

-- Add column to store current token in users table
ALTER TABLE signature_app.users
ADD COLUMN IF NOT EXISTS current_token TEXT;


-- sqlfluff: dialect=postgres
-- EmailSignatureGenerator: Fix audit user trigger for NULL admin_id
-- Run in pgAdmin4 or psql. Safe to re-run.

SET search_path TO signature_app, public;

DROP FUNCTION IF EXISTS signature_app.trg_audit_users() CASCADE;
CREATE OR REPLACE FUNCTION signature_app.trg_audit_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = signature_app, public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES (
      CASE WHEN NEW.is_active THEN 'USER_ACTIVATE' ELSE 'USER_SUSPEND' END,
      jsonb_build_object(
        'admin_id', NULLIF(current_setting('app.current_user_id', true), '')::uuid,
        'user_id', NEW.id,
        'email', NEW.email
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES (
      'USER_DELETE',
      jsonb_build_object(
        'admin_id', NULLIF(current_setting('app.current_user_id', true), '')::uuid,
        'user_id', OLD.id,
        'email', OLD.email
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_user_actions ON signature_app.users;
CREATE TRIGGER audit_user_actions
AFTER UPDATE OR DELETE ON signature_app.users
FOR EACH ROW EXECUTE FUNCTION signature_app.trg_audit_users();