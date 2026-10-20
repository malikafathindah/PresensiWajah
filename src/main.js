import { supabase } from './supabase.js';
import { loadFaceModels, getFaceDescriptorFromVideo, captureSnapshot, findBestMatch, isFaceMatch, parseDescriptor } from './faceService.js';
import confetti from 'canvas-confetti';

// State
let currentUser = null;
let registeredUsers = [];
let loginCameraStream = null;
let loginScanInterval = null;
let dashboardCameraStream = null;
let dashboardScanInterval = null;
let isCameraActive = true;
let isProcessingLoginMatch = false;

// DOM Elements - Login
const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');
const tabBtnFace = document.getElementById('tabBtnFace');
const tabBtnManual = document.getElementById('tabBtnManual');
const sectionFaceLogin = document.getElementById('sectionFaceLogin');
const sectionManualLogin = document.getElementById('sectionManualLogin');
const loginFaceVideo = document.getElementById('loginFaceVideo');
const loginFaceBadge = document.getElementById('loginFaceBadge');
const loginFaceBadgeText = document.getElementById('loginFaceBadgeText');
const btnStartFaceScan = document.getElementById('btnStartFaceScan');
const loginAlert = document.getElementById('loginAlert');
const userIdInput = document.getElementById('userId');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btnLogin');
const btnLoginText = document.getElementById('btnLoginText');
const btnLogout = document.getElementById('btnLogout');

// DOM Elements - Dashboard
const userGreeting = document.getElementById('userGreeting');
const userSub = document.getElementById('userSub');
const userAvatarContainer = document.getElementById('userAvatarContainer');
const faceStatusBadge = document.getElementById('faceStatusBadge');
const faceStatusText = document.getElementById('faceStatusText');
const locationStatus = document.getElementById('locationStatus');
const locationText = document.getElementById('locationText');

// Scanner elements
const scannerBox = document.getElementById('scannerBox');
const dashboardVideo = document.getElementById('dashboardVideo');
const scannerBadge = document.getElementById('scannerBadge');
const scannerBadgeText = document.getElementById('scannerBadgeText');
const btnToggleCamera = document.getElementById('btnToggleCamera');
const btnDatang = document.getElementById('btnDatang');
const btnPulang = document.getElementById('btnPulang');
const btnBukaIzin = document.getElementById('btnBukaIzin');
const formIzinContainer = document.getElementById('formIzinContainer');
const btnTutupIzin = document.getElementById('btnTutupIzin');
const btnScanWajahManual = document.getElementById('btnScanWajahManual');

// Form Izin elements
const selectIzin = document.getElementById('selectIzin');
const divLainLain = document.getElementById('divLainLain');
const alasanKustom = document.getElementById('alasanKustom');
const btnKirimIzin = document.getElementById('btnKirimIzin');
const btnRefreshRiwayat = document.getElementById('btnRefreshRiwayat');
const riwayatTableBody = document.getElementById('riwayatTableBody');

// Modal Elements (Pendaftaran Wajah Baru)
const modalFaceScan = document.getElementById('modalFaceScan');
const modalUserName = document.getElementById('modalUserName');
const modalFaceDesc = document.getElementById('modalFaceDesc');
const modalVideo = document.getElementById('modalVideo');
const modalScanFeedback = document.getElementById('modalScanFeedback');
const btnCaptureFace = document.getElementById('btnCaptureFace');
const btnSkipFace = document.getElementById('btnSkipFace');
let modalCameraStream = null;

// ==========================================
// HELPER: ZONA WAKTU AREA JAKARTA (WIB / UTC+7)
// ==========================================
function getJakartaNow(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  parts.forEach(p => { map[p.type] = p.value; });

  const hour = map.hour === '24' ? '00' : map.hour;
  // Format persis seperti format created_at di Supabase (+00:00)
  const isoJakarta = `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}:${map.second}+00:00`;
  const ymdJakarta = `${map.year}-${map.month}-${map.day}`;

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour: hour,
    minute: map.minute,
    second: map.second,
    iso: isoJakarta,
    ymd: ymdJakarta
  };
}

