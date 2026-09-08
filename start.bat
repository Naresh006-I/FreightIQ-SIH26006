@echo off
echo ==========================================
echo   FreightIQ - SIH26006
echo   Starting Backend + Frontend
echo ==========================================

echo.
echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "FreightIQ Backend" cmd /k "cd /d %~dp0backend && python run.py"

echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak > nul

echo.
echo [2/2] Starting React Frontend on http://localhost:5173 ...
start "FreightIQ Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ==========================================
echo   Both servers starting!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ==========================================
pause
