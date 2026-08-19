const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./config/db');
const operatorRoutes = require('./routes/operators');
const scheduleRoutes = require('./routes/schedules');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor/html2canvas', express.static(path.join(__dirname, 'node_modules', 'html2canvas', 'dist')));

app.get('/', (req, res) => {
  res.render('index', {
    appTitle: 'ALFACOM PRODUCTION',
    subAppName: 'Jadwal Operator & Rekap Penugasan',
  });
});

app.use('/api/operators', operatorRoutes);
app.use('/api/schedules', scheduleRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  db.getConnection((err, connection) => {
    if (err) {
      console.error('\n[DATABASE] Tidak dapat membuka SQLite.');
      console.error('Pastikan aplikasi memiliki izin menulis file jadwal.sqlite di folder proyek.');
      console.error(err.message);
      process.exit(1);
    }

    connection.release();
    app.listen(PORT, () => {
      console.log(`ALFACOM PRODUCTION - Jadwal berjalan di http://localhost:${PORT}`);
      console.log(`Database SQLite: ${db.dbPath}`);
    });
  });
}

module.exports = app;
