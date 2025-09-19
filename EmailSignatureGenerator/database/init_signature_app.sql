-- -- sqlfluff: dialect=postgres
-- -- EmailSignatureGenerator: consolidated database setup
-- -- Run this whole script in pgAdmin4 (or psql). Safe to re-run.

-- -- ====================================
-- -- Schema & Extensions
-- -- ====================================
-- create schema if not exists signature_app;
-- set search_path to signature_app, public;

-- -- UUID generation (for gen_random_uuid)
-- create extension if not exists pgcrypto;

-- -- ====================================
-- -- Tables
-- -- ====================================
-- create table if not exists signature_app.users (
--   id uuid primary key default gen_random_uuid(),
--   name text not null,
--   email text unique not null,
--   password_hash text not null,
--   role text not null default 'user', -- 'user' | 'admin'
--   created_at timestamptz not null default now()
-- );

-- create table if not exists signature_app.templates (
--   id uuid primary key default gen_random_uuid(),
--   name text not null,
--   thumbnail text,
--   tokens jsonb not null default '{}'::jsonb, -- template metadata/fields
--   created_by uuid references signature_app.users(id) on delete set null,
--   created_at timestamptz not null default now()
-- );

-- create table if not exists signature_app.signatures (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid not null references signature_app.users(id) on delete cascade,
--   template_id uuid references signature_app.templates(id) on delete set null,
--   form_data jsonb not null, -- user inputs
--   html_code text not null,  -- saved HTML
--   created_at timestamptz not null default now()
-- );

-- create table if not exists signature_app.analytics (
--   id serial primary key,
--   template_id uuid unique references signature_app.templates(id) on delete cascade,
--   total_signatures int not null default 0,
--   last_used timestamptz
-- );

-- create table if not exists signature_app.audit_log (
--   id bigserial primary key,
--   action text not null,
--   data jsonb not null,
--   created_at timestamptz not null default now()
-- );

-- -- ====================================
-- -- Views (optional but handy)
-- -- ====================================
-- drop view if exists signature_app.v_signatures_detailed;
-- create view signature_app.v_signatures_detailed as
-- select
--   s.id,
--   s.created_at,
--   u.name  as user_name,
--   u.email as user_email,
--   t.name  as template_name,
--   s.form_data,
--   s.html_code
-- from signature_app.signatures s
-- left join signature_app.users u on u.id = s.user_id
-- left join signature_app.templates t on t.id = s.template_id
-- order by s.created_at desc;

-- drop view if exists signature_app.v_templates_stats;
-- create view signature_app.v_templates_stats as
-- select
--   t.id, t.name, t.created_at,
--   coalesce(a.total_signatures,0) as uses,
--   a.last_used
-- from signature_app.templates t
-- left join signature_app.analytics a on a.template_id = t.id
-- order by uses desc, t.created_at desc;

-- -- ====================================
-- -- Functions
-- -- ====================================

-- -- Register user
-- drop function if exists signature_app.register_user(text, text, text, text) cascade;
-- create or replace function signature_app.register_user(
--   p_name text, p_email text, p_hash text, p_role text
-- )
-- returns signature_app.users
-- language plpgsql
-- security definer
-- set search_path = signature_app, public
-- as $fn$
-- declare
--   u signature_app.users;
-- begin
--   insert into signature_app.users(name,email,password_hash,role)
--   values (p_name,p_email,p_hash,coalesce(p_role,'user'))
--   returning * into u;
--   return u;
-- end;
-- $fn$;

-- -- Create signature (insert only; analytics & audit handled by triggers)
-- drop function if exists signature_app.create_signature(uuid, uuid, jsonb, text) cascade;
-- create or replace function signature_app.create_signature(
--   p_user_id uuid, p_template_id uuid, p_form jsonb, p_html text
-- )
-- returns signature_app.signatures
-- language plpgsql
-- security definer
-- set search_path = signature_app, public
-- as $fn$
-- declare
--   s signature_app.signatures;
-- begin
--   insert into signature_app.signatures(user_id, template_id, form_data, html_code)
--   values (p_user_id, p_template_id, p_form, p_html)
--   returning * into s;
--   return s;
-- end;
-- $fn$;

-- -- Get all signatures for a user
-- drop function if exists signature_app.get_user_signatures(uuid) cascade;
-- create or replace function signature_app.get_user_signatures(p_user_id uuid)
-- returns setof signature_app.signatures
-- language plpgsql
-- stable
-- set search_path = signature_app, public
-- as $fn$
-- begin
--   return query
--   select * from signature_app.signatures
--   where user_id = p_user_id
--   order by created_at desc;
-- end;
-- $fn$;

-- -- Admin stats summary
-- drop function if exists signature_app.get_admin_stats() cascade;
-- create or replace function signature_app.get_admin_stats()
-- returns json
-- language plpgsql
-- stable
-- set search_path = signature_app, public
-- as $fn$
-- declare
--   out json;
-- begin
--   select json_build_object(
--     'total_users', (select count(*) from signature_app.users),
--     'total_signatures', (select count(*) from signature_app.signatures),
--     'popular_templates', (
--        select coalesce(json_agg(t), '[]'::json) from (
--          select t.id, t.name, coalesce(a.total_signatures,0) as uses
--          from signature_app.templates t
--          left join signature_app.analytics a on a.template_id = t.id
--          order by uses desc, t.created_at desc
--          limit 10
--        ) t
--     )
--   ) into out;
--   return out;
-- end;
-- $fn$;

-- -- ====================================
-- -- Trigger functions
-- -- ====================================

-- -- After insert on signatures -> bump analytics
-- drop function if exists signature_app.trg_update_analytics() cascade;
-- create or replace function signature_app.trg_update_analytics()
-- returns trigger
-- language plpgsql
-- set search_path = signature_app, public
-- as $fn$
-- begin
--   if new.template_id is not null then
--     insert into signature_app.analytics(template_id, total_signatures, last_used)
--     values (new.template_id, 1, now())
--     on conflict (template_id) do update
--       set total_signatures = signature_app.analytics.total_signatures + 1,
--           last_used = now();
--   end if;
--   return new;
-- end;
-- $fn$;

-- -- After insert on signatures -> audit row
-- drop function if exists signature_app.trg_audit_signatures() cascade;
-- create or replace function signature_app.trg_audit_signatures()
-- returns trigger
-- language plpgsql
-- set search_path = signature_app, public
-- as $fn$
-- begin
--   insert into signature_app.audit_log(action, data)
--   values ('SIGNATURE_INSERT', to_jsonb(new));
--   return new;
-- end;
-- $fn$;

-- -- ====================================
-- -- Triggers
-- -- ====================================
-- drop trigger if exists after_signature_insert on signature_app.signatures;
-- create trigger after_signature_insert
-- after insert on signature_app.signatures
-- for each row execute function signature_app.trg_update_analytics();

-- drop trigger if exists audit_signature_insert on signature_app.signatures;
-- create trigger audit_signature_insert
-- after insert on signature_app.signatures
-- for each row execute function signature_app.trg_audit_signatures();

