@echo off
echo ============================================
echo   My Business Doctor v4.0 - Build
echo ============================================
echo.
echo Building Windows installer...
call npm run build:win
echo.
echo Done! Check dist/ folder for installer.
pause
