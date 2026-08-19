const express = require('express');
const db = require('../config/db');

const router = express.Router();

function normalizeWa(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

router.get('/', (req, res) => {
  db.query('SELECT id, nama, nomor_wa FROM operators ORDER BY id ASC', (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal mengambil data operator.' });
    }
    res.json(rows);
  });
});

router.post('/', (req, res) => {
  const nama = String(req.body.nama || '').trim();
  const nomorWa = normalizeWa(req.body.nomor_wa);

  if (!nama) {
    return res.status(400).json({ message: 'Nama operator wajib diisi.' });
  }

  if (nama.length > 100) {
    return res.status(400).json({ message: 'Nama operator maksimal 100 karakter.' });
  }

  if (nomorWa && (nomorWa.length < 8 || nomorWa.length > 16)) {
    return res.status(400).json({ message: 'Nomor WA harus 8 sampai 16 digit.' });
  }

  db.query('INSERT INTO operators (nama, nomor_wa) VALUES (?, ?)', [nama, nomorWa || null], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Nama operator sudah terdaftar.' });
      }
      console.error(err);
      return res.status(500).json({ message: 'Gagal menambahkan operator.' });
    }

    res.status(201).json({ id: result.insertId, nama, nomor_wa: nomorWa || null, message: 'Operator berhasil ditambahkan.' });
  });
});

router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const nama = String(req.body.nama || '').trim();
  const nomorWa = normalizeWa(req.body.nomor_wa);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'ID operator tidak valid.' });
  }

  if (!nama) {
    return res.status(400).json({ message: 'Nama operator wajib diisi.' });
  }

  if (nama.length > 100) {
    return res.status(400).json({ message: 'Nama operator maksimal 100 karakter.' });
  }

  if (nomorWa && (nomorWa.length < 8 || nomorWa.length > 16)) {
    return res.status(400).json({ message: 'Nomor WA harus 8 sampai 16 digit.' });
  }

  db.query('SELECT id FROM operators WHERE id = ?', [id], (findErr, rows) => {
    if (findErr) {
      console.error(findErr);
      return res.status(500).json({ message: 'Gagal mengubah operator.' });
    }

    if (!rows.length) {
      return res.status(404).json({ message: 'Operator tidak ditemukan.' });
    }

    db.query('UPDATE operators SET nama = ?, nomor_wa = ? WHERE id = ?', [nama, nomorWa || null, id], (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Nama operator sudah terdaftar.' });
        }
        console.error(err);
        return res.status(500).json({ message: 'Gagal mengubah operator.' });
      }

      res.json({ id, nama, nomor_wa: nomorWa || null, message: 'Operator berhasil diperbarui.' });
    });
  });
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'ID operator tidak valid.' });
  }

  db.query('DELETE FROM operators WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Gagal menghapus operator.' });
    }

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Operator tidak ditemukan.' });
    }

    res.json({ message: 'Operator berhasil dihapus.' });
  });
});

module.exports = router;