// ==========================================
// 1. DIGITAL CLOCK (AREA JAKARTA / WIB)
// ==========================================
function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Jakarta' });
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta' };
  const dateStr = now.toLocaleDateString('id-ID', options);

  const liveTime = document.getElementById('liveTime');
  const liveDate = document.getElementById('liveDate');
  if (liveTime) liveTime.innerText = timeStr;
  if (liveDate) liveDate.innerText = dateStr;
}
setInterval(updateClock, 1000);
updateClock();

// ==========================================
// 2. INISIALISASI & TAB LOGIN SWITCHER
// ==========================================
tabBtnFace.addEventListener('click', () => switchLoginTab('face'));
tabBtnManual.addEventListener('click', () => switchLoginTab('manual'));

function switchLoginTab(tab) {
  loginAlert.classList.add('hidden');
  if (tab === 'face') {
    tabBtnFace.classList.add('active');
    tabBtnManual.classList.remove('active');
    sectionFaceLogin.classList.remove('hidden');
    sectionManualLogin.classList.add('hidden');
    startFaceLoginScanner();
  } else {
    tabBtnManual.classList.add('active');
    tabBtnFace.classList.remove('active');
    sectionManualLogin.classList.remove('hidden');
    sectionFaceLogin.classList.add('hidden');
    stopFaceLoginScanner();
    userIdInput.focus();
  }
}

// Muat daftar users yang punya wajah terdaftar dari Supabase
async function loadRegisteredUsersFromDB() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, user_id, nama, jabatan, foto_wajah, face_descriptor')
      .not('face_descriptor', 'is', null);

    if (error) throw error;
    registeredUsers = (data || [])
      .map(u => ({
        ...u,
        face_descriptor: parseDescriptor(u.face_descriptor)
      }))
      .filter(u => Array.isArray(u.face_descriptor) && u.face_descriptor.length > 0);

    console.log(`Berhasil memuat ${registeredUsers.length} karyawan dengan wajah terdaftar.`);
  } catch (err) {
    console.warn('Gagal memuat registered users:', err);
  }
}

// Jalankan scanner wajah saat pertama kali membuka halaman login
async function startFaceLoginScanner() {
  isProcessingLoginMatch = false;
  setLoginFaceBadge('Menyalakan kamera pemindai wajah...', 'normal');

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Kamera memerlukan koneksi aman (HTTPS).');
    }

    if (loginCameraStream) {
      loginCameraStream.getTracks().forEach(t => t.stop());
    }

    loginCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false
    });
    loginFaceVideo.srcObject = loginCameraStream;

    setLoginFaceBadge('Memuat model AI & data wajah...', 'normal');
    await loadFaceModels();
    await loadRegisteredUsersFromDB();

    if (registeredUsers.length === 0) {
      setLoginFaceBadge('Belum ada wajah terdaftar di database Supabase. Silakan login manual untuk mendaftarkan wajah.', 'warning');
      return;
    }

    setLoginFaceBadge(`✓ Siap! ${registeredUsers.length} data wajah termuat dari Supabase. Arahkan wajah ke kamera...`, 'normal');
    startFaceLoginLoop();
  } catch (err) {
    console.warn('Face login scanner error:', err);
    setLoginFaceBadge(`Kamera tidak aktif (${err.message})`, 'warning');
  }
}

function stopFaceLoginScanner() {
  if (loginScanInterval) {
    clearInterval(loginScanInterval);
    loginScanInterval = null;
  }
  if (loginCameraStream) {
    loginCameraStream.getTracks().forEach(t => t.stop());
    loginCameraStream = null;
  }
}

function setLoginFaceBadge(text, state = 'normal') {
  loginFaceBadgeText.innerText = text;
  loginFaceBadge.className = 'scanner-badge-overlay';
  if (state === 'success') loginFaceBadge.classList.add('scanner-badge-success');
  else if (state === 'warning') loginFaceBadge.classList.add('scanner-badge-warning');
}

btnStartFaceScan.addEventListener('click', () => {
  startFaceLoginScanner();
});

