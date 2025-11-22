@echo off
echo Starting HexSurvive...
echo.

REM Change to the prototype directory
cd /d "%~dp0prototype"

REM Try to start with Python 3
where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Starting local server with Python...
    echo Game will be available at: http://localhost:8000
    echo.
    echo Press Ctrl+C to stop the server
    echo.
    start http://localhost:8000/index.html
    python -m http.server 8000
) else (
    REM Fallback: open HTML file directly in browser
    echo Python not found. Opening game directly in browser...
    echo Note: Some features may not work without a web server.
    echo.
    start index.html
)

pause
