const { Pool } = require('pg');
const env = require('./env');

let pool;

if (process.env.USE_PG_MEM === 'true') {
  // In-memory PostgreSQL instance for local automated tests and zero-dependency testing
  const { newDb } = require('pg-mem');
  const fs = require('fs');
  const path = require('path');
  const memDb = newDb();

  // Execute migrations
  try {
    const mig1 = fs.readFileSync(path.resolve(__dirname, '../../../database/migrations/001_initial_schema.sql'), 'utf-8');
    const mig2 = fs.readFileSync(path.resolve(__dirname, '../../../database/migrations/002_password_reset.sql'), 'utf-8');
    memDb.public.none(mig1);
    memDb.public.none(mig2);
  } catch (err) {
    console.error('[pg-mem] Migration loading failed:', err.message);
  }

  const pgAdapter = memDb.adapters.createPg();
  pool = new pgAdapter.Pool();
} else {
  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('[PostgreSQL] Unexpected error on idle client:', err.message);
  });
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