-- -- ====================================
-- -- Optional: seed an admin user (password hash required)
-- -- Replace <bcrypt-hash> with a real hash from your Node app (bcrypt.hash(...,10))
-- -- insert into signature_app.users(name,email,password_hash,role)
-- -- values ('Admin','admin@local','<bcrypt-hash>','admin');
-- -- =========================
-- -- Template CRUD functions (match backend/controllers/templateController.js)
-- -- =========================
-- set search_path to signature_app, public;

-- -- ADD
-- drop function if exists signature_app.add_template(text, text, jsonb, uuid) cascade;
-- create or replace function signature_app.add_template(
--   p_name text,
--   p_thumbnail text,
--   p_tokens jsonb,
--   p_created_by uuid
-- )
-- returns signature_app.templates
-- language plpgsql
-- security definer
-- set search_path = signature_app, public
-- as $fn$
-- declare
--   t signature_app.templates;
-- begin
--   insert into signature_app.templates(name, thumbnail, tokens, created_by)
--   values (p_name, p_thumbnail, coalesce(p_tokens, '{}'::jsonb), p_created_by)
--   returning * into t;
--   return t;
-- end;
-- $fn$;

-- -- UPDATE
-- drop function if exists signature_app.update_template(uuid, text, text, jsonb) cascade;
-- create or replace function signature_app.update_template(
--   p_id uuid,
--   p_name text,
--   p_thumbnail text,
--   p_tokens jsonb
-- )
-- returns signature_app.templates
-- language plpgsql
-- security definer
-- set search_path = signature_app, public
-- as $fn$
-- declare
--   t signature_app.templates;
-- begin
--   update signature_app.templates
--      set name      = coalesce(p_name, name),
--          thumbnail = coalesce(p_thumbnail, thumbnail),
--          tokens    = coalesce(p_tokens, tokens)
--    where id = p_id
--   returning * into t;

--   if not found then
--     raise exception 'Template not found for id=%', p_id;
--   end if;

--   return t;
-- end;
-- $fn$;

-- -- DELETE
-- drop function if exists signature_app.delete_template(uuid) cascade;
-- create or replace function signature_app.delete_template(p_id uuid)
-- returns void
-- language plpgsql
-- security definer
-- set search_path = signature_app, public
-- as $fn$
-- begin
--   delete from signature_app.templates where id = p_id;
--   -- analytics row (if any) cascades due to FK on analytics.template_id
--   if not found then
--     raise exception 'Template not found for id=%', p_id;
--   end if;
-- end;
-- $fn$;

-- -- (Optional but recommended) Helpful indexes
-- create index if not exists idx_signatures_user_id     on signature_app.signatures(user_id);
-- create index if not exists idx_signatures_template_id on signature_app.signatures(template_id);
-- create index if not exists idx_templates_created_at   on signature_app.templates(created_at);
-- -- Function to update signature
-- drop function if exists signature_app.update_signature(uuid, uuid, jsonb, text) cascade;
-- create or replace function signature_app.update_signature(
--   p_id uuid, p_user_id uuid, p_form jsonb, p_html text
-- )
-- returns signature_app.signatures
-- language plpgsql
-- security definer
-- set search_path = signature_app, public
-- as $fn$
-- declare
--   s signature_app.signatures;
-- begin
--   update signature_app.signatures
--      set form_data = coalesce(p_form, form_data),
--          html_code = coalesce(p_html, html_code)
--    where id = p_id and user_id = p_user_id
--   returning * into s;

--   if not found then
--     raise exception 'Signature not found or you do not own it for id=%', p_id;
--   end if;

--   return s;
-- end;
-- $fn$;

-- -- Function to delete signature
-- drop function if exists signature_app.delete_signature(uuid) cascade;
-- create or replace function signature_app.delete_signature(p_id uuid)
-- returns void
-- language plpgsql
-- security definer
-- set search_path = signature_app, public
-- as $fn$
-- begin
--   delete from signature_app.signatures where id = p_id;
--   if not found then
--     raise exception 'Signature not found for id=%', p_id;
--   end if;
-- end;
-- $fn$;
-- ALTER TABLE signature_app.users
-- ADD COLUMN IF NOT EXISTS reset_token TEXT,
-- ADD COLUMN IF NOT EXISTS reset_token_expiration BIGINT;

-- ALTER TABLE signature_app.users
-- ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE;









-- -- Add html column to templates table if it doesn't exist
-- ALTER TABLE signature_app.templates
-- ADD COLUMN IF NOT EXISTS html TEXT;

-- -- Create or replace the add_template function with p_created_by as UUID
-- CREATE OR REPLACE FUNCTION signature_app.add_template(
--   p_name TEXT,
--   p_thumbnail TEXT,
--   p_tokens JSONB,
--   p_html TEXT,
--   p_created_by UUID
-- ) RETURNS signature_app.templates AS $$
--   INSERT INTO signature_app.templates (name, thumbnail, tokens, html, created_by)
--   VALUES (p_name, p_thumbnail, p_tokens, p_html, p_created_by)
--   RETURNING *;
-- $$ LANGUAGE SQL;

-- -- Create or replace the update_template function (unchanged from previous fix)
-- CREATE OR REPLACE FUNCTION signature_app.update_template(
--   p_id UUID,
--   p_name TEXT,
--   p_thumbnail TEXT,
--   p_tokens JSONB,
--   p_html TEXT
-- ) RETURNS signature_app.templates AS $$
--   UPDATE signature_app.templates
--   SET name = p_name, thumbnail = p_thumbnail, tokens = p_tokens, html = p_html, created_at = NOW()
--   WHERE id = p_id
--   RETURNING *;
-- $$ LANGUAGE SQL;

-- select * from signature_app.templates;

-- SELECT id, name, thumbnail, tokens, html, created_by, created_at
-- FROM signature_app.templates;

-- desc signature_app.templates;

-- UPDATE signature_app.templates
-- SET html = '<div style="font-family: {{font}}; color: {{accent}};">{{name}} - {{title}}</div>'
-- WHERE html IS NULL;


-- UPDATE signature_app.templates
-- SET tokens = '["name", "title"]'::jsonb
-- WHERE tokens->>'font' IS NOT NULL;

-- ALTER TABLE signature_app.templates
-- ADD COLUMN IF NOT EXISTS placeholders JSONB;

-- UPDATE signature_app.templates
-- SET placeholders = '["name", "title"]'::jsonb
-- WHERE placeholders IS NULL;

-- CREATE OR REPLACE FUNCTION signature_app.add_template(
--   p_name TEXT,
--   p_thumbnail TEXT,
--   p_tokens JSONB,
--   p_html TEXT,
--   p_placeholders JSONB,
--   p_created_by UUID
-- ) RETURNS signature_app.templates AS $$
--   INSERT INTO signature_app.templates (name, thumbnail, tokens, html, placeholders, created_by)
--   VALUES (p_name, p_thumbnail, p_tokens, p_html, p_placeholders, p_created_by)
--   RETURNING *;
-- $$ LANGUAGE SQL;

-- CREATE OR REPLACE FUNCTION signature_app.update_template(
--   p_id UUID,
--   p_name TEXT,
--   p_thumbnail TEXT,
--   p_tokens JSONB,
--   p_html TEXT,
--   p_placeholders JSONB
-- ) RETURNS signature_app.templates AS $$
--   UPDATE signature_app.templates
--   SET name = p_name, thumbnail = p_thumbnail, tokens = p_tokens, html = p_html, placeholders = p_placeholders, created_at = NOW()
--   WHERE id = p_id
--   RETURNING *;
-- $$ LANGUAGE SQL;