// Loop pencocokan wajah saat login
function startFaceLoginLoop() {
  if (loginScanInterval) clearInterval(loginScanInterval);

  loginScanInterval = setInterval(async () => {
    if (isProcessingLoginMatch || !loginCameraStream || registeredUsers.length === 0) return;

    try {
      const descriptor = await getFaceDescriptorFromVideo(loginFaceVideo);
      if (descriptor) {
        const result = findBestMatch(descriptor, registeredUsers, 0.62);

        if (result && result.isMatch) {
          isProcessingLoginMatch = true;
          const user = result.user;
          setLoginFaceBadge(`✓ Terotorisasi: ${user.nama} (${result.confidence}%)`, 'success');
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

          // Catat log login
          catatLogLogin(user.user_id, user.nama);

          currentUser = user;
          updateUserProfileUI();

          setTimeout(() => {
            stopFaceLoginScanner();
            enterDashboard();
          }, 900);
        } else if (result && result.user) {
          setLoginFaceBadge(`Mendeteksi ${result.user.nama} (${result.confidence}% mirip). Posisikan wajah tegak lurus...`, 'warning');
        } else {
          setLoginFaceBadge('Wajah terdeteksi, posisikan lurus di dalam lingkaran kamera...', 'normal');
        }
      } else {
        setLoginFaceBadge('Arahkan wajah Anda ke dalam lingkaran kamera...', 'normal');
      }
    } catch (e) {
      // ignore
    }
  }, 900);
}

// ==========================================
// 3. LOGIN MANUAL (USER ID & PASSWORD)
// ==========================================
btnLogin.addEventListener('click', handleManualLogin);
passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleManualLogin();
});

async function handleManualLogin() {
  const uid = userIdInput.value.trim();
  const pwd = passwordInput.value.trim();

  loginAlert.classList.add('hidden');

  if (!uid || !pwd) {
    showLoginAlert('Mohon masukkan User ID dan Password!');
    return;
  }

  btnLogin.disabled = true;
  btnLoginText.innerText = 'Memverifikasi...';

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .ilike('user_id', uid)
      .eq('password', pwd);

    if (error) throw error;

    if (!users || users.length === 0) {
      showLoginAlert('User ID atau Password salah!');
      btnLogin.disabled = false;
      btnLoginText.innerText = 'Masuk ke Sistem';
      return;
    }

    const user = users[0];
    currentUser = user;

    catatLogLogin(user.user_id, user.nama);
    updateUserProfileUI();

    const userDesc = parseDescriptor(user.face_descriptor);
    user.face_descriptor = userDesc;
    const hasFace = Array.isArray(userDesc) && userDesc.length > 0;

    if (!hasFace) {
      // Jika wajah belum terdaftar, minta registrasi wajah awal
      openFaceScanModal(true);
    } else {
      stopFaceLoginScanner();
      enterDashboard();
    }
  } catch (err) {
    console.error('Error saat login manual:', err);
    showLoginAlert(`Terjadi kesalahan sistem: ${err.message || 'Koneksi database gagal'}`);
  } finally {
    btnLogin.disabled = false;
    btnLoginText.innerText = 'Masuk ke Sistem';
  }
}

function showLoginAlert(msg) {
  loginAlert.innerText = msg;
  loginAlert.classList.remove('hidden');
}

async function catatLogLogin(userId, nama) {
  try {
    const jkt = getJakartaNow();
    await supabase.from('log_login').insert([
      {
        waktu_login: jkt.iso,
        user_id: userId,
        nama_karyawan: nama,
        device: navigator.userAgent,
        keterangan: 'Berhasil Login'
      }
    ]);
  } catch (e) {
    console.warn('Gagal catat log login:', e);
  }
}

function updateUserProfileUI() {
  if (!currentUser) return;
  userGreeting.innerText = currentUser.nama;
  userSub.innerText = `ID: ${currentUser.user_id} • ${currentUser.jabatan || 'Karyawan'}`;

  const userDesc = parseDescriptor(currentUser.face_descriptor);
  const hasFace = Array.isArray(userDesc) && userDesc.length > 0;
  
  if (currentUser.foto_wajah) {
    userAvatarContainer.innerHTML = `<img src="${currentUser.foto_wajah}" alt="${currentUser.nama}" class="avatar-img" />`;
  } else {
    userAvatarContainer.innerHTML = `<span>${(currentUser.nama || 'U').charAt(0).toUpperCase()}</span>`;
  }

  if (hasFace) {
    faceStatusBadge.className = 'badge-face-status badge-face-active';
    faceStatusText.innerText = '✓ Wajah Terotorisasi';
  } else {
    faceStatusBadge.className = 'badge-face-status badge-face-inactive';
    faceStatusText.innerText = 'Wajah Belum Terdaftar';
  }
}

