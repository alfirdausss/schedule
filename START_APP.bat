@echo off
setlocal
cd /d "%~dp0"
echo ==============================================
echo ALFACOM PRODUCTION - Jadwal Operator
echo ==============================================
echo.
echo Menjalankan server di http://localhost:3000
echo Tekan Ctrl+C untuk menghentikan server.
echo.
npm start
pause
