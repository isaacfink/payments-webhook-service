create extension if not exists "pgcrypto";

create table accounts (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  currency      char(3) not null,
  balance_cents bigint not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table transactions (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references accounts (id),
  settlement_id text not null,
  reference     text not null,
  amount_cents  bigint not null,
  created_at    timestamptz not null default now()
);

create index transactions_account_id_idx on transactions (account_id);
create index transactions_settlement_id_idx on transactions (settlement_id);

create table processed_events (
  event_id     text not null,
  event_type   text not null,
  payload      jsonb not null,
  processed_at timestamptz not null default now()
);

create index processed_events_event_id_idx on processed_events (event_id);

create table webhook_audit (
  id          bigserial primary key,
  event_id    text not null,
  outcome     text not null,
  recorded_at timestamptz not null default now()
);

create index webhook_audit_event_id_idx on webhook_audit (event_id);
