import csv
import json
import urllib.request
import os
import sys
from datetime import datetime

# Set UTF-8 stdout
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

supabase_url = "https://utqexpkwtatwzknjftpx.supabase.co"
anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0cWV4cGt3dGF0d3prbmpmdHB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxODQ5MTYsImV4cCI6MjEwNzc2MDkxNn0.s17as0ZuXm11AMJyYp01omnHkiqTRTGrKtYZfAI7kwE"

headers = {
    "apikey": anon_key,
    "Authorization": f"Bearer {anon_key}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# Temukan folder sheets_data (di direktori aktif atau parent/sub)
current_dir = os.path.dirname(os.path.abspath(__file__))
sheets_data_dir = os.path.join(current_dir, 'sheets_data')
if not os.path.exists(sheets_data_dir):
    alt_dir = r"d:\PROJECT AI\PresensiWajah\sheets_data"
    if os.path.exists(alt_dir):
        sheets_data_dir = alt_dir

def post_batch(table_name, records, batch_size=100):
    total = len(records)
    inserted = 0
    for i in range(0, total, batch_size):
        chunk = records[i:i + batch_size]
        req = urllib.request.Request(
            f"{supabase_url}/rest/v1/{table_name}",
            data=json.dumps(chunk).encode('utf-8'),
            headers=headers,
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                inserted += len(chunk)
                print(f"  [{table_name}] Batch {i // batch_size + 1}: {inserted}/{total} baris tersimpan.")
        except urllib.error.HTTPError as e:
            print(f"  [{table_name}] Gagal pada batch {i}: {e.code} - {e.read().decode('utf-8')}")
            return False
    return True

# 1. IMPORT USERS
def import_users():
    path = os.path.join(sheets_data_dir, 'Users.csv')
    if not os.path.exists(path):
        print(f"File {path} tidak ditemukan!")
        return
    with open(path, 'r', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    
    users = []
    for r in rows:
        uid = r.get('User Id', '').strip()
        pwd = r.get('Password', '').strip()
        nama = r.get('Nama', '').strip()
        jabatan = r.get('Jabatan', '').strip() or 'Karyawan'
        if not uid or not nama:
            continue
        users.append({
            "user_id": uid,
            "password": pwd,
            "nama": nama,
            "jabatan": jabatan,
            "face_descriptor": None,  # Belum scan wajah
            "foto_wajah": None
        })
    print(f"Memigrasikan {len(users)} users ke tabel 'users'...")
    post_batch('users', users, 50)

# 2. IMPORT ABSENSI
def import_absensi():
    path = os.path.join(sheets_data_dir, 'Absensi.csv')
    if not os.path.exists(path):
        print(f"File {path} tidak ditemukan!")
        return
    with open(path, 'r', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))

    formats = ['%m/%d/%Y %H:%M:%S', '%d/%m/%Y %H:%M:%S', '%Y-%m-%d %H:%M:%S', '%m/%d/%Y %H:%M', '%d/%m/%Y %H:%M']
    
    records = []
    for r in rows:
        ts_raw = r.get('Timestamp', '').strip()
        dt = None
        for fmt in formats:
            try:
                dt = datetime.strptime(ts_raw, fmt)
                break
            except ValueError:
                pass
        
        iso_ts = dt.strftime('%Y-%m-%dT%H:%M:%SZ') if dt else datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        tgl = int(r.get('Tanggal')) if r.get('Tanggal', '').isdigit() else (dt.day if dt else 1)
        bln = int(r.get('Bulan')) if r.get('Bulan', '').isdigit() else (dt.month if dt else 1)
        thn = int(r.get('Tahun')) if r.get('Tahun', '').isdigit() else (dt.year if dt else 2026)

        records.append({
            "timestamp": iso_ts,
            "nama_user": r.get('NamaUser', '').strip(),
            "nama_karyawan": r.get('NamaKaryawan', '').strip(),
            "tipe": r.get('Tipe', '').strip() or 'Datang',
            "latitude": r.get('Latitude', '').strip() or 'Tidak terdeteksi',
            "longitude": r.get('Longitude', '').strip() or 'Tidak terdeteksi',
            "link_google_maps": r.get('Link Google Maps', '').strip() or '-',
            "tanggal": tgl,
            "kode": r.get('Kode', '').strip() or 'H',
            "bulan": bln,
            "tahun": thn,
            "catatan": 'Migrasi dari Spreadsheet'
        })
    print(f"Memigrasikan {len(records)} baris absensi ke tabel 'absensi'...")
    post_batch('absensi', records, 100)

# 3. IMPORT LOG LOGIN
def import_log_login():
    path = os.path.join(sheets_data_dir, 'Log_Login.csv')
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))

    logs = []
    for r in rows:
        ts = r.get('Waktu Login', '').strip()
        uid = r.get('User Id', '').strip()
        nama = r.get('Nama Karyawan', '').strip()
        dev = r.get('Device', '').strip()
        ket = r.get('Keterangan', '').strip() or 'Berhasil Login'
        if not uid:
            continue
        logs.append({
            "waktu_login": ts or datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
            "user_id": uid,
            "nama_karyawan": nama,
            "device": dev,
            "keterangan": ket
        })
    print(f"Memigrasikan {len(logs)} baris log ke tabel 'log_login'...")
    post_batch('log_login', logs, 100)

# 4. IMPORT IZIN
def import_izin():
    path = os.path.join(sheets_data_dir, 'Izin.csv')
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))

    izins = []
    for r in rows:
        uid = r.get('Nama', '').strip()  # Di sheet Izin kolom Nama berisi User ID
        nama = r.get('Email', '').strip() # Kolom Email berisi Nama Karyawan
        alasan = r.get('Alasan', '').strip()
        if not uid:
            continue
        izins.append({
            "user_id": uid,
            "nama_karyawan": nama,
            "alasan": alasan,
            "status": alasan[0].upper() if alasan else 'I',
            "latitude": 'Tidak terdeteksi',
            "longitude": 'Tidak terdeteksi',
            "maps_url": '-'
        })
    print(f"Memigrasikan {len(izins)} laporan izin ke tabel 'izin'...")
    post_batch('izin', izins, 50)

if __name__ == '__main__':
    print("Memeriksa kesiapan tabel Supabase...")
    req = urllib.request.Request(f"{supabase_url}/rest/v1/users?select=id&limit=1", headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            print("✓ Tabel Supabase siap! Memulai migrasi data...")
            import_users()
            import_absensi()
            import_log_login()
            import_izin()
            print("=========================================")
            print("✓ SEMUA DATA BERHASIL DIMIGRASIKAN!")
            print("=========================================")
    except urllib.error.HTTPError as e:
        print(f"❌ Tabel belum siap di Supabase (Status {e.code}).")
        print("Harap jalankan file 'supabase_schema.sql' di SQL Editor Supabase terlebih dahulu!")
