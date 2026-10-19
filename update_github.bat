@echo off
chcp 65001 >nul
echo ========================================================
echo   MEMPERBARUI APLIKASI PRESENSI KE GITHUB
echo ========================================================
echo.

echo [1/3] Mem-build kode produksi...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Gagal mem-build aplikasi!
    pause
    exit /b %errorlevel%
)
echo [OK] Build selesai!
echo.

echo [2/3] Menyiapkan file untuk diunggah...
git add .
set /p commit_msg="Masukkan catatan perubahan (tekan Enter untuk default 'Update aplikasi'): "
if "%commit_msg%"=="" set commit_msg=Update aplikasi

git commit -m "%commit_msg%"
echo.

echo [3/3] Mengunggah (push) ke GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo [ERROR] Gagal push ke GitHub! Periksa koneksi internet Anda.
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo   ✓ BERHASIL! Kode terbaru sudah terunggah ke GitHub.
echo   Situs online akan ter-deploy otomatis dalam ~1 menit.
echo ========================================================
echo.
pause