-- ALTER TABLE signature_app.users ADD COLUMN is_active BOOLEAN DEFAULT true;

-- -- sqlfluff: dialect=postgres
-- -- EmailSignatureGenerator: Database updates for existing schema
-- -- Run in pgAdmin4 or psql. Safe to re-run.

-- SET search_path TO signature_app, public;

-- -- ====================================
-- -- Update register_user to include audit logging
-- -- ====================================
-- DROP FUNCTION IF EXISTS signature_app.register_user(text, text, text, text) CASCADE;
-- CREATE OR REPLACE FUNCTION signature_app.register_user(
--   p_name TEXT, 
--   p_email TEXT, 
--   p_hash TEXT, 
--   p_role TEXT
-- )
-- RETURNS signature_app.users
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = signature_app, public
-- AS $$
-- DECLARE
--   u signature_app.users;
-- BEGIN
--   INSERT INTO signature_app.users(name, email, password_hash, role)
--   VALUES (p_name, p_email, p_hash, COALESCE(p_role, 'user'))
--   RETURNING * INTO u;
--   INSERT INTO signature_app.audit_log(action, data)
--   VALUES ('USER_REGISTER', jsonb_build_object('user_id', u.id, 'email', u.email));
--   RETURN u;
-- END;
-- $$;

-- -- ====================================
-- -- Update get_admin_stats to include recent activity
-- -- ====================================
-- DROP FUNCTION IF EXISTS signature_app.get_admin_stats() CASCADE;
-- CREATE OR REPLACE FUNCTION signature_app.get_admin_stats()
-- RETURNS JSON
-- LANGUAGE plpgsql
-- STABLE
-- SET search_path = signature_app, public
-- AS $$
-- DECLARE
--   out JSON;
-- BEGIN
--   SELECT json_build_object(
--     'total_users', (SELECT COUNT(*) FROM signature_app.users),
--     'total_signatures', (SELECT COUNT(*) FROM signature_app.signatures),
--     'popular_templates', (
--       SELECT COALESCE(json_agg(t), '[]'::json) FROM (
--         SELECT t.id, t.name, COALESCE(a.total_signatures, 0) AS uses
--         FROM signature_app.templates t
--         LEFT JOIN signature_app.analytics a ON a.template_id = t.id
--         ORDER BY COALESCE(a.total_signatures, 0) DESC, t.created_at DESC
--         LIMIT 10
--       ) t
--     ),
--     'recent_activity', (
--       SELECT COALESCE(json_agg(a), '[]'::json) FROM (
--         SELECT
--           CASE
--             WHEN action = 'SIGNATURE_INSERT' THEN 'User ' || (data->>'user_id')::text || ' created signature'
--             WHEN action = 'SIGNATURE_UPDATE' THEN 'User ' || (data->>'user_id')::text || ' updated signature'
--             WHEN action = 'SIGNATURE_DELETE' THEN 'User ' || (data->>'user_id')::text || ' deleted signature'
--             WHEN action = 'TEMPLATE_ADD' THEN 'Admin ' || (data->>'user_id')::text || ' created template ' || (data->>'name')::text
--             WHEN action = 'TEMPLATE_UPDATE' THEN 'Admin ' || (data->>'user_id')::text || ' updated template ' || (data->>'name')::text
--             WHEN action = 'TEMPLATE_DELETE' THEN 'Admin ' || (data->>'user_id')::text || ' deleted template ' || (data->>'name')::text
--             WHEN action = 'USER_REGISTER' THEN 'User ' || (data->>'email')::text || ' registered'
--             WHEN action = 'USER_SUSPEND' THEN 'Admin ' || (data->>'admin_id')::text || ' suspended user ' || (data->>'email')::text
--             WHEN action = 'USER_ACTIVATE' THEN 'Admin ' || (data->>'admin_id')::text || ' activated user ' || (data->>'email')::text
--             WHEN action = 'USER_DELETE' THEN 'Admin ' || (data->>'admin_id')::text || ' deleted user ' || (data->>'email')::text
--           END AS description,
--           created_at AS timestamp
--         FROM signature_app.audit_log
--         WHERE action IN (
--           'SIGNATURE_INSERT', 'SIGNATURE_UPDATE', 'SIGNATURE_DELETE',
--           'TEMPLATE_ADD', 'TEMPLATE_UPDATE', 'TEMPLATE_DELETE',
--           'USER_REGISTER', 'USER_SUSPEND', 'USER_ACTIVATE', 'USER_DELETE'
--         )
--         ORDER BY created_at DESC
--         LIMIT 5
--       ) a
--     )
--   ) INTO out;
--   RETURN out;
-- END;
-- $$;

-- -- ====================================
-- -- Trigger functions for audit logging
-- -- ====================================

-- -- Audit signature actions (INSERT, UPDATE, DELETE)
-- DROP FUNCTION IF EXISTS signature_app.trg_audit_signatures() CASCADE;
-- CREATE OR REPLACE FUNCTION signature_app.trg_audit_signatures()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- SET search_path = signature_app, public
-- AS $$
-- BEGIN
--   IF TG_OP = 'INSERT' THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES ('SIGNATURE_INSERT', to_jsonb(NEW));
--   ELSIF TG_OP = 'UPDATE' THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES ('SIGNATURE_UPDATE', to_jsonb(NEW));
--   ELSIF TG_OP = 'DELETE' THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES ('SIGNATURE_DELETE', jsonb_build_object('user_id', OLD.user_id, 'signature_id', OLD.id));
--   END IF;
--   RETURN NEW;
-- END;
-- $$;

-- -- Audit template actions
-- DROP FUNCTION IF EXISTS signature_app.trg_audit_templates() CASCADE;
-- CREATE OR REPLACE FUNCTION signature_app.trg_audit_templates()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- SET search_path = signature_app, public
-- AS $$
-- BEGIN
--   IF TG_OP = 'INSERT' THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES ('TEMPLATE_ADD', jsonb_build_object('user_id', NEW.created_by, 'template_id', NEW.id, 'name', NEW.name));
--   ELSIF TG_OP = 'UPDATE' THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES ('TEMPLATE_UPDATE', jsonb_build_object('user_id', NEW.created_by, 'template_id', NEW.id, 'name', NEW.name));
--   ELSIF TG_OP = 'DELETE' THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES ('TEMPLATE_DELETE', jsonb_build_object('user_id', OLD.created_by, 'template_id', OLD.id, 'name', OLD.name));
--   END IF;
--   RETURN NEW;
-- END;
-- $$;

-- -- Audit user actions
-- DROP FUNCTION IF EXISTS signature_app.trg_audit_users() CASCADE;
-- CREATE OR REPLACE FUNCTION signature_app.trg_audit_users()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- SET search_path = signature_app, public
-- AS $$
-- BEGIN
--   IF TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES (
--       CASE WHEN NEW.is_active THEN 'USER_ACTIVATE' ELSE 'USER_SUSPEND' END,
--       jsonb_build_object('admin_id', NULL, 'user_id', NEW.id, 'email', NEW.email)
--     );
--   ELSIF TG_OP = 'DELETE' THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES ('USER_DELETE', jsonb_build_object('admin_id', NULL, 'user_id', OLD.id, 'email', OLD.email));
--   END IF;
--   RETURN NEW;
-- END;
-- $$;

