const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

let dbPath = process.env.DB_FILE;
if (!dbPath) {
  if (process.env.VERCEL) {
    dbPath = path.join('/tmp', 'jadwal.sqlite');
    const localSeed = path.join(__dirname, '..', 'jadwal.sqlite');
    if (!fs.existsSync(dbPath) && fs.existsSync(localSeed)) {
      try {
        fs.copyFileSync(localSeed, dbPath);
      } catch (_) {}
    }
  } else {
    dbPath = path.join(__dirname, '..', 'jadwal.sqlite');
  }
}

const db = new sqlite3.Database(dbPath);

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

const initialized = new Promise((resolve, reject) => {
  db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON');

    db.run(`
    CREATE TABLE IF NOT EXISTS operators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL UNIQUE,
      nomor_wa TEXT NULL
    )
    `);

    db.run('ALTER TABLE operators ADD COLUMN nomor_wa TEXT NULL', [], (err) => {
      if (err && !/duplicate column name/i.test(err.message)) {
        reject(err);
      }

      db.run(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tanggal TEXT NOT NULL,
        keterangan_acara TEXT NOT NULL,
        estimasi_jam TEXT NOT NULL,
        operator_id INTEGER NULL,
        FOREIGN KEY (operator_id) REFERENCES operators(id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      )
      `);

      db.run('CREATE INDEX IF NOT EXISTS idx_schedules_tanggal ON schedules(tanggal)');
      db.run('CREATE INDEX IF NOT EXISTS idx_schedules_operator ON schedules(operator_id)');

      db.get('SELECT COUNT(*) AS total FROM schedules', (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.total > 0) {
          resolve();
          return;
        }

        const stmt = db.prepare(`
        INSERT INTO schedules (tanggal, keterangan_acara, estimasi_jam)
        VALUES (?, ?, ?)
        `);

        seedSchedules.forEach((schedule) => stmt.run(schedule));
        stmt.finalize((finalizeErr) => {
          if (finalizeErr) {
            reject(finalizeErr);
            return;
          }
          resolve();
        });
      });
    });
  });
});

function normalizeError(err) {
  if (err && err.code === 'SQLITE_CONSTRAINT') {
    err.code = 'ER_DUP_ENTRY';
  }
  return err;
}

function query(sql, params, callback) {
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  const trimmedSql = sql.trim();
  const command = trimmedSql.split(/\s+/, 1)[0].toUpperCase();

  if (command === 'SELECT') {
    return initialized.then(() => db.all(sql, params, (err, rows) => {
      callback(normalizeError(err), rows);
    }));
  }

  return initialized.then(() => db.run(sql, params, function runCallback(err) {
    callback(normalizeError(err), {
      insertId: this.lastID,
      affectedRows: this.changes,
    });
  }));
}

function getConnection(callback) {
  initialized.then(() => db.get('SELECT 1', (err) => {
    callback(normalizeError(err), {
      release() {},
    });
  })).catch(callback);
}

module.exports = {
  query,
  getConnection,
  dbPath,
};
