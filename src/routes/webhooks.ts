import { createHmac, timingSafeEqual } from 'node:crypto';

import { Router, type Request } from 'express';
import { z } from 'zod';

import { pool } from '../db';
import { logger } from '../logger';
import { applySettlement, SettlementError } from '../services/payments';

const SIGNATURE_HEADER = 'x-provider-signature';

const webhookSecret = process.env.PROVIDER_WEBHOOK_SECRET ?? 'whsec_local_development_secret';

export interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

const webhookEventSchema = z.object({
  id: z.string().min(1),
  type: z.literal('settlement.completed'),
  created_at: z.string().datetime(),
  data: z.object({
    settlement_id: z.string().min(1),
    currency: z.string().length(3),
    items: z
      .array(
        z.object({
          account_id: z.string().uuid(),
          reference: z.string().min(1),
          amount_cents: z.number().int(),
        }),
      )
      .min(1),
  }),
});

export type WebhookEvent = z.infer<typeof webhookEventSchema>;

function hasValidSignature(rawBody: Buffer, header: string | undefined): boolean {
  if (!header) {
    return false;
  }
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const provided = Buffer.from(header, 'utf8');
  const digest = Buffer.from(expected, 'utf8');
  if (provided.length !== digest.length) {
    return false;
  }
  return timingSafeEqual(provided, digest);
}

async function alreadyProcessed(eventId: string): Promise<boolean> {
  const { rowCount } = await pool.query('select 1 from processed_events where event_id = $1', [
    eventId,
  ]);
  return rowCount !== null && rowCount > 0;
}

async function markProcessed(event: WebhookEvent): Promise<void> {
  await pool.query(
    'insert into processed_events (event_id, event_type, payload) values ($1, $2, $3)',
    [event.id, event.type, event],
  );
}

async function recordAudit(eventId: string, outcome: string): Promise<void> {
  await pool.query('insert into webhook_audit (event_id, outcome) values ($1, $2)', [
    eventId,
    outcome,
  ]);
}

export const webhooksRouter = Router();

webhooksRouter.post('/payments', async (req, res) => {
  const rawBody = (req as RawBodyRequest).rawBody;
  if (!rawBody || !hasValidSignature(rawBody, req.header(SIGNATURE_HEADER))) {
    logger.warn('rejected webhook with invalid signature');
    res.status(401).json({ error: 'invalid_signature' });
    return;
  }

  const parsed = webhookEventSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.warn('rejected malformed webhook', { issues: parsed.error.issues });
    res.status(400).json({ error: 'invalid_payload' });
    return;
  }

  const event = parsed.data;

  try {
    if (await alreadyProcessed(event.id)) {
      logger.info('ignoring duplicate delivery', { eventId: event.id });
      res.status(200).json({ status: 'duplicate' });
      return;
    }

    const result = await applySettlement(event);
    await markProcessed(event);

    recordAudit(event.id, 'applied');

    res.status(200).json({ status: 'applied', ...result });
  } catch (err) {
    if (err instanceof SettlementError) {
      logger.warn('rejected settlement', { eventId: event.id, code: err.code });
      res.status(422).json({ error: err.code });
      return;
    }
    logger.error('failed to process webhook', {
      eventId: event.id,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'processing_failed' });
  }
});