-- -- ====================================
-- -- Update triggers
-- -- ====================================
-- DROP TRIGGER IF EXISTS audit_signature_insert ON signature_app.signatures;
-- CREATE TRIGGER audit_signature_actions
-- AFTER INSERT OR UPDATE OR DELETE ON signature_app.signatures
-- FOR EACH ROW EXECUTE FUNCTION signature_app.trg_audit_signatures();

-- DROP TRIGGER IF EXISTS audit_template_actions ON signature_app.templates;
-- CREATE TRIGGER audit_template_actions
-- AFTER INSERT OR UPDATE OR DELETE ON signature_app.templates
-- FOR EACH ROW EXECUTE FUNCTION signature_app.trg_audit_templates();

-- DROP TRIGGER IF EXISTS audit_user_actions ON signature_app.users;
-- CREATE TRIGGER audit_user_actions
-- AFTER UPDATE OR DELETE ON signature_app.users
-- FOR EACH ROW EXECUTE FUNCTION signature_app.trg_audit_users();

-- -- ====================================
-- -- Add indexes for performance
-- -- ====================================
-- CREATE INDEX IF NOT EXISTS idx_audit_log_action ON signature_app.audit_log(action);
-- CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON signature_app.audit_log(created_at);
-- -- sqlfluff: dialect=postgres
-- -- EmailSignatureGenerator: Fix for a.total_signatures error and admin mode audit logging
-- -- Run in pgAdmin4 or psql. Safe to re-run.

-- SET search_path TO signature_app, public;

-- -- ====================================
-- -- Update get_admin_stats to ensure proper aggregation
-- -- ====================================
-- DROP FUNCTION IF EXISTS signature_app.get_admin_stats() CASCADE;
-- CREATE OR REPLACE FUNCTION signature_app.get_admin_stats()
-- RETURNS JSON
-- LANGUAGE plpgsql
-- STABLE
-- SET search_path = signature_app, public
-- AS $$
-- DECLARE
--   out JSON;
-- BEGIN
--   SELECT json_build_object(
--     'total_users', (SELECT COUNT(*) FROM signature_app.users),
--     'total_signatures', (SELECT COUNT(*) FROM signature_app.signatures),
--     'popular_templates', (
--       SELECT COALESCE(json_agg(t), '[]'::json) FROM (
--         SELECT t.id, t.name, COALESCE(a.total_signatures, 0) AS uses
--         FROM signature_app.templates t
--         LEFT JOIN signature_app.analytics a ON a.template_id = t.id
--         ORDER BY COALESCE(a.total_signatures, 0) DESC, t.created_at DESC
--         LIMIT 10
--       ) t
--     ),
--     'recent_activity', (
--       SELECT COALESCE(json_agg(a), '[]'::json) FROM (
--         SELECT
--           CASE
--             WHEN action = 'SIGNATURE_INSERT' THEN 'User ' || (data->>'user_id')::text || ' created signature'
--             WHEN action = 'SIGNATURE_UPDATE' THEN 'User ' || (data->>'user_id')::text || ' updated signature'
--             WHEN action = 'SIGNATURE_DELETE' THEN 'User ' || (data->>'user_id')::text || ' deleted signature'
--             WHEN action = 'TEMPLATE_ADD' THEN 'Admin ' || (data->>'user_id')::text || ' created template ' || (data->>'name')::text
--             WHEN action = 'TEMPLATE_UPDATE' THEN 'Admin ' || (data->>'user_id')::text || ' updated template ' || (data->>'name')::text
--             WHEN action = 'TEMPLATE_DELETE' THEN 'Admin ' || (data->>'user_id')::text || ' deleted template ' || (data->>'name')::text
--             WHEN action = 'USER_REGISTER' THEN 'User ' || (data->>'email')::text || ' registered'
--             WHEN action = 'USER_SUSPEND' THEN 'Admin ' || (data->>'admin_id')::text || ' suspended user ' || (data->>'email')::text
--             WHEN action = 'USER_ACTIVATE' THEN 'Admin ' || (data->>'admin_id')::text || ' activated user ' || (data->>'email')::text
--             WHEN action = 'USER_DELETE' THEN 'Admin ' || (data->>'admin_id')::text || ' deleted user ' || (data->>'email')::text
--             WHEN action = 'ADMIN_MODE_SWITCH' THEN 'User ' || (data->>'user_id')::text || ' switched to admin mode'
--           END AS description,
--           created_at AS timestamp
--         FROM signature_app.audit_log
--         WHERE action IN (
--           'SIGNATURE_INSERT', 'SIGNATURE_UPDATE', 'SIGNATURE_DELETE',
--           'TEMPLATE_ADD', 'TEMPLATE_UPDATE', 'TEMPLATE_DELETE',
--           'USER_REGISTER', 'USER_SUSPEND', 'USER_ACTIVATE', 'USER_DELETE',
--           'ADMIN_MODE_SWITCH'
--         )
--         ORDER BY created_at DESC
--         LIMIT 5
--       ) a
--     )
--   ) INTO out;
--   RETURN out;
-- END;
-- $$;

-- -- ====================================
-- -- Update register_user to include audit logging
-- -- ====================================
-- DROP FUNCTION IF EXISTS signature_app.register_user(text, text, text, text) CASCADE;
-- CREATE OR REPLACE FUNCTION signature_app.register_user(
--   p_name TEXT, 
--   p_email TEXT, 
--   p_hash TEXT, 
--   p_role TEXT
-- )
-- RETURNS signature_app.users
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = signature_app, public
-- AS $$
-- DECLARE
--   u signature_app.users;
-- BEGIN
--   INSERT INTO signature_app.users(name, email, password_hash, role, is_active)
--   VALUES (p_name, p_email, p_hash, COALESCE(p_role, 'user'), true)
--   RETURNING * INTO u;
--   INSERT INTO signature_app.audit_log(action, data)
--   VALUES ('USER_REGISTER', jsonb_build_object('user_id', u.id, 'email', u.email));
--   RETURN u;
-- END;
-- $$;

-- -- ====================================
-- -- Add function to log admin mode switch
-- -- ====================================
-- DROP FUNCTION IF EXISTS signature_app.log_admin_mode_switch(uuid) CASCADE;
-- CREATE OR REPLACE FUNCTION signature_app.log_admin_mode_switch(
--   p_user_id UUID
-- )
-- RETURNS VOID
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = signature_app, public
-- AS $$
-- BEGIN
--   INSERT INTO signature_app.audit_log(action, data)
--   VALUES ('ADMIN_MODE_SWITCH', jsonb_build_object('user_id', p_user_id));
-- END;
-- $$;

-- -- ====================================
-- -- Update trigger functions for audit logging
-- -- ====================================