// ==========================================
// 4. DASHBOARD PRESENSI TEROTORISASI
// ==========================================
function enterDashboard() {
  stopFaceLoginScanner(); // Matikan kamera pemindai login sepenuhnya
  loginPage.classList.add('hidden');
  dashboardPage.classList.remove('hidden');
  loadRiwayat();
}

// ==========================================
// 5. PILIHAN ABSEN LANGSUNG: DATANG & PULANG
// ==========================================
btnDatang.addEventListener('click', () => handlePresensiAction('Datang'));
btnPulang.addEventListener('click', () => handlePresensiAction('Pulang'));

async function handlePresensiAction(tipe) {
  toggleAbsenButtons(true);
  locationStatus.classList.remove('hidden');
  locationText.innerText = `Mengambil titik koordinat GPS Google Maps untuk Absen ${tipe}...`;

  if (!navigator.geolocation) {
    sendAbsenData(tipe, 'Tidak terdeteksi', 'Tidak terdeteksi', '-');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude.toString();
      const lng = position.coords.longitude.toString();
      const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
      locationText.innerText = 'Menyimpan data presensi ke Supabase...';
      sendAbsenData(tipe, lat, lng, mapsUrl);
    },
    (err) => {
      console.warn('Geolocation error:', err);
      let errMsg = 'Gagal mendeteksi lokasi GPS.';
      if (err.code === err.PERMISSION_DENIED) errMsg = 'Izin lokasi GPS ditolak.';

      const proceed = confirm(`${errMsg} Tetap catat absensi ${tipe} tanpa titik GPS?`);
      if (proceed) {
        sendAbsenData(tipe, 'Tidak terdeteksi', 'Tidak terdeteksi', '-');
      } else {
        locationStatus.classList.add('hidden');
        toggleAbsenButtons(false);
      }
    },
    { enableHighAccuracy: true, timeout: 12000 }
  );
}

async function sendAbsenData(tipe, lat, lng, mapsUrl) {
  const jkt = getJakartaNow();
  const tanggalHariIni = jkt.ymd; // Format: yyyy-mm-dd
  const bulanHariIni = jkt.month;
  const tahunHariIni = jkt.year;

  try {
    const { error } = await supabase.from('absensi').insert([
      {
        timestamp: jkt.iso,
        nama_user: currentUser.user_id,
        nama_karyawan: currentUser.nama,
        tipe: tipe,
        latitude: lat,
        longitude: lng,
        link_google_maps: mapsUrl,
        tanggal: tanggalHariIni,
        kode: 'H',
        bulan: bulanHariIni,
        tahun: tahunHariIni,
        catatan: `Presensi ${tipe} (Terotorisasi Biometrik)`
      }
    ]);

    if (error) throw error;

    locationStatus.classList.add('hidden');
    toggleAbsenButtons(false);

    confetti({ particleCount: 90, spread: 65, origin: { y: 0.6 } });
    alert(`✓ Absen ${tipe} Berhasil Dicatat!\nKaryawan: ${currentUser.nama}\nLokasi: ${mapsUrl !== '-' ? 'GPS Terhubung' : 'Manual'}`);
    loadRiwayat();
  } catch (err) {
    console.error('Gagal simpan absensi:', err);
    locationStatus.classList.add('hidden');
    toggleAbsenButtons(false);
    alert(`Gagal mencatat absensi: ${err.message}`);
  }
}

function toggleAbsenButtons(disabled) {
  btnDatang.disabled = disabled;
  btnPulang.disabled = disabled;
  btnBukaIzin.disabled = disabled;
}

// ==========================================
// 6. PILIHAN ABSEN: LAPORAN TIDAK MASUK / IZIN
// ==========================================
btnBukaIzin.addEventListener('click', () => {
  formIzinContainer.classList.toggle('hidden');
  if (!formIzinContainer.classList.contains('hidden')) {
    formIzinContainer.scrollIntoView({ behavior: 'smooth' });
  }
});

