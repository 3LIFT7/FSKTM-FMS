const path = require('path');
const fs = require('fs');

let dbClient = null;
let isPgPool = false;

async function getDb() {
  if (dbClient) return dbClient;

  // If external PostgreSQL credentials are provided, use node-postgres (pg)
  if (process.env.DATABASE_URL || process.env.PGHOST) {
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        host: process.env.PGHOST,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
      });

      // Test connection
      await pool.query('SELECT 1');
      console.log('Connected to PostgreSQL server via pg.Pool');
      isPgPool = true;
      dbClient = pool;
      return dbClient;
    } catch (err) {
      console.warn('External PostgreSQL connection failed, falling back to embedded PGlite:', err.message);
    }
  }

  // Fallback to embedded persistent PGlite (Postgres 16 in Node)
  const { PGlite } = require('@electric-sql/pglite');
  const dataDir = path.join(__dirname, '..', '..', 'data', 'pgdata');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  } else {
    // Remove stale lock files from unexpected terminations
    const pidFile = path.join(dataDir, 'postmaster.pid');
    const lockFile = path.join(dataDir, '.s.PGSQL.5432.lock.out');
    try {
      if (fs.existsSync(pidFile)) fs.unlinkSync(pidFile);
      if (fs.existsSync(lockFile)) fs.unlinkSync(lockFile);
    } catch (_) {}
  }

  const pglite = new PGlite(dataDir);
  await pglite.waitReady;
  console.log(`Connected to persistent PostgreSQL (PGlite) at: ${dataDir}`);
  isPgPool = false;
  dbClient = pglite;
  return dbClient;
}

async function query(sql, params = []) {
  const db = await getDb();
  if (isPgPool) {
    const res = await db.query(sql, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount,
    };
  } else {
    // PGlite interface
    const res = await db.query(sql, params);
    return {
      rows: res.rows,
      rowCount: res.affectedRows !== undefined ? res.affectedRows : (res.rows ? res.rows.length : 0),
    };
  }
}

async function exec(sql) {
  const db = await getDb();
  if (isPgPool) {
    await db.query(sql);
  } else {
    await db.exec(sql);
  }
}

module.exports = {
  getDb,
  query,
  exec,
};
