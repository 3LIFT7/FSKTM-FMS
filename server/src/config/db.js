const path = require('path');
const fs = require('fs');

let dbClient = null;
let isPgPool = false;
let initPromise = null;
let txMutex = Promise.resolve();

function isProcessAlive(pid) {
  if (!pid || isNaN(pid) || pid <= 0) return false;
  if (pid === process.pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

function cleanStalePgliteLocks(dataDir) {
  const pidFile = path.join(dataDir, 'postmaster.pid');
  const lockFile = path.join(dataDir, '.s.PGSQL.5432.lock.out');
  if (!fs.existsSync(pidFile)) return;

  try {
    const content = fs.readFileSync(pidFile, 'utf-8');
    const firstLine = (content.split(/\r?\n/)[0] || '').trim();
    const lockPid = parseInt(firstLine, 10);

    if (lockPid && isProcessAlive(lockPid)) {
      throw new Error(
        `Database directory ${dataDir} is currently locked by active process PID ${lockPid}. Refusing to remove active lock file.`
      );
    }

    fs.unlinkSync(pidFile);
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  } catch (err) {
    if (err.message && err.message.includes('currently locked by active process')) {
      throw err;
    }
  }
}

async function initDb() {
  const hasExternalPg = Boolean(process.env.DATABASE_URL || process.env.PGHOST);
  const isProduction = process.env.NODE_ENV === 'production';

  if (hasExternalPg && process.env.PGLITE_DATA_DIR !== 'memory://') {
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

      await pool.query('SELECT 1');
      console.log('Connected to PostgreSQL server via pg.Pool');
      isPgPool = true;
      dbClient = pool;
      return dbClient;
    } catch (err) {
      if (isProduction || process.env.STRICT_PG === 'true') {
        throw new Error(`Critical: Failed to connect to configured PostgreSQL database in production: ${err.message}`);
      }
      console.warn('External PostgreSQL connection failed in non-production, falling back to embedded PGlite:', err.message);
    }
  }

  const { PGlite } = require('@electric-sql/pglite');
  const customDir = process.env.PGLITE_DATA_DIR;

  if (customDir === 'memory://') {
    const pglite = new PGlite();
    await pglite.waitReady;
    isPgPool = false;
    dbClient = pglite;
    return dbClient;
  }

  const dataDir = customDir
    ? path.resolve(customDir)
    : path.join(__dirname, '..', '..', 'data', 'pgdata');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  } else {
    cleanStalePgliteLocks(dataDir);
  }

  const pglite = new PGlite(dataDir);
  await pglite.waitReady;
  console.log(`Connected to persistent PostgreSQL (PGlite) at: ${dataDir}`);
  isPgPool = false;
  dbClient = pglite;
  return dbClient;
}

async function getDb() {
  if (dbClient) return dbClient;
  if (!initPromise) {
    initPromise = initDb().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

function normalizeResult(res) {
  return {
    rows: res.rows || [],
    rowCount:
      res.rowCount !== undefined && res.rowCount !== null
        ? res.rowCount
        : res.affectedRows !== undefined
        ? res.affectedRows
        : res.rows
        ? res.rows.length
        : 0,
  };
}

async function query(sql, params = []) {
  const db = await getDb();
  const res = await db.query(sql, params);
  return normalizeResult(res);
}

async function exec(sql) {
  const db = await getDb();
  if (isPgPool) {
    await db.query(sql);
  } else {
    await db.exec(sql);
  }
}

/**
 * Executes a callback inside an atomic SQL transaction (BEGIN ... COMMIT / ROLLBACK).
 * Serializes transactions on single-connection PGlite to prevent interleaved BEGIN/COMMIT
 * across concurrent requests, and uses a dedicated PoolClient on pg.Pool.
 */
async function withTransaction(fn) {
  const db = await getDb();

  if (isPgPool) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const tx = {
        query: async (sql, params = []) => normalizeResult(await client.query(sql, params)),
        exec: async (sql) => {
          await client.query(sql);
        },
      };
      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }

  // PGlite single-connection serialized transaction
  let releaseLock;
  const prevLock = txMutex;
  txMutex = new Promise((resolve) => {
    releaseLock = resolve;
  });

  await prevLock;
  try {
    await db.exec('BEGIN');
    const tx = {
      query: async (sql, params = []) => normalizeResult(await db.query(sql, params)),
      exec: async (sql) => {
        await db.exec(sql);
      },
    };
    const result = await fn(tx);
    await db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      await db.exec('ROLLBACK');
    } catch (_) {}
    throw err;
  } finally {
    releaseLock();
  }
}

async function closeDb() {
  if (!dbClient) return;
  try {
    if (isPgPool && typeof dbClient.end === 'function') {
      await dbClient.end();
    } else if (typeof dbClient.close === 'function') {
      await dbClient.close();
    }
  } finally {
    dbClient = null;
    initPromise = null;
  }
}

module.exports = {
  getDb,
  query,
  exec,
  withTransaction,
  closeDb,
};