-- -- Audit signature actions (INSERT, UPDATE, DELETE)
-- DROP FUNCTION IF EXISTS signature_app.trg_audit_signatures() CASCADE;
-- CREATE OR REPLACE FUNCTION signature_app.trg_audit_signatures()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- SET search_path = signature_app, public
-- AS $$
-- BEGIN
--   IF TG_OP = 'INSERT' THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES ('SIGNATURE_INSERT', to_jsonb(NEW));
--   ELSIF TG_OP = 'UPDATE' THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES ('SIGNATURE_UPDATE', to_jsonb(NEW));
--   ELSIF TG_OP = 'DELETE' THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES ('SIGNATURE_DELETE', jsonb_build_object('user_id', OLD.user_id, 'signature_id', OLD.id));
--   END IF;
--   RETURN NEW;
-- END;
-- $$;

-- -- Audit template actions
-- DROP FUNCTION IF EXISTS signature_app.trg_audit_templates() CASCADE;
-- CREATE OR REPLACE FUNCTION signature_app.trg_audit_templates()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- SET search_path = signature_app, public
-- AS $$
-- BEGIN
--   IF TG_OP = 'INSERT' THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES ('TEMPLATE_ADD', jsonb_build_object('user_id', NEW.created_by, 'template_id', NEW.id, 'name', NEW.name));
--   ELSIF TG_OP = 'UPDATE' THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES ('TEMPLATE_UPDATE', jsonb_build_object('user_id', NEW.created_by, 'template_id', NEW.id, 'name', NEW.name));
--   ELSIF TG_OP = 'DELETE' THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES ('TEMPLATE_DELETE', jsonb_build_object('user_id', OLD.created_by, 'template_id', OLD.id, 'name', OLD.name));
--   END IF;
--   RETURN NEW;
-- END;
-- $$;

-- -- Audit user actions
-- DROP FUNCTION IF EXISTS signature_app.trg_audit_users() CASCADE;
-- CREATE OR REPLACE FUNCTION signature_app.trg_audit_users()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- SET search_path = signature_app, public
-- AS $$
-- BEGIN
--   IF TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES (
--       CASE WHEN NEW.is_active THEN 'USER_ACTIVATE' ELSE 'USER_SUSPEND' END,
--       jsonb_build_object('admin_id', NULL, 'user_id', NEW.id, 'email', NEW.email)
--     );
--   ELSIF TG_OP = 'DELETE' THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES ('USER_DELETE', jsonb_build_object('admin_id', NULL, 'user_id', OLD.id, 'email', OLD.email));
--   END IF;
--   RETURN NEW;
-- END;
-- $$;

-- -- ====================================
-- -- Update triggers
-- -- ====================================
-- DROP TRIGGER IF EXISTS audit_signature_insert ON signature_app.signatures;
-- CREATE TRIGGER audit_signature_actions
-- AFTER INSERT OR UPDATE OR DELETE ON signature_app.signatures
-- FOR EACH ROW EXECUTE FUNCTION signature_app.trg_audit_signatures();

-- DROP TRIGGER IF EXISTS audit_template_actions ON signature_app.templates;
-- CREATE TRIGGER audit_template_actions
-- AFTER INSERT OR UPDATE OR DELETE ON signature_app.templates
-- FOR EACH ROW EXECUTE FUNCTION signature_app.trg_audit_templates();

-- DROP TRIGGER IF EXISTS audit_user_actions ON signature_app.users;
-- CREATE TRIGGER audit_user_actions
-- AFTER UPDATE OR DELETE ON signature_app.users
-- FOR EACH ROW EXECUTE FUNCTION signature_app.trg_audit_users();

-- -- ====================================
-- -- Add indexes for performance
-- -- ====================================
-- CREATE INDEX IF NOT EXISTS idx_audit_log_action ON signature_app.audit_log(action);
-- CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON signature_app.audit_log(created_at);
-- -- sqlfluff: dialect=postgres
-- -- EmailSignatureGenerator: Fix user suspension audit logging
-- -- Run in pgAdmin4 or psql. Safe to re-run.

-- SET search_path TO signature_app, public;

-- -- Update audit user trigger to accept admin_id from backend
-- DROP FUNCTION IF EXISTS signature_app.trg_audit_users() CASCADE;
-- CREATE OR REPLACE FUNCTION signature_app.trg_audit_users()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- SET search_path = signature_app, public
-- AS $$
-- BEGIN
--   IF TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES (
--       CASE WHEN NEW.is_active THEN 'USER_ACTIVATE' ELSE 'USER_SUSPEND' END,
--       jsonb_build_object(
--         'admin_id', current_setting('app.current_user_id', true)::uuid,
--         'user_id', NEW.id,
--         'email', NEW.email
--       )
--     );
--   ELSIF TG_OP = 'DELETE' THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES (
--       'USER_DELETE',
--       jsonb_build_object(
--         'admin_id', current_setting('app.current_user_id', true)::uuid,
--         'user_id', OLD.id,
--         'email', OLD.email
--       )
--     );
--   END IF;
--   RETURN NEW;
-- END;
-- $$;

-- DROP TRIGGER IF EXISTS audit_user_actions ON signature_app.users;
-- CREATE TRIGGER audit_user_actions
-- AFTER UPDATE OR DELETE ON signature_app.users
-- FOR EACH ROW EXECUTE FUNCTION signature_app.trg_audit_users();

-- -- sqlfluff: dialect=postgres
-- -- EmailSignatureGenerator: Add token blacklist table
-- -- Run in pgAdmin4 or psql. Safe to re-run.

-- SET search_path TO signature_app, public;

-- CREATE TABLE IF NOT EXISTS signature_app.token_blacklist (
--   token TEXT PRIMARY KEY,
--   user_id UUID NOT NULL REFERENCES signature_app.users(id) ON DELETE CASCADE,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   expires_at TIMESTAMPTZ NOT NULL
-- );

-- CREATE INDEX IF NOT EXISTS idx_token_blacklist_user_id ON signature_app.token_blacklist(user_id);

-- -- sqlfluff: dialect=postgres
-- -- EmailSignatureGenerator: Enhance token management
-- -- Run in pgAdmin4 or psql. Safe to re-run.

-- SET search_path TO signature_app, public;

-- -- Add column to store current token in users table
-- ALTER TABLE signature_app.users
-- ADD COLUMN IF NOT EXISTS current_token TEXT;

-- -- sqlfluff: dialect=postgres
-- -- EmailSignatureGenerator: Enhance token management
-- -- Run in pgAdmin4 or psql. Safe to re-run.

-- SET search_path TO signature_app, public;

-- -- Add column to store current token in users table
-- ALTER TABLE signature_app.users
-- ADD COLUMN IF NOT EXISTS current_token TEXT;

-- -- sqlfluff: dialect=postgres
-- -- EmailSignatureGenerator: Enhance token management
-- -- Run in pgAdmin4 or psql. Safe to re-run.

-- SET search_path TO signature_app, public;

-- -- Add column to store current token in users table
-- ALTER TABLE signature_app.users
-- ADD COLUMN IF NOT EXISTS current_token TEXT;

-- -- sqlfluff: dialect=postgres
-- -- EmailSignatureGenerator: Enhance token management
-- -- Run in pgAdmin4 or psql. Safe to re-run.

-- SET search_path TO signature_app, public;

