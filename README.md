# 🌟 Sistem Presensi Wajah AI & Geolocation (Supabase + Vite)

Aplikasi presensi kehadiran karyawan modern berbasis **AI Face Recognition (Biometrik Wajah)** dan **Geolocation GPS**, dibangun menggunakan **Vanilla JS + Vite**, terhubung langsung ke cloud database **Supabase (PostgreSQL)**, dan dideploy secara otomatis via **GitHub Actions** ke **GitHub Pages**.

---

## 🚀 Live Demo & Akses Aplikasi
- **Aplikasi Online (GitHub Pages)**: [https://malikafathindah.github.io/PresensiWajah/](https://malikafathindah.github.io/PresensiWajah/)
- **Repository GitHub**: [https://github.com/malikafathindah/PresensiWajah](https://github.com/malikafathindah/PresensiWajah)

---

## 🗄️ Arsitektur Database (100% Supabase)
Aplikasi ini sepenuhnya mengandalkan **Supabase** sebagai satu-satunya sistem basis data (tanpa Google Sheets / backend terpisah).

Struktur tabel di Supabase:
1. **`public.users`**: Menyimpan data master karyawan, status keaktifan (`Aktif` / `Nonaktif`), foto wajah (Base64), dan 128 vektor biometrik (`face_descriptor` JSONB).
2. **`public.absensi`**: Mencatat data kehadiran (Datang / Pulang / Izin), timestamp (WIB/Jakarta), koordinat GPS (latitude, longitude, link Google Maps), status kehadiran, dan foto selfie bukti kehadiran.
3. **`public.izin`**: Mencatat formulir permohonan izin/sakit/cuti beserta foto bukti dan koordinat saat pengajuan.
4. **`public.log_login`**: Mencatat audit log aktivitas masuk karyawan dan user agent perangkat.

> Skema SQL lengkap dan konfigurasi Row Level Security (RLS) tersedia di file [`supabase_schema.sql`](./supabase_schema.sql).

---

## ✨ Fitur Unggulan
- **Pendeteksian & Pencocokan Wajah Otomatis**: Memanfaatkan `@vladmandic/face-api` (SSD MobileNet V1) untuk ekstraksi fitur wajah 128 dimensi secara real-time.
- **Perekaman Wajah Mandiri**: Bagi karyawan berstatus aktif yang belum memiliki data biometrik, sistem otomatis menampilkan modal panduan pemindaian wajah.
- **Validasi Geolocation GPS**: Mendeteksi lokasi presisi perangkat karyawan dan menyediakan tautan langsung Google Maps.
- **Filter Karyawan Aktif**: Hanya menampilkan karyawan dengan status `Aktif`. Karyawan berstatus nonaktif otomatis disembunyikan.
- **Pengajuan Izin Lengkap**: Formulir izin untuk Sakit, Cuti, Izin Pribadi, Perjalanan Dinas, dll., lengkap dengan foto dan lokasi GPS.
- **Tabel Riwayat Terurut Real-Time**: Menampilkan data presensi bulan berjalan dengan urutan kronologis terbaru di bagian atas.
- **Deployment Otomatis GitHub Pages**: Setiap pembaruan kode pada branch `main` akan otomatis dibuild dan dipublikasikan via GitHub Actions.

---

## 💻 Menjalankan Secara Lokal

### 1. Clone Repository
```bash
git clone https://github.com/malikafathindah/PresensiWajah.git
cd PresensiWajah
```

### 2. Install Dependensi
```bash
npm install
```

### 3. Konfigurasi Lingkungan (`.env`)
Salin file `.env.example` menjadi `.env` dan sesuaikan kredensial Supabase Anda:
```bash
cp .env.example .env
```

Isi file `.env`:
```env
VITE_SUPABASE_URL=https://utqexpkwtatwzknjftpx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Jalankan Server Dev
```bash
npm run dev
```
Buka browser pada `http://localhost:5173`.

### 5. Build untuk Produksi
```bash
npm run build
```
Hasil build siap saji akan berada di folder `/dist` dan otomatis tersinkronisasi ke root.

### 6. Memperbarui ke GitHub (1-Klik Praktis)
Jika Anda selesai mengubah kode dan ingin memperbarui website GitHub Pages:
- **Cara 1 (Paling Mudah)**: Cukup klik 2x file [`update_github.bat`](./update_github.bat) di folder proyek ini.
- **Cara 2 (Terminal)**:
  ```bash
  npm run build
  git add .
  git commit -m "Update aplikasi"
  git push origin main
  ```
Dalam ~1 menit, situs GitHub Pages akan ter-update otomatis secara online.

---

## 🛠️ Teknologi yang Digunakan
- **Frontend**: HTML5, Vanilla CSS3 (Modern Glassmorphism Design), JavaScript (ES Modules)
- **Tooling & Bundler**: [Vite](https://vitejs.dev/)
- **AI / Computer Vision**: [@vladmandic/face-api](https://github.com/vladmandic/face-api)
- **Database & Backend as a Service**: [Supabase](https://supabase.com/) (PostgreSQL + RLS + REST API)
- **CI/CD & Hosting**: GitHub Actions & GitHub Pages