btnTutupIzin.addEventListener('click', () => {
  formIzinContainer.classList.add('hidden');
});

selectIzin.addEventListener('change', () => {
  const val = selectIzin.value;
  if (val === 'Lain-lain' || val === 'Izin') {
    divLainLain.classList.remove('hidden');
    alasanKustom.focus();
  } else {
    divLainLain.classList.add('hidden');
  }
});

btnKirimIzin.addEventListener('click', submitIzin);

function submitIzin() {
  const selectVal = selectIzin.value;
  if (!selectVal) {
    alert('Silakan pilih alasan izin terlebih dahulu!');
    return;
  }

  let finalAlasan = selectVal;
  if (selectVal === 'Lain-lain' || selectVal === 'Izin') {
    const kustom = alasanKustom.value.trim();
    if (!kustom) {
      alert('Tuliskan alasan spesifik Anda pada kolom yang tersedia!');
      return;
    }
    finalAlasan = `${selectVal}: ${kustom}`;
  }

  btnKirimIzin.disabled = true;
  btnKirimIzin.innerText = 'Mengambil Foto & Lokasi GPS...';

  let selfieSnapshot = null;
  if (isCameraActive && dashboardCameraStream) {
    try {
      selfieSnapshot = captureSnapshot(dashboardVideo);
    } catch (e) {}
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toString();
        const lng = pos.coords.longitude.toString();
        const maps = `https://maps.google.com/?q=${lat},${lng}`;
        btnKirimIzin.innerText = 'Mengirim Laporan...';
        sendIzinData(finalAlasan, lat, lng, maps, selfieSnapshot);
      },
      () => {
        const proceed = confirm('Gagal mendeteksi lokasi GPS. Tetap kirim laporan izin tanpa data lokasi?');
        if (proceed) {
          btnKirimIzin.innerText = 'Mengirim Laporan...';
          sendIzinData(finalAlasan, 'Tidak terdeteksi', 'Tidak terdeteksi', '-', selfieSnapshot);
        } else {
          btnKirimIzin.disabled = false;
          btnKirimIzin.innerText = 'Kirim Laporan Izin';
        }
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  } else {
    sendIzinData(finalAlasan, 'Tidak terdeteksi', 'Tidak terdeteksi', '-', selfieSnapshot);
  }
}

async function sendIzinData(alasan, lat, lng, mapsUrl, photoSnapshot) {
  const jkt = getJakartaNow();
  const tanggalHariIni = jkt.ymd; // Format: yyyy-mm-dd
  const bulanHariIni = jkt.month;
  const tahunHariIni = jkt.year;
  const statusHadir = alasan ? alasan.charAt(0).toUpperCase() : 'I';
  const tipeAbsen = `Izin (${alasan})`;

  try {
    await supabase.from('izin').insert([
      {
        timestamp: jkt.iso,
        user_id: currentUser.user_id,
        nama_karyawan: currentUser.nama,
        alasan: alasan,
        tanggal: tanggalHariIni,
        status: statusHadir,
        latitude: lat,
        longitude: lng,
        maps_url: mapsUrl
      }
    ]);

    await supabase.from('absensi').insert([
      {
        timestamp: jkt.iso,
        nama_user: currentUser.user_id,
        nama_karyawan: currentUser.nama,
        tipe: tipeAbsen,
        latitude: lat,
        longitude: lng,
        link_google_maps: mapsUrl,
        tanggal: tanggalHariIni,
        kode: statusHadir,
        bulan: bulanHariIni,
        tahun: tahunHariIni,
        catatan: `Laporan Izin: ${alasan}`
      }
    ]);

    btnKirimIzin.disabled = false;
    btnKirimIzin.innerText = 'Kirim Laporan Izin';
    selectIzin.value = '';
    alasanKustom.value = '';
    divLainLain.classList.add('hidden');
    formIzinContainer.classList.add('hidden');

    alert('✓ Laporan izin berhasil dikirim dan dicatat di database beserta lokasi!');
    loadRiwayat();
  } catch (err) {
    console.error('Gagal kirim izin:', err);
    btnKirimIzin.disabled = false;
    btnKirimIzin.innerText = 'Kirim Laporan Izin';
    alert(`Gagal mengirim laporan izin: ${err.message}`);
  }
}

