const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./config/db');
const operatorRoutes = require('./routes/operators');
const scheduleRoutes = require('./routes/schedules');

const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const viewsPath = [
  path.join(__dirname, 'views'),
  path.join(process.cwd(), 'views'),
  path.join(__dirname, '..', 'views')
].find((dir) => fs.existsSync(dir)) || path.join(process.cwd(), 'views');

const publicPath = [
  path.join(__dirname, 'public'),
  path.join(process.cwd(), 'public'),
  path.join(__dirname, '..', 'public')
].find((dir) => fs.existsSync(dir)) || path.join(process.cwd(), 'public');

app.set('view engine', 'ejs');
app.set('views', viewsPath);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(publicPath));

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
