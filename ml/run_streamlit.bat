@echo off
REM Run the Streamlit UI from the ml folder.
cd /d "%~dp0"
set "PYTHON=python"
if exist "venv\Scripts\python.exe" set "PYTHON=venv\Scripts\python.exe"

"%PYTHON%" -m pip install -r requirements.txt
"%PYTHON%" -m streamlit run streamlit_app.py