-- -- Add column to store current token in users table
-- ALTER TABLE signature_app.users
-- ADD COLUMN IF NOT EXISTS current_token TEXT;


-- -- sqlfluff: dialect=postgres
-- -- EmailSignatureGenerator: Fix audit user trigger for NULL admin_id
-- -- Run in pgAdmin4 or psql. Safe to re-run.

-- SET search_path TO signature_app, public;

-- DROP FUNCTION IF EXISTS signature_app.trg_audit_users() CASCADE;
-- CREATE OR REPLACE FUNCTION signature_app.trg_audit_users()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- SET search_path = signature_app, public
-- AS $$
-- BEGIN
--   IF TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES (
--       CASE WHEN NEW.is_active THEN 'USER_ACTIVATE' ELSE 'USER_SUSPEND' END,
--       jsonb_build_object(
--         'admin_id', NULLIF(current_setting('app.current_user_id', true), '')::uuid,
--         'user_id', NEW.id,
--         'email', NEW.email
--       )
--     );
--   ELSIF TG_OP = 'DELETE' THEN
--     INSERT INTO signature_app.audit_log(action, data)
--     VALUES (
--       'USER_DELETE',
--       jsonb_build_object(
--         'admin_id', NULLIF(current_setting('app.current_user_id', true), '')::uuid,
--         'user_id', OLD.id,
--         'email', OLD.email
--       )
--     );
--   END IF;
--   RETURN NEW;
-- END;
-- $$;

-- DROP TRIGGER IF EXISTS audit_user_actions ON signature_app.users;
-- CREATE TRIGGER audit_user_actions
-- AFTER UPDATE OR DELETE ON signature_app.users
-- FOR EACH ROW EXECUTE FUNCTION signature_app.trg_audit_users();


-- sqlfluff: dialect=postgres
-- EmailSignatureGenerator: Consolidated database setup with trigger fix
-- Run in pgAdmin4 or psql. Safe to re-run.

SET search_path TO signature_app, public;

-- ====================================
-- Schema & Extensions
-- ====================================
CREATE SCHEMA IF NOT EXISTS signature_app;
SET search_path TO signature_app, public;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ====================================
-- Tables
-- ====================================
CREATE TABLE IF NOT EXISTS signature_app.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reset_token TEXT,
  reset_token_expiration BIGINT,
  email_notifications BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  current_token TEXT
);

