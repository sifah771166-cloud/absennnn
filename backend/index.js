// backend/index.js - Cloudflare Worker + D1

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers agar frontend bisa akses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Inisialisasi database D1
    const db = env.DB;

    // GET semua absensi
    if (path === '/api/absensi' && request.method === 'GET') {
      const { results } = await db.prepare(
        `SELECT id, name, jurusan, kelas, check_in_time FROM absensi ORDER BY check_in_time DESC`
      ).all();
      return Response.json(results, { headers: corsHeaders });
    }

    // POST absen harian (cek duplikat per hari)
    if (path === '/api/absen' && request.method === 'POST') {
      const { name, jurusan, kelas } = await request.json();
      if (!name || !jurusan || !kelas) {
        return Response.json({ error: 'Lengkapi data' }, { status: 400, headers: corsHeaders });
      }
      // Cek duplikat
      const cek = await db.prepare(
        `SELECT id FROM absensi WHERE name = ? AND DATE(check_in_time) = DATE('now', 'localtime')`
      ).bind(name).first();
      if (cek) {
        return Response.json({ error: 'Anda sudah absen hari ini' }, { status: 400, headers: corsHeaders });
      }
      // Insert
      const result = await db.prepare(
        `INSERT INTO absensi (name, jurusan, kelas, check_in_time) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
      ).bind(name, jurusan, kelas).run();
      return Response.json({ success: true, id: result.meta.last_row_id, message: 'Absen berhasil' }, { headers: corsHeaders });
    }

    // POST admin tambah manual
    if (path === '/api/admin/absen' && request.method === 'POST') {
      const { name, jurusan, kelas, check_in_time } = await request.json();
      let timeValue = check_in_time ? new Date(check_in_time).toISOString() : new Date().toISOString();
      await db.prepare(
        `INSERT INTO absensi (name, jurusan, kelas, check_in_time) VALUES (?, ?, ?, ?)`
      ).bind(name, jurusan, kelas, timeValue).run();
      return Response.json({ success: true, message: 'Data ditambahkan' }, { headers: corsHeaders });
    }

    // PUT update data
    if (path.startsWith('/api/absen/') && request.method === 'PUT') {
      const id = path.split('/').pop();
      const { name, jurusan, kelas, check_in_time } = await request.json();
      let timeValue = check_in_time ? new Date(check_in_time).toISOString() : new Date().toISOString();
      const result = await db.prepare(
        `UPDATE absensi SET name = ?, jurusan = ?, kelas = ?, check_in_time = ? WHERE id = ?`
      ).bind(name, jurusan, kelas, timeValue, id).run();
      if (result.meta.changes === 0) {
        return Response.json({ error: 'Data tidak ditemukan' }, { status: 404, headers: corsHeaders });
      }
      return Response.json({ success: true, message: 'Data diupdate' }, { headers: corsHeaders });
    }

    // DELETE data
    if (path.startsWith('/api/absen/') && request.method === 'DELETE') {
      const id = path.split('/').pop();
      const result = await db.prepare(`DELETE FROM absensi WHERE id = ?`).bind(id).run();
      if (result.meta.changes === 0) {
        return Response.json({ error: 'Data tidak ditemukan' }, { status: 404, headers: corsHeaders });
      }
      return Response.json({ success: true, message: 'Data dihapus' }, { headers: corsHeaders });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};