@echo off
:: run.bat - Script to run the E-Oscar dispute review automation on Windows

:: Set the working directory to the script location
cd /d "%~dp0\.."

:: Set default log directory if not in environment
if not defined LOG_PATH set LOG_PATH=.\logs
if not exist "%LOG_PATH%" mkdir "%LOG_PATH%"

:: Log file with timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set DATESTAMP=%%c-%%a-%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set TIMESTAMP=%%a%%b)
set LOG_FILE=%LOG_PATH%\e-oscar-dispute-review_%DATESTAMP%_%TIMESTAMP%.log

:: Function to log messages to console and file
echo [%date% %time%] INFO: Starting E-Oscar dispute review automation... >> "%LOG_FILE%"
echo INFO: Starting E-Oscar dispute review automation...

:: Run the application
node src/index.js >> "%LOG_FILE%" 2>&1
set EXIT_CODE=%ERRORLEVEL%

if %EXIT_CODE% == 0 (
  echo [%date% %time%] INFO: E-Oscar dispute review automation completed successfully >> "%LOG_FILE%"
  echo INFO: E-Oscar dispute review automation completed successfully
) else (
  echo [%date% %time%] ERROR: E-Oscar dispute review automation failed with exit code %EXIT_CODE% >> "%LOG_FILE%"
  echo ERROR: E-Oscar dispute review automation failed with exit code %EXIT_CODE%
)

:: Clean up old logs (keep only last 7 days)
forfiles /p "%LOG_PATH%" /m "e-oscar-dispute-review_*.log" /d -7 /c "cmd /c del @path" 2>nul

exit /b %EXIT_CODE%
