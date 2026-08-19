const express = require('express');
const db = require('../config/db');

const router = express.Router();

const baseSelect = `
  SELECT
    s.id,
    s.tanggal AS tanggal,
    s.keterangan_acara,
    s.estimasi_jam,
    s.operator_id,
    o.nama AS operator_nama
  FROM schedules s
  LEFT JOIN operators o ON o.id = s.operator_id
`;

router.get('/', (req, res) => {
  const { month, unassigned } = req.query;
  const filters = [];
  const params = [];

  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Format bulan harus YYYY-MM.' });
    }
    filters.push("strftime('%Y-%m', s.tanggal) = ?");
    params.push(month);
  }

  if (unassigned === 'true') {
    filters.push('s.operator_id IS NULL');
  }

  const where = filters.length ? ` WHERE ${filters.join(' AND ')}` : '';
  const sql = `${baseSelect}${where} ORDER BY s.tanggal ASC, s.id ASC`;

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal mengambil data jadwal.' });
    }
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const tanggal = String(req.body.tanggal || '').trim();
  const keterangan = String(req.body.keterangan_acara || '').trim();
  const estimasi = String(req.body.estimasi_jam || '').trim().toUpperCase();
  const operatorId = req.body.operator_id ? Number(req.body.operator_id) : null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || !keterangan || !estimasi) {
    return res.status(400).json({ message: 'Tanggal, keterangan acara, dan estimasi jam wajib diisi.' });
  }

  if (operatorId !== null && (!Number.isInteger(operatorId) || operatorId <= 0)) {
    return res.status(400).json({ message: 'Operator tidak valid.' });
  }

  const sql = `
    INSERT INTO schedules (tanggal, keterangan_acara, estimasi_jam, operator_id)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [tanggal, keterangan, estimasi, operatorId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal menyimpan jadwal.' });
    }

    res.status(201).json({ id: result.insertId, message: 'Jadwal berhasil disimpan.' });
  });
});

router.patch('/:id/operator', (req, res) => {
  const id = Number(req.params.id);
  const operatorId = req.body.operator_id ? Number(req.body.operator_id) : null;

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'ID jadwal tidak valid.' });
  }

  if (operatorId !== null && (!Number.isInteger(operatorId) || operatorId <= 0)) {
    return res.status(400).json({ message: 'Operator tidak valid.' });
  }

  db.query('UPDATE schedules SET operator_id = ? WHERE id = ?', [operatorId, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal memperbarui operator.' });
    }

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Jadwal tidak ditemukan.' });
    }

    res.json({ message: operatorId ? 'Operator berhasil ditugaskan.' : 'Penugasan operator dikosongkan.' });
  });
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const tanggal = String(req.body.tanggal || '').trim();
  const keterangan = String(req.body.keterangan_acara || '').trim();
  const estimasi = String(req.body.estimasi_jam || '').trim().toUpperCase();
  const operatorId = req.body.operator_id ? Number(req.body.operator_id) : null;

  if (!Number.isInteger(id) || id <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || !keterangan || !estimasi) {
    return res.status(400).json({ message: 'Data jadwal tidak valid.' });
  }

  const sql = `
    UPDATE schedules
    SET tanggal = ?, keterangan_acara = ?, estimasi_jam = ?, operator_id = ?
    WHERE id = ?
  `;

  db.query(sql, [tanggal, keterangan, estimasi, operatorId, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal mengubah jadwal.' });
    }

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Jadwal tidak ditemukan.' });
    }

    res.json({ message: 'Jadwal berhasil diperbarui.' });
  });
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'ID jadwal tidak valid.' });
  }

  db.query('DELETE FROM schedules WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal menghapus jadwal.' });
    }

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Jadwal tidak ditemukan.' });
    }

    res.json({ message: 'Jadwal berhasil dihapus.' });
  });
});

module.exports = router;