// ==========================================
// 7. RIWAYAT ABSENSI
// ==========================================
btnRefreshRiwayat.addEventListener('click', loadRiwayat);

async function loadRiwayat() {
  if (!currentUser) return;

  riwayatTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 14px;">Memuat riwayat terbaru...</td></tr>';

  const jkt = getJakartaNow();
  const currentMonth = jkt.month;
  const currentYear = jkt.year;

  try {
    const { data: rows, error } = await supabase
      .from('absensi')
      .select('*')
      .ilike('nama_user', currentUser.user_id)
      .eq('bulan', String(currentMonth))
      .eq('tahun', String(currentYear))
      .order('timestamp', { ascending: false, nullsFirst: false })
      .limit(50);

    if (error) throw error;

    // Pastikan urutan selalu terurut descending (terbaru di paling atas)
    const sortedRows = (rows || []).slice().sort((a, b) => {
      const timeA = new Date(a.timestamp || a.Timestamp || a.created_at || 0).getTime();
      const timeB = new Date(b.timestamp || b.Timestamp || b.created_at || 0).getTime();
      return timeB - timeA;
    });

    renderRiwayat(sortedRows);
  } catch (err) {
    console.error('Gagal memuat riwayat:', err);
    riwayatTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #ef4444; padding: 14px;">Gagal memuat riwayat: ${err.message}</td></tr>`;
  }
}

function formatWaktuRiwayat(dateInput) {
  if (!dateInput) return '-';
  const str = String(dateInput);
  const match = str.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [_, yyyy, mm, dd, hh, min, ss] = match;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const mmm = months[parseInt(mm, 10) - 1] || mm;
    const yy = yyyy.slice(-2);
    return `${dd} ${mmm} ${yy} ${hh}:${min}:${ss}`;
  }
  const dateOnlyMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [_, yyyy, mm, dd] = dateOnlyMatch;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const mmm = months[parseInt(mm, 10) - 1] || mm;
    const yy = yyyy.slice(-2);
    return `${dd} ${mmm} ${yy}`;
  }
  const dt = new Date(dateInput);
  if (isNaN(dt.getTime())) return str;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  const mmm = months[dt.getUTCMonth()];
  const yy = String(dt.getUTCFullYear()).slice(-2);
  const hh = String(dt.getUTCHours()).padStart(2, '0');
  const mm = String(dt.getUTCMinutes()).padStart(2, '0');
  const ss = String(dt.getUTCSeconds()).padStart(2, '0');
  return `${dd} ${mmm} ${yy} ${hh}:${mm}:${ss}`;
}

function renderRiwayat(rows) {
  if (!rows || rows.length === 0) {
    riwayatTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 16px;">Belum ada data absensi bulan ini.</td></tr>';
    return;
  }

  let html = '';
  rows.forEach((r) => {
    let dateFormatted = '-';
    const rawTime = r.Timestamp || r.timestamp || r.created_at;
    if (rawTime) {
      dateFormatted = formatWaktuRiwayat(rawTime);
    }

    const tipeAbsen = r.Tipe || r.tipe || '-';
    let badgeClass = 'badge-tipe';
    if (tipeAbsen === 'Datang') badgeClass += ' badge-datang';
    else if (tipeAbsen === 'Pulang') badgeClass += ' badge-pulang';
    else badgeClass += ' badge-izin';

    let mapLink = '<span style="color: #94a3b8;">-</span>';
    const maps = r['Link Google Maps'] || r.link_google_maps;
    if (maps && maps.startsWith('http')) {
      mapLink = `<a href="${maps}" target="_blank" rel="noopener noreferrer" class="btn btn-sm" style="padding: 2px 8px; font-size: 0.72rem; background: #e0f2fe; color: #0284c7; text-decoration: none;">📍 Peta</a>`;
    }

    html += `
      <tr>
        <td style="font-size: 0.78rem; font-variant-numeric: tabular-nums;">${dateFormatted}</td>
        <td><span class="${badgeClass}">${tipeAbsen}</span></td>
        <td>${mapLink}</td>
      </tr>
    `;
  });

  riwayatTableBody.innerHTML = html;
}

