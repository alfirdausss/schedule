@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo ALFACOM PRODUCTION - Install Dependency
echo ==============================================
echo.
echo Pastikan Node.js sudah terpasang.
echo.
npm install
if errorlevel 1 (
  echo.
  echo Instalasi gagal. Periksa koneksi internet dan instalasi Node.js/npm.
  pause
  exit /b 1
)
echo.
echo Dependency selesai dipasang.
echo Selanjutnya jalankan START_APP.bat.
echo Database SQLite akan dibuat otomatis sebagai jadwal.sqlite.
pause
