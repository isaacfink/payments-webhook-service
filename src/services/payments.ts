import type { PoolClient } from 'pg';

import { pool } from '../db';
import { logger } from '../logger';
import type { WebhookEvent } from '../routes/webhooks';

export class SettlementError extends Error {
  constructor(
    message: string,
    readonly code: 'unknown_account' | 'currency_mismatch',
  ) {
    super(message);
    this.name = 'SettlementError';
  }
}

export interface SettlementResult {
  settlementId: string;
  itemsApplied: number;
}

interface AccountRow {
  id: string;
  currency: string;
  balance_cents: string;
}

async function loadAccount(client: PoolClient, accountId: string): Promise<AccountRow | undefined> {
  const { rows } = await client.query<AccountRow>(
    'select id, currency, balance_cents from accounts where id = $1',
    [accountId],
  );
  return rows[0];
}

/**
 * Applies every line item on a settlement event: one transaction row per item,
 * and the account balance moved by the same amount. All or nothing.
 */
export async function applySettlement(event: WebhookEvent): Promise<SettlementResult> {
  const { settlement_id: settlementId, currency, items } = event.data;

  const client = await pool.connect();
  try {
    await client.query('begin');

    const accounts = new Map<string, AccountRow>();
    for (const item of items) {
      const account = await loadAccount(client, item.account_id);
      if (!account) {
        throw new SettlementError(`account ${item.account_id} does not exist`, 'unknown_account');
      }
      accounts.set(account.id, account);
    }

    for (const item of items) {
      const account = accounts.get(item.account_id);
      if (!account) {
        throw new SettlementError(`account ${item.account_id} does not exist`, 'unknown_account');
      }
      if (account.currency !== currency) {
        throw new SettlementError(
          `settlement is in ${currency} but account ${account.id} is in ${account.currency}`,
          'currency_mismatch',
        );
      }

      await client.query(
        `insert into transactions (account_id, settlement_id, reference, amount_cents)
         values ($1, $2, $3, $4)`,
        [account.id, settlementId, item.reference, item.amount_cents],
      );

      const nextBalance = Number(account.balance_cents) + item.amount_cents;
      await client.query(
        'update accounts set balance_cents = $1, updated_at = now() where id = $2',
        [nextBalance, account.id],
      );
    }

    await client.query('commit');
    logger.info('settlement applied', { settlementId, itemCount: items.length });

    return { settlementId, itemsApplied: items.length };
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}
