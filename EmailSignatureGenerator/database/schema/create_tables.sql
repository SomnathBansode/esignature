-- sqlfluff: dialect=postgres
create schema if not exists signature_app;
set search_path to signature_app, public;

create extension if not exists pgcrypto; -- for gen_random_uuid()

create table if not exists signature_app.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password_hash text not null,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

create table if not exists signature_app.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  thumbnail text,
  tokens jsonb not null default '{}'::jsonb,
  created_by uuid references signature_app.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists signature_app.signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references signature_app.users(id) on delete cascade,
  template_id uuid references signature_app.templates(id) on delete set null,
  form_data jsonb not null,
  html_code text not null,
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
