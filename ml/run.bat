@echo off
REM Train model and run service (Windows)
cd /d "%~dp0"
set "PYTHON=python"
if exist "venv\Scripts\python.exe" set "PYTHON=venv\Scripts\python.exe"

"%PYTHON%" -m pip install -r requirements.txt
if not exist "model\model.joblib" "%PYTHON%" train_sklearn.py
"%PYTHON%" -m uvicorn service.app:app --host 0.0.0.0 --port 8001