// ==========================================
// 8. MODAL PEREKAMAN WAJAH AWAL (BARU)
// ==========================================
async function openFaceScanModal(isMandatory = false) {
  stopFaceLoginScanner();

  modalUserName.innerText = currentUser ? currentUser.nama : '';
  modalFaceScan.classList.remove('hidden');

  if (isMandatory) {
    modalFaceDesc.innerHTML = `Halo <strong>${currentUser.nama}</strong>! Akun Anda <strong>belum memindai wajah</strong>. Silakan posisikan wajah ke dalam lingkaran kamera untuk pendaftaran awal biometrik.`;
  } else {
    modalFaceDesc.innerHTML = `Posisikan wajah Anda tepat di dalam lingkaran untuk memperbarui data biometrik wajah Anda.`;
  }

  modalScanFeedback.innerText = 'Menyalakan kamera...';
  btnCaptureFace.disabled = true;

  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Kamera memerlukan koneksi aman (HTTPS).');
    }
    modalCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false
    });
    modalVideo.srcObject = modalCameraStream;

    modalScanFeedback.innerText = 'Memuat modul AI pengenalan wajah...';
    await loadFaceModels();

    modalScanFeedback.innerText = '✓ Kamera & AI siap! Klik tombol di bawah untuk merekam.';
    btnCaptureFace.disabled = false;
  } catch (err) {
    console.error('Kamera / AI error:', err);
    modalScanFeedback.innerText = `Gagal membuka kamera: ${err.message || 'Izin kamera ditolak'}.`;
  }
}

btnCaptureFace.addEventListener('click', async () => {
  btnCaptureFace.disabled = true;
  modalScanFeedback.innerText = 'Menganalisis fitur wajah...';

  try {
    const descriptor = await getFaceDescriptorFromVideo(modalVideo);

    if (!descriptor) {
      modalScanFeedback.innerText = '❌ Wajah tidak terdeteksi jelas! Harap pastikan pencahayaan cukup dan hadap kamera.';
      btnCaptureFace.disabled = false;
      return;
    }

    const photoSnapshot = captureSnapshot(modalVideo);
    modalScanFeedback.innerText = 'Menyimpan data wajah ke database Supabase...';

    const { error } = await supabase
      .from('users')
      .update({
        face_descriptor: descriptor,
        foto_wajah: photoSnapshot
      })
      .eq('user_id', currentUser.user_id);

    if (error) throw error;

    currentUser.face_descriptor = descriptor;
    currentUser.foto_wajah = photoSnapshot;
    updateUserProfileUI();

    modalScanFeedback.innerText = '✓ Wajah berhasil didaftarkan!';
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });

    setTimeout(() => {
      closeFaceScanModal();
      enterDashboard();
    }, 1200);
  } catch (err) {
    console.error('Gagal simpan wajah:', err);
    modalScanFeedback.innerText = `Gagal menyimpan wajah: ${err.message}`;
    btnCaptureFace.disabled = false;
  }
});

btnSkipFace.addEventListener('click', () => {
  closeFaceScanModal();
  enterDashboard();
});

btnScanWajahManual.addEventListener('click', () => {
  openFaceScanModal(false);
});

function closeFaceScanModal() {
  modalFaceScan.classList.add('hidden');
  if (modalCameraStream) {
    modalCameraStream.getTracks().forEach(track => track.stop());
    modalCameraStream = null;
  }
}

// ==========================================
// 9. LOGOUT
// ==========================================
btnLogout.addEventListener('click', () => {
  if (!confirm('Apakah Anda yakin ingin keluar dari akun ini?')) return;
  currentUser = null;
  userIdInput.value = '';
  passwordInput.value = '';
  dashboardPage.classList.add('hidden');
  loginPage.classList.remove('hidden');

  // Kembali ke tab login manual di layar awal
  switchLoginTab('manual');
});

// STARTUP: Jadikan login manual User ID & Password sebagai tab default
switchLoginTab('manual');
