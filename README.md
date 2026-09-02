# payments-webhooks

An Express + TypeScript service that receives settlement events from a payment provider,
records a transaction per line item, and moves the affected account balances.

Incoming webhooks are HMAC-signed by the provider and validated against a shared secret.
Payloads are parsed with zod. Settlements are applied inside a database transaction, and each
provider event is recorded so redeliveries can be recognised.

## Requirements

Node 20+ and Docker.

## Running it

```bash
docker compose up -d      # Postgres on :5433, schema and seed applied automatically
npm install
npm run dev               # service on :3001
```

Check it came up:

```bash
curl -s localhost:3001/health
```

## Sending a webhook

The provider signs the raw request body with HMAC-SHA256 and sends the hex digest in the
`x-provider-signature` header. `scripts/send-webhook.mjs` does the same thing so you can
hit the endpoint locally:

```bash
npm run send:example
```

It takes overrides:

```bash
node scripts/send-webhook.mjs --event-id evt_demo_1 --amount 10000
node scripts/send-webhook.mjs --account 3f1c9b64-7c2a-4b3e-9a51-0d5f8b21c002 --amount 2500
```

## Inspecting the data

```bash
psql postgres://app:app@localhost:5433/payments -c 'select id, name, balance_cents from accounts'
psql postgres://app:app@localhost:5433/payments -c 'select * from transactions order by created_at desc limit 10'
```

To wipe and reseed the database: `npm run db:reset`.

## Configuration

| Variable | Default |
| --- | --- |
| `PORT` | `3001` |
| `DATABASE_URL` | `postgres://app:app@localhost:5433/payments` |
| `PROVIDER_WEBHOOK_SECRET` | `whsec_local_development_secret` |

## Layout

```
src/index.ts               express app, JSON body capture, health check
src/db.ts                  Postgres connection pool
src/routes/webhooks.ts     POST /webhooks/payments — signature check, validation, dispatch
src/services/payments.ts   applies a settlement: transactions + balance movements
db/                        schema and seed data, applied on first container start
```