CREATE TABLE IF NOT EXISTS signature_app.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  thumbnail TEXT,
  tokens JSONB NOT NULL DEFAULT '{}'::jsonb, -- template metadata/fields
  html TEXT,
  placeholders JSONB,
  created_by UUID REFERENCES signature_app.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signature_app.signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES signature_app.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES signature_app.templates(id) ON DELETE SET NULL,
  form_data JSONB NOT NULL, -- user inputs
  html_code TEXT NOT NULL,  -- saved HTML
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signature_app.analytics (
  id SERIAL PRIMARY KEY,
  template_id UUID UNIQUE REFERENCES signature_app.templates(id) ON DELETE CASCADE,
  total_signatures INT NOT NULL DEFAULT 0,
  last_used TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS signature_app.audit_log (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signature_app.token_blacklist (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES signature_app.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- ====================================
-- Views
-- ====================================
DROP VIEW IF EXISTS signature_app.v_signatures_detailed;
CREATE VIEW signature_app.v_signatures_detailed AS
SELECT
  s.id,
  s.created_at,
  u.name AS user_name,
  u.email AS user_email,
  t.name AS template_name,
  s.form_data,
  s.html_code
FROM signature_app.signatures s
LEFT JOIN signature_app.users u ON u.id = s.user_id
LEFT JOIN signature_app.templates t ON t.id = s.template_id
ORDER BY s.created_at DESC;

DROP VIEW IF EXISTS signature_app.v_templates_stats;
CREATE VIEW signature_app.v_templates_stats AS
SELECT
  t.id,
  t.name,
  t.created_at,
  COALESCE(a.total_signatures, 0) AS uses,
  a.last_used
FROM signature_app.templates t
LEFT JOIN signature_app.analytics a ON a.template_id = t.id
ORDER BY uses DESC, t.created_at DESC;

-- ====================================
-- Functions
-- ====================================

-- Register user
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
  VALUES (p_name, p_email, p_hash, COALESCE(p_role, 'user'), TRUE)
  RETURNING * INTO u;
  INSERT INTO signature_app.audit_log(action, data)
  VALUES ('USER_REGISTER', jsonb_build_object('user_id', u.id, 'email', u.email));
  RETURN u;
END;
$$;

-- Create signature
CREATE OR REPLACE FUNCTION signature_app.create_signature(
  p_user_id UUID,
  p_template_id UUID,
  p_form JSONB,
  p_html TEXT
)
RETURNS signature_app.signatures
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = signature_app, public
AS $$
DECLARE
  s signature_app.signatures;
BEGIN
  INSERT INTO signature_app.signatures(user_id, template_id, form_data, html_code)
  VALUES (p_user_id, p_template_id, p_form, p_html)
  RETURNING * INTO s;
  RETURN s;
END;
$$;

-- Update signature
CREATE OR REPLACE FUNCTION signature_app.update_signature(
  p_id UUID,
  p_user_id UUID,
  p_form JSONB,
  p_html TEXT
)
RETURNS signature_app.signatures
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = signature_app, public
AS $$
DECLARE
  s signature_app.signatures;
BEGIN
  UPDATE signature_app.signatures
  SET form_data = COALESCE(p_form, form_data),
      html_code = COALESCE(p_html, html_code)
  WHERE id = p_id AND user_id = p_user_id
  RETURNING * INTO s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signature not found or you do not own it for id=%', p_id;
  END IF;

  RETURN s;
END;
$$;

-- Delete signature
CREATE OR REPLACE FUNCTION signature_app.delete_signature(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = signature_app, public
AS $$
BEGIN
  DELETE FROM signature_app.signatures WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signature not found for id=%', p_id;
  END IF;
END;
$$;

-- Get all signatures for a user
CREATE OR REPLACE FUNCTION signature_app.get_user_signatures(p_user_id UUID)
RETURNS SETOF signature_app.signatures
LANGUAGE plpgsql
STABLE
SET search_path = signature_app, public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM signature_app.signatures
  WHERE user_id = p_user_id
  ORDER BY created_at DESC;
END;
$$;

-- Add template
CREATE OR REPLACE FUNCTION signature_app.add_template(
  p_name TEXT,
  p_thumbnail TEXT,
  p_tokens JSONB,
  p_html TEXT,
  p_placeholders JSONB,
  p_created_by UUID
)
RETURNS signature_app.templates
LANGUAGE SQL
SET search_path = signature_app, public
AS $$
  INSERT INTO signature_app.templates (name, thumbnail, tokens, html, placeholders, created_by)
  VALUES (p_name, p_thumbnail, p_tokens, p_html, p_placeholders, p_created_by)
  RETURNING *;
$$;

-- Update template
CREATE OR REPLACE FUNCTION signature_app.update_template(
  p_id UUID,
  p_name TEXT,
  p_thumbnail TEXT,
  p_tokens JSONB,
  p_html TEXT,
  p_placeholders JSONB
)
RETURNS signature_app.templates
LANGUAGE SQL
SET search_path = signature_app, public
AS $$
  UPDATE signature_app.templates
  SET name = p_name,
      thumbnail = p_thumbnail,
      tokens = p_tokens,
      html = p_html,
      placeholders = p_placeholders,
      created_at = NOW()
  WHERE id = p_id
  RETURNING *;
$$;

-- Delete template
CREATE OR REPLACE FUNCTION signature_app.delete_template(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = signature_app, public
AS $$
BEGIN
  DELETE FROM signature_app.templates WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found for id=%', p_id;
  END IF;
END;
$$;

-- Admin stats summary
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

-- Log admin mode switch
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
-- Trigger Functions
-- ====================================

-- Update analytics after signature insert
CREATE OR REPLACE FUNCTION signature_app.trg_update_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = signature_app, public
AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    INSERT INTO signature_app.analytics(template_id, total_signatures, last_used)
    VALUES (NEW.template_id, 1, NOW())
    ON CONFLICT (template_id) DO UPDATE
    SET total_signatures = signature_app.analytics.total_signatures + 1,
        last_used = NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Audit signature actions
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
        'admin_id', NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID,
        'user_id', NEW.id,
        'email', NEW.email
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO signature_app.audit_log(action, data)
    VALUES (
      'USER_DELETE',
      jsonb_build_object(
        'admin_id', NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID,
        'user_id', OLD.id,
        'email', OLD.email
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ====================================
-- Triggers
-- ====================================
DROP TRIGGER IF EXISTS after_signature_insert ON signature_app.signatures;
CREATE TRIGGER after_signature_insert
AFTER INSERT ON signature_app.signatures
FOR EACH ROW EXECUTE FUNCTION signature_app.trg_update_analytics();

DROP TRIGGER IF EXISTS audit_signature_actions ON signature_app.signatures;
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
-- Indexes
-- ====================================
CREATE INDEX IF NOT EXISTS idx_signatures_user_id ON signature_app.signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_signatures_template_id ON signature_app.signatures(template_id);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON signature_app.templates(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON signature_app.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON signature_app.audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_user_id ON signature_app.token_blacklist(user_id);

-- ====================================
-- Data Migration (Templates)
-- ====================================
UPDATE signature_app.templates
SET html = '<div style="font-family: {{font}}; color: {{accent}};">{{name}} - {{title}}</div>'
WHERE html IS NULL;

UPDATE signature_app.templates
SET tokens = '["name", "title"]'::jsonb
WHERE tokens->>'font' IS NOT NULL;

UPDATE signature_app.templates
SET placeholders = '["name", "title"]'::jsonb
WHERE placeholders IS NULL;

-- ====================================
-- Optional: Seed an admin user
-- Replace <bcrypt-hash> with a real hash from your Node app (bcrypt.hash(...,10))
-- INSERT INTO signature_app.users(name, email, password_hash, role)
-- VALUES ('Admin', 'admin@local', '<bcrypt-hash>', 'admin');



ALTER TABLE signature_app.users
ADD COLUMN IF NOT EXISTS current_token TEXT;





ALTER TABLE signature_app.users
ADD COLUMN IF NOT EXISTS current_token TEXT;




-- sqlfluff: dialect=postgres
-- EmailSignatureGenerator: Fix for current_token column and triggers
-- Run in pgAdmin4 or psql. Safe to re-run.

SET search_path TO signature_app, public;

-- Add current_token column if missing
ALTER TABLE signature_app.users
ADD COLUMN IF NOT EXISTS current_token TEXT;

-- Ensure all triggers are correctly set up
DROP TRIGGER IF EXISTS after_signature_insert ON signature_app.signatures;
CREATE TRIGGER after_signature_insert
AFTER INSERT ON signature_app.signatures
FOR EACH ROW EXECUTE FUNCTION signature_app.trg_update_analytics();

DROP TRIGGER IF EXISTS audit_signature_actions ON signature_app.signatures;
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
ALTER TABLE signature_app.templates
ADD COLUMN IF NOT EXISTS category TEXT;
CREATE OR REPLACE FUNCTION signature_app.add_template(
  p_name TEXT,
  p_thumbnail TEXT,
  p_tokens JSONB,
  p_html TEXT,
  p_placeholders JSONB,
  p_category TEXT,
  p_created_by UUID
) RETURNS signature_app.templates AS $$
  INSERT INTO signature_app.templates (name, thumbnail, tokens, html, placeholders, category, created_by)
  VALUES (p_name, p_thumbnail, p_tokens, p_html, p_placeholders, p_category, p_created_by)
  RETURNING *;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION signature_app.update_template(
  p_id UUID,
  p_name TEXT,
  p_thumbnail TEXT,
  p_tokens JSONB,
  p_html TEXT,
  p_placeholders JSONB,
  p_category TEXT
) RETURNS signature_app.templates AS $$
  UPDATE signature_app.templates
  SET name = p_name, thumbnail = p_thumbnail, tokens = p_tokens, html = p_html, placeholders = p_placeholders, category = p_category, created_at = NOW()
  WHERE id = p_id
  RETURNING *;
$$ LANGUAGE SQL;
UPDATE signature_app.templates
SET category = 'creative'
WHERE category IS NULL;
CREATE SCHEMA IF NOT EXISTS signature_app;

CREATE TABLE IF NOT EXISTS signature_app.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  thumbnail TEXT,
  tokens JSONB NOT NULL,
  html TEXT NOT NULL,
  placeholders JSONB NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'creative',
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES signature_app.users(id)
);

-- Ensure add_template function
CREATE OR REPLACE FUNCTION signature_app.add_template(
  p_name VARCHAR,
  p_thumbnail TEXT,
  p_tokens JSONB,
  p_html TEXT,
  p_placeholders JSONB,
  p_category VARCHAR,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  thumbnail TEXT,
  tokens JSONB,
  html TEXT,
  placeholders JSONB,
  category VARCHAR,
  created_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  INSERT INTO signature_app.templates (
    name, thumbnail, tokens, html, placeholders, category, created_by
  ) VALUES (
    p_name, p_thumbnail, p_tokens, p_html, p_placeholders, p_category, p_user_id
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- Ensure update_template function
CREATE OR REPLACE FUNCTION signature_app.update_template(
  p_id UUID,
  p_name VARCHAR,
  p_thumbnail TEXT,
  p_tokens JSONB,
  p_html TEXT,
  p_placeholders JSONB,
  p_category VARCHAR
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  thumbnail TEXT,
  tokens JSONB,
  html TEXT,
  placeholders JSONB,
  category VARCHAR,
  created_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  UPDATE signature_app.templates
  SET
    name = p_name,
    thumbnail = p_thumbnail,
    tokens = p_tokens,
    html = p_html,
    placeholders = p_placeholders,
    category = p_category,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

INSERT INTO signature_app.templates (name, tokens, html, placeholders, category, created_by)
VALUES 
  (
    'Modern Gradient Horizontal',
    '{"font": "Arial", "accent": "#4A90E2"}'::jsonb,
    '<table style="font-family: {{font}}; color: {{accent}};"><tr><td>{{name}}</td><td>{{title}}</td><td><a href="{{linkedin}}"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/linkedin.svg" width="20" height="20" alt="LinkedIn" /></a></td><td><a href="{{twitter}}"><img src="https://cdn.jsdelivr.net/npm/simple-icons@v13/icons/twitter.svg" width="20" height="20" alt="Twitter" /></a></td></tr></table>',
    '["name", "title", "linkedin", "twitter"]'::jsonb,
    'creative',
    NULL
  )
ON CONFLICT (id) DO NOTHING;


-- Check templates table
SELECT id, name, placeholders, tokens, html, category, created_by, created_at, updated_at
FROM signature_app.templates;

-- Check for invalid placeholders
SELECT id, name, placeholders
FROM signature_app.templates
WHERE placeholders IS NULL
   OR placeholders::text = '[]'
   OR placeholders::text !~ '^\[("[^"]*"(,\s*"[^"]*")*)?\]$';

-- Fix invalid placeholders
UPDATE signature_app.templates
SET placeholders = '["{{user_image}}", "{{name}}", "{{role}}", "{{phone}}", "{{website}}", "{{linkedin_url}}", "{{github_url}}"]'::jsonb
WHERE placeholders IS NULL
   OR placeholders::text = '[]'
   OR placeholders::text !~ '^\[("[^"]*"(,\s*"[^"]*")*)?\]$';

-- Verify fix
SELECT id, name, placeholders
FROM signature_app.templates;




UPDATE signature_app.templates
SET placeholders = '["{{user_image}}", "{{name}}", "{{role}}", "{{phone}}", "{{website}}", "{{linkedin_url}}", "{{github_url}}"]'::jsonb
WHERE id = 'be0c4445-dda0-495c-88b7-e547c92ad423';

SELECT id, name, placeholders
FROM signature_app.templates;

SELECT * FROM signature_app.audit_log WHERE action IN ('TEMPLATE_ADD', 'TEMPLATE_UPDATE');


SELECT id, name, placeholders
FROM signature_app.templates;

UPDATE signature_app.templates
SET placeholders = '["{{user_image}}", "{{name}}", "{{role}}", "{{phone}}", "{{website}}", "{{linkedin_url}}", "{{github_url}}"]'::jsonb
WHERE placeholders IS NULL
   OR placeholders::text = '[]'
   OR placeholders::text !~ '^\[("[^"]*"(,\s*"[^"]*")*)?\]$';



DELETE FROM signature_app.templates WHERE id = 'be0c4445-dda0-495c-88b7-e547c92ad423';



CREATE OR REPLACE FUNCTION signature_app.add_template(
    p_name TEXT,
    p_thumbnail TEXT,
    p_tokens JSONB,
    p_user_id UUID
) RETURNS TABLE (
    id UUID,
    name TEXT,
    thumbnail TEXT,
    tokens JSONB,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    html TEXT,
    placeholders TEXT[],
    category TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    INSERT INTO signature_app.templates (
        id, name, thumbnail, tokens, created_by, created_at, html, placeholders, category, updated_at
    ) VALUES (
        gen_random_uuid(),
        p_name,
        p_thumbnail,
        p_tokens,
        p_user_id,
        NOW(),
        p_tokens->'html'->>'html',
        (p_tokens->'placeholders')::TEXT[],
        p_tokens->>'category',
        NOW()
    )
    RETURNING
        id,
        name,
        thumbnail,
        tokens,
        created_by,
        created_at,
        html,
        placeholders,
        category,
        updated_at
    INTO
        id,
        name,
        thumbnail,
        tokens,
        created_by,
        created_at,
        html,
        placeholders,
        category,
        updated_at;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;




UPDATE signature_app.templates
SET tokens = jsonb_build_object(
    'placeholders', placeholders::jsonb,
    'html', html,
    'category', category
)
WHERE id IN (
    'fa3a6492-158f-454b-85c6-5039355378f9',
    '9fde4bc9-e64a-480c-9849-500979ec7276',
    'be0c4445-dda0-495c-88b7-e547c92ad423'
);


-- Drop the existing function
DROP FUNCTION IF EXISTS signature_app.add_template(text, text, jsonb, uuid);

-- Create the schema and table if not already created
CREATE SCHEMA IF NOT EXISTS signature_app;

CREATE TABLE IF NOT EXISTS signature_app.templates (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    thumbnail TEXT,
    tokens JSONB,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    html TEXT,
    placeholders TEXT[],
    category TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the add_template function
CREATE OR REPLACE FUNCTION signature_app.add_template(
    p_name TEXT,
    p_thumbnail TEXT,
    p_tokens JSONB,
    p_user_id UUID
) RETURNS TABLE (
    id UUID,
    name TEXT,
    thumbnail TEXT,
    tokens JSONB,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    html TEXT,
    placeholders TEXT[],
    category TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_created_at TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    INSERT INTO signature_app.templates (
        id, name, thumbnail, tokens, created_by, created_at, html, placeholders, category, updated_at
    ) VALUES (
        gen_random_uuid(),
        p_name,
        p_thumbnail,
        p_tokens,
        p_user_id,
        v_created_at,
        p_tokens->>'html',
        (p_tokens->'placeholders')::TEXT[],
        p_tokens->>'category',
        v_created_at
    )
    RETURNING
        id,
        name,
        thumbnail,
        tokens,
        created_by,
        created_at,
        html,
        placeholders,
        category,
        updated_at
    INTO
        id,
        name,
        thumbnail,
        tokens,
        created_by,
        created_at,
        html,
        placeholders,
        category,
        updated_at;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

select * from signatures;




-- Fix tokens, html, and updated_at for all templates
UPDATE signature_app.templates
SET
    tokens = jsonb_build_object(
        'html', html,
        'placeholders', placeholders::jsonb,
        'category', category
    ),
    updated_at = created_at
WHERE id IN (
    'fa3a6492-158f-454b-85c6-5039355378f9',
    '9fde4bc9-e64a-480c-9849-500979ec7276',
    'be0c4445-dda0-495c-88b7-e547c92ad423'
);


delete from signature_app.templates



INSERT INTO signature_app.templates (id, name, placeholders, html, category) VALUES
(
  'fa3a6492-158f-454b-85c6-5039355378f9',
  'New Template',
  '["{{name}}", "{{email}}", "{{phone}}", "{{user_image}}", "{{website}}"]'::jsonb,
  '<div>{{name}} - {{email}} - {{phone}}</div>',
  'creative'
),
(
  '9fde4bc9-e64a-480c-9849-500979ec7276',
  'New Template',
  '["{{user_image}}", "{{name}}", "{{role}}", "{{phone}}", "{{website}}", "{{linkedin_url}}", "{{github_url}}"]'::jsonb,
  '<div>{{name}} - {{role}} - {{phone}}</div>',
  'professional'
),
(
  'be0c4445-dda0-495c-88b7-e547c92ad423',
  'demo',
  '["{{user_image}}", "{{name}}", "{{role}}", "{{phone}}", "{{website}}", "{{linkedin_url}}", "{{github_url}}"]'::jsonb,
  '<div>{{name}} - {{role}} - {{phone}}</div>',
  'demo'
);


SELECT id, name, placeholders FROM signature_app.templates;


SELECT * FROM signature_app.signatures;

