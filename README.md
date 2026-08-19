# ALFACOM PRODUCTION — Jadwal Operator & Rekap Penugasan

Aplikasi web lokal untuk mengelola daftar operator, mengisi jadwal penugasan, melakukan assignment operator, melihat rekap per bulan, dan mengekspor rekap sebagai JPG.

## Stack

- Backend: Node.js + Express.js
- Database: SQLite
- Frontend: EJS/HTML5 + CSS3 + Vanilla JavaScript
- Export JPG: html2canvas (dipasang melalui npm dan disajikan lokal oleh Express)

## Struktur Folder

```text
alfacom-production-jadwal/
├── config/
│   └── db.js
├── public/
│   ├── assets/
│   │   └── logo.png
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
├── routes/
│   ├── operators.js
│   └── schedules.js
├── views/
│   └── index.ejs
├── package.json
└── server.js
```

## 1. Persiapan

Pastikan sudah terpasang:

- Node.js 18+ disarankan
- npm

## 2. Install Dependency

Buka terminal pada folder project, lalu jalankan:

```bash
npm install
```

Dependency yang akan terpasang:

```bash
npm install express sqlite3 body-parser ejs html2canvas
```

## 3. Database SQLite

Aplikasi akan membuat database SQLite otomatis saat pertama kali dijalankan.

File database default:

```text
jadwal.sqlite
```

Tabel dan data contoh jadwal Agustus 2026 dibuat otomatis jika database masih kosong.

## 4. Konfigurasi SQLite

Secara default aplikasi menyimpan database di folder proyek. Jika ingin memakai lokasi file lain, gunakan environment variable:

```text
DB_FILE
PORT
```

Contoh PowerShell Windows:

```powershell
$env:DB_FILE="D:\app\alfacom-production-jadwal\jadwal.sqlite"
npm start
```

## 5. Jalankan Aplikasi

```bash
npm start
```

Jika koneksi database berhasil, terminal akan menampilkan:

```text
ALFACOM PRODUCTION - Jadwal berjalan di http://localhost:3000
```

Buka browser:

```text
http://localhost:3000
```

## Fitur

1. **Dashboard** — ringkasan jumlah operator, jadwal bulan berjalan, dan jadwal yang belum assigned.
2. **List Operator** — tambah, lihat, dan hapus operator.
3. **Isi Jadwal** — tambah jadwal baru dan assign operator ke jadwal yang masih kosong.
4. **Rekap Jadwal** — filter per bulan, edit/hapus jadwal, serta export rekap ke JPG.
5. **Local export** — library `html2canvas` berasal dari package npm lokal, sehingga setelah dependency terinstall tidak perlu CDN untuk fitur export.

## Catatan Data Seed

Data contoh Agustus 2026 dibuat tanpa `operator_id`, sehingga setelah menambahkan operator Anda dapat membuka menu **Isi Jadwal → Jadwal Belum Assigned** untuk menentukan petugas.

## Jika Port 3000 Sudah Dipakai

Gunakan port lain melalui environment variable.

PowerShell:

```powershell
$env:PORT="3001"
npm start
```

Lalu buka `http://localhost:3001`.
