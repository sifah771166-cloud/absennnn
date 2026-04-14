const API_URL = '/api';

// DOM elements
const nameInput = document.getElementById('nameInput');
const jurusanSelect = document.getElementById('jurusanSelect');
const kelasSelect = document.getElementById('kelasSelect');
const absenBtn = document.getElementById('absenBtn');
const messageDiv = document.getElementById('message');
const absensiBody = document.getElementById('absensiBody');
const refreshBtn = document.getElementById('refreshBtn');
const currentDateSpan = document.getElementById('currentDate');
const filterJurusan = document.getElementById('filterJurusan');
const filterKelas = document.getElementById('filterKelas');

// Modal elements
const modal = document.getElementById('dataModal');
const closeModal = document.querySelector('.close');
const openAddModalBtn = document.getElementById('openAddModalBtn');
const modalTitle = document.getElementById('modalTitle');
const editId = document.getElementById('editId');
const modalName = document.getElementById('modalName');
const modalJurusan = document.getElementById('modalJurusan');
const modalKelas = document.getElementById('modalKelas');
const modalTime = document.getElementById('modalTime');
const modalSaveBtn = document.getElementById('modalSaveBtn');

let allAbsensiData = [];

// Helper functions
function updateDate() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  currentDateSpan.textContent = now.toLocaleDateString('id-ID', options);
}

function showMessage(text, type = 'success') {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  setTimeout(() => {
    messageDiv.style.display = 'none';
    messageDiv.className = 'message';
  }, 3000);
}

function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('id-ID', {
    day: 'numeric', month: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Render tabel dengan aksi Edit/Hapus
function renderTable() {
  const jurusanFilter = filterJurusan.value;
  const kelasFilter = filterKelas.value;
  let filtered = allAbsensiData;
  if (jurusanFilter !== 'all') filtered = filtered.filter(item => item.jurusan === jurusanFilter);
  if (kelasFilter !== 'all') filtered = filtered.filter(item => item.kelas === kelasFilter);

  if (filtered.length === 0) {
    absensiBody.innerHTML = '<tr><td colspan="5">📭 Tidak ada data sesuai filter</td></tr>';
    return;
  }
  absensiBody.innerHTML = filtered.map(item => `
    <tr data-id="${item.id}">
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td>${escapeHtml(item.jurusan)}</td>
      <td>${escapeHtml(item.kelas)}</td>
      <td>🕒 ${formatDateTime(item.check_in_time)}</td>
      <td class="action-buttons">
        <button class="btn-edit" data-id="${item.id}"><i class="fas fa-edit"></i></button>
        <button class="btn-delete" data-id="${item.id}"><i class="fas fa-trash-alt"></i></button>
      </td>
    </tr>
  `).join('');
}

// Load data dari server
async function loadAbsensi() {
  try {
    const res = await fetch(`${API_URL}/absensi`);
    if (!res.ok) throw new Error('Gagal memuat');
    allAbsensiData = await res.json();
    renderTable();
  } catch (error) {
    absensiBody.innerHTML = '<tr><td colspan="5">❌ Gagal memuat data</td></tr>';
  }
}

// Fungsi CRUD
async function deleteAbsen(id) {
  if (!confirm('Yakin ingin menghapus data ini?')) return;
  try {
    const res = await fetch(`${API_URL}/absen/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    showMessage('Data berhasil dihapus', 'success');
    loadAbsensi();
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

function openEditModal(id) {
  const item = allAbsensiData.find(d => d.id == id);
  if (!item) return;
  modalTitle.innerText = 'Edit Data Absensi';
  editId.value = item.id;
  modalName.value = item.name;
  modalJurusan.value = item.jurusan;
  modalKelas.value = item.kelas;
  // Set datetime-local: format YYYY-MM-DDThh:mm:ss
  const date = new Date(item.check_in_time);
  const localDateTime = date.toISOString().slice(0, 19);
  modalTime.value = localDateTime;
  modal.style.display = 'block';
}

function openAddModal() {
  modalTitle.innerText = 'Tambah Data Absensi Manual';
  editId.value = '';
  modalName.value = '';
  modalJurusan.value = '';
  modalKelas.value = '';
  modalTime.value = '';
  modal.style.display = 'block';
}

async function saveData() {
  const name = modalName.value.trim();
  const jurusan = modalJurusan.value;
  const kelas = modalKelas.value;
  let waktu = modalTime.value;
  if (!name || !jurusan || !kelas) {
    showMessage('Nama, Jurusan, Kelas wajib diisi!', 'error');
    return;
  }
  // Jika waktu kosong, gunakan sekarang
  if (!waktu) {
    waktu = new Date().toISOString().slice(0, 19);
  } else {
    // Konversi ke format ISO
    waktu = new Date(waktu).toISOString();
  }

  const id = editId.value;
  let url, method, body;
  if (id) {
    url = `${API_URL}/absen/${id}`;
    method = 'PUT';
    body = { name, jurusan, kelas, check_in_time: waktu };
  } else {
    url = `${API_URL}/admin/absen`;
    method = 'POST';
    body = { name, jurusan, kelas, check_in_time: waktu };
  }
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    showMessage(result.message, 'success');
    modal.style.display = 'none';
    loadAbsensi();
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

// Event delegation untuk tombol edit/hapus
absensiBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.classList.contains('btn-edit')) {
    const id = btn.getAttribute('data-id');
    openEditModal(id);
  } else if (btn.classList.contains('btn-delete')) {
    const id = btn.getAttribute('data-id');
    deleteAbsen(id);
  }
});

// Absen harian
async function submitAbsen() {
  const name = nameInput.value.trim();
  const jurusan = jurusanSelect.value;
  const kelas = kelasSelect.value;
  if (!name || !jurusan || !kelas) {
    showMessage('Isi semua field (nama, jurusan, kelas)!', 'error');
    return;
  }
  absenBtn.disabled = true;
  absenBtn.textContent = '⏳ ...';
  try {
    const res = await fetch(`${API_URL}/absen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, jurusan, kelas })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error);
    showMessage(`✅ ${result.message}`, 'success');
    nameInput.value = '';
    jurusanSelect.value = '';
    kelasSelect.value = '';
    loadAbsensi();
  } catch (err) {
    showMessage(err.message, 'error');
  } finally {
    absenBtn.disabled = false;
    absenBtn.textContent = '✔️ Absen Masuk';
  }
}

// Event listeners
absenBtn.addEventListener('click', submitAbsen);
refreshBtn.addEventListener('click', loadAbsensi);
filterJurusan.addEventListener('change', renderTable);
filterKelas.addEventListener('change', renderTable);
openAddModalBtn.addEventListener('click', openAddModal);
closeModal.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
modalSaveBtn.addEventListener('click', saveData);
nameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitAbsen(); });

// Init
updateDate();
loadAbsensi();