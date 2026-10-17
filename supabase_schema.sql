-- ====================================================================
-- SKEMA DATABASE PRESENSI PT. FATH INDAH TRAVEL SERVICE (SUPABASE)
-- Silakan salin & jalankan seluruh script ini di SQL Editor Supabase Anda!
-- ====================================================================

-- 1. Tabel Users (Karyawan)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    nama VARCHAR(150) NOT NULL,
    jabatan VARCHAR(100) DEFAULT 'Karyawan',
    foto_wajah TEXT,           -- Foto wajah (Base64)
    face_descriptor JSONB,     -- 128 vektor biometrik wajah (NULL jika belum scan wajah)
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW())
);

-- 2. Tabel Absensi (Presensi Masuk, Pulang, dan Izin)
CREATE TABLE IF NOT EXISTS public.absensi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()),
    nama_user VARCHAR(50) NOT NULL,
    nama_karyawan VARCHAR(150) NOT NULL,
    tipe VARCHAR(100) NOT NULL,           -- 'Datang', 'Pulang', 'Izin (Sakit)', dll.
    latitude VARCHAR(50) DEFAULT 'Tidak terdeteksi',
    longitude VARCHAR(50) DEFAULT 'Tidak terdeteksi',
    link_google_maps TEXT DEFAULT '-',
    tanggal INT,
    kode VARCHAR(10) DEFAULT 'H',
    bulan INT,
    tahun INT,
    foto_bukti TEXT,                      -- Foto bukti saat absen
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW())
);

-- 3. Tabel Log Login (Mencatat Setiap Sesi Login Karyawan)
CREATE TABLE IF NOT EXISTS public.log_login (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    waktu_login TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()),
    user_id VARCHAR(50) NOT NULL,
    nama_karyawan VARCHAR(150) NOT NULL,
    device TEXT,
    keterangan VARCHAR(100) DEFAULT 'Berhasil Login',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW())
);

-- 4. Tabel Izin (Laporan Tidak Masuk / Izin / Sakit / Cuti)
CREATE TABLE IF NOT EXISTS public.izin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW()),
    user_id VARCHAR(50) NOT NULL,
    nama_karyawan VARCHAR(150) NOT NULL,
    alasan TEXT NOT NULL,
    tanggal INT,
    status VARCHAR(10) DEFAULT 'I',
    latitude VARCHAR(50) DEFAULT 'Tidak terdeteksi',
    longitude VARCHAR(50) DEFAULT 'Tidak terdeteksi',
    maps_url TEXT DEFAULT '-',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('Asia/Jakarta', NOW())
);

-- 5. Buat Indeks untuk Mempercepat Pencarian Data
CREATE INDEX IF NOT EXISTS idx_users_user_id ON public.users(user_id);
CREATE INDEX IF NOT EXISTS idx_absensi_nama_user ON public.absensi(nama_user);
CREATE INDEX IF NOT EXISTS idx_absensi_timestamp ON public.absensi(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_log_login_user_id ON public.log_login(user_id);
CREATE INDEX IF NOT EXISTS idx_izin_user_id ON public.izin(user_id);

-- 6. Aktifkan Row Level Security (RLS) & Kebijakan Akses (Anon & Authenticated)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.log_login ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.izin ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Penuh untuk Web Client
DROP POLICY IF EXISTS "Akses users anon" ON public.users;
CREATE POLICY "Akses users anon" ON public.users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses absensi anon" ON public.absensi;
CREATE POLICY "Akses absensi anon" ON public.absensi FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses log_login anon" ON public.log_login;
CREATE POLICY "Akses log_login anon" ON public.log_login FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses izin anon" ON public.izin;
CREATE POLICY "Akses izin anon" ON public.izin FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 7. Berikan Hak Akses (Grants) ke Role Anon & Authenticated
GRANT ALL ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
