@echo off
echo ============================================
echo  나만의 경영박사 — Sample Data Loader
echo ============================================
echo.

:: Find the database
set "DB_PATH=%APPDATA%\gyeongyang-baksa\inventory.sqlite"
if not exist "%DB_PATH%" (
  set "DB_PATH=%APPDATA%\my-business-doctor\inventory.sqlite"
)
if not exist "%DB_PATH%" (
  echo ❌ Database not found!
  echo    Please run the app once first, then run this script.
  echo    Looked in: %APPDATA%\gyeongyang-baksa\
  pause
  exit /b 1
)

echo Found DB: %DB_PATH%
echo.
echo ⚠️  This will add sample data to your database.
echo    Use on a FRESH database only (to avoid duplicates).
echo.
set /p CONFIRM=Continue? (Y/N): 
if /i not "%CONFIRM%"=="Y" exit /b 0

echo.
echo Loading data...
node seed-load.js
echo.
pause
