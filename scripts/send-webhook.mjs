// Dev helper: signs and posts an example provider webhook at the local service.
//   node scripts/send-webhook.mjs [--event-id evt_x] [--amount 5000] [--account <uuid>]
import { createHmac } from 'node:crypto';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i].replace(/^--/, ''), process.argv[i + 1]);
}

const secret = process.env.PROVIDER_WEBHOOK_SECRET ?? 'whsec_local_development_secret';
const url = process.env.WEBHOOK_URL ?? 'http://localhost:3001/webhooks/payments';

const event = {
  id: args.get('event-id') ?? `evt_${Date.now()}`,
  type: 'settlement.completed',
  created_at: new Date().toISOString(),
  data: {
    settlement_id: args.get('settlement-id') ?? 'stl_2024_12_09_a',
    currency: 'USD',
    items: [
      {
        account_id: args.get('account') ?? '3f1c9b64-7c2a-4b3e-9a51-0d5f8b21c001',
        reference: `ch_${Math.random().toString(16).slice(2, 9)}`,
        amount_cents: Number(args.get('amount') ?? 5000),
      },
      {
        account_id: '3f1c9b64-7c2a-4b3e-9a51-0d5f8b21c002',
        reference: `ch_${Math.random().toString(16).slice(2, 9)}`,
        amount_cents: 2500,
      },
      {
        account_id: '3f1c9b64-7c2a-4b3e-9a51-0d5f8b21c003',
        reference: `ch_${Math.random().toString(16).slice(2, 9)}`,
        amount_cents: 1750,
      },
    ],
  },
};

const body = JSON.stringify(event);
const signature = createHmac('sha256', secret).update(body).digest('hex');

const res = await fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-provider-signature': signature },
  body,
});

console.log(res.status, await res.text());
