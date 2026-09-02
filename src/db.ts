import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5433/payments';

export const pool = new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export async function closePool(): Promise<void> {
  await pool.end();
}
