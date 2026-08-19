const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js/dist/sql-asm.js');

let dbPath = process.env.DB_FILE;
if (!dbPath) {
  if (process.env.VERCEL) {
    dbPath = path.join('/tmp', 'jadwal.sqlite');
    const localSeed = [
      path.join(__dirname, '..', 'jadwal.sqlite'),
      path.join(process.cwd(), 'jadwal.sqlite'),
      path.join(__dirname, 'jadwal.sqlite')
    ].find((p) => fs.existsSync(p));

    if (!fs.existsSync(dbPath) && localSeed) {
      try {
        fs.copyFileSync(localSeed, dbPath);
      } catch (_) {}
    }
  } else {
    dbPath = path.join(__dirname, '..', 'jadwal.sqlite');
  }
}

const seedSchedules = [
  ['2026-08-22', '4x2m mas fadil dp500', 'Malam'],
  ['2026-08-22', 'dnil 6m day1', 'Pagi-Malam'],
  ['2026-08-22', '2x3m prigi day2', 'TBD'],
  ['2026-08-23', 'HW SOUND', 'TBD'],
  ['2026-08-23', 'dnil 6m day2', 'TBD'],
  ['2026-08-23', '2x3m prigi day3', 'TBD'],
  ['2026-08-23', 'tv mbk kiki 4unit', 'TBD'],
  ['2026-08-23', 'plosoklaten 4*2m kabol', 'TBD'],
  ['2026-08-24', 'dnill 16m', 'Sore-Malam'],
  ['2026-08-24', '4x2m lapangan karangan', 'Malam'],
  ['2026-08-24', 'nabil 8m', 'Malam'],
  ['2026-08-26', 'boyolangu PGRI 2*4m', 'Pagi'],
  ['2026-08-29', 'an lighting 3m', 'TBD'],
  ['2026-08-29', '15m day1', 'TBD'],
  ['2026-08-29', '8m kec tugu na', 'TBD'],
  ['2026-08-30', 'trone 10m', 'Pagi'],
  ['2026-08-30', 'rigging 6*4m dp 500', 'TBD'],
  ['2026-08-30', '15m day2', 'Pagi-Malam'],
  ['2026-08-30', 'pak man 24m', 'TBD'],
];

let dbInstance = null;

function saveDbToFile() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('[DATABASE] Gagal menyimpan ke file:', err.message);
  }
}

const initialized = (async () => {
  const SQL = await initSqlJs();
  let buffer = null;
  if (fs.existsSync(dbPath)) {
    try {
      buffer = fs.readFileSync(dbPath);
    } catch (_) {}
  }

  dbInstance = buffer ? new SQL.Database(buffer) : new SQL.Database();
  dbInstance.run('PRAGMA foreign_keys = ON;');

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS operators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL UNIQUE,
      nomor_wa TEXT NULL
    );
  `);

  try {
    dbInstance.run('ALTER TABLE operators ADD COLUMN nomor_wa TEXT NULL;');
  } catch (_) {}

  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal TEXT NOT NULL,
      keterangan_acara TEXT NOT NULL,
      estimasi_jam TEXT NOT NULL,
      operator_id INTEGER NULL,
      FOREIGN KEY (operator_id) REFERENCES operators(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
    );
  `);

  dbInstance.run('CREATE INDEX IF NOT EXISTS idx_schedules_tanggal ON schedules(tanggal);');
  dbInstance.run('CREATE INDEX IF NOT EXISTS idx_schedules_operator ON schedules(operator_id);');

  const countRes = dbInstance.exec('SELECT COUNT(*) AS total FROM schedules');
  const total = countRes.length && countRes[0].values.length ? countRes[0].values[0][0] : 0;

  if (total === 0) {
    const stmt = dbInstance.prepare(`
      INSERT INTO schedules (tanggal, keterangan_acara, estimasi_jam)
      VALUES (?, ?, ?)
    `);
    seedSchedules.forEach((row) => {
      stmt.run(row);
    });
    stmt.free();
  }

  saveDbToFile();
  return dbInstance;
})();

function normalizeError(err) {
  if (!err) return null;
  const msg = String(err.message || err);
  if (/unique|constraint/i.test(msg)) {
    const normalized = new Error(msg);
    normalized.code = 'ER_DUP_ENTRY';
    return normalized;
  }
  return err instanceof Error ? err : new Error(msg);
}

function query(sql, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }
  if (typeof callback !== 'function') {
    callback = () => {};
  }

  initialized.then((db) => {
    try {
      const trimmedSql = sql.trim();
      const command = trimmedSql.split(/\s+/, 1)[0].toUpperCase();

      if (command === 'SELECT') {
        const stmt = db.prepare(trimmedSql);
        if (params && params.length) {
          stmt.bind(params);
        }
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return callback(null, rows);
      }

      // INSERT, UPDATE, DELETE
      db.run(trimmedSql, params);
      const changesRes = db.exec('SELECT changes() AS affected, last_insert_rowid() AS id');
      const affectedRows = changesRes[0]?.values[0]?.[0] ?? 0;
      const insertId = changesRes[0]?.values[0]?.[1] ?? 0;

      saveDbToFile();

      callback(null, {
        insertId,
        affectedRows,
      });
    } catch (err) {
      callback(normalizeError(err));
    }
  }).catch((initErr) => {
    callback(normalizeError(initErr));
  });
}

function getConnection(callback) {
  initialized.then(() => {
    callback(null, {
      release() {},
    });
  }).catch(callback);
}

module.exports = {
  query,
  getConnection,
  dbPath,
};
