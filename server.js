const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

const db = new sqlite3.Database('./database.sqlite');

// Tabel absensi
db.run(`
  CREATE TABLE IF NOT EXISTS absensi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    jurusan TEXT NOT NULL,
    kelas TEXT NOT NULL,
    check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// GET semua data
app.get('/api/absensi', (req, res) => {
  db.all(`SELECT id, name, jurusan, kelas, check_in_time FROM absensi ORDER BY check_in_time DESC`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST absen biasa (dengan cek duplikat per hari)
app.post('/api/absen', (req, res) => {
  const { name, jurusan, kelas } = req.body;
  if (!name || !jurusan || !kelas) {
    return res.status(400).json({ error: 'Semua field harus diisi' });
  }
  const cek = `SELECT id FROM absensi WHERE name = ? AND DATE(check_in_time) = DATE('now', 'localtime')`;
  db.get(cek, [name.trim()], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: 'Sudah absen hari ini!' });
    db.run(`INSERT INTO absensi (name, jurusan, kelas) VALUES (?, ?, ?)`, [name.trim(), jurusan, kelas], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID, message: 'Absen berhasil!' });
    });
  });
});

// === CRUD untuk admin (tambah, edit, hapus) ===

// POST tambah manual (tanpa cek duplikat)
app.post('/api/admin/absen', (req, res) => {
  const { name, jurusan, kelas, check_in_time } = req.body;
  if (!name || !jurusan || !kelas) {
    return res.status(400).json({ error: 'Nama, jurusan, kelas wajib diisi' });
  }
  let timeValue = check_in_time ? new Date(check_in_time).toISOString() : new Date().toISOString();
  db.run(`INSERT INTO absensi (name, jurusan, kelas, check_in_time) VALUES (?, ?, ?, ?)`,
    [name.trim(), jurusan, kelas, timeValue],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID, message: 'Data berhasil ditambahkan' });
    });
});

// PUT update data berdasarkan id
app.put('/api/absen/:id', (req, res) => {
  const { id } = req.params;
  const { name, jurusan, kelas, check_in_time } = req.body;
  if (!name || !jurusan || !kelas) {
    return res.status(400).json({ error: 'Nama, jurusan, kelas wajib diisi' });
  }
  let timeValue = check_in_time ? new Date(check_in_time).toISOString() : new Date().toISOString();
  db.run(`UPDATE absensi SET name = ?, jurusan = ?, kelas = ?, check_in_time = ? WHERE id = ?`,
    [name.trim(), jurusan, kelas, timeValue, id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Data tidak ditemukan' });
      res.json({ success: true, message: 'Data berhasil diupdate' });
    });
});

// DELETE hapus data berdasarkan id
app.delete('/api/absen/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM absensi WHERE id = ?`, id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Data tidak ditemukan' });
    res.json({ success: true, message: 'Data berhasil dihapus' });
  });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});