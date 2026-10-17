@echo off
title Presensi Wajah Server + Cloudflare Tunnel
echo ========================================================
echo   MENJALANKAN SERVER PRESENSI + CLOUDFLARE TUNNEL (ONLINE)
echo ========================================================
echo.
start "Vite Dev Server" cmd /k "npm run dev"
echo Menunggu Vite siap...
timeout /t 3 >nul
echo.
echo Link publik HTTPS Anda akan muncul di bawah ini:
echo --------------------------------------------------------
.\cloudflared.exe tunnel --url http://localhost:5173
pause
