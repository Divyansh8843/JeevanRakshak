@echo off
REM Train model and run service (Windows)
python -m pip install -r ml\requirements.txt
python ml\train_sklearn.py
python -m uvicorn ml.service.app:app --host 0.0.0.0 --port 8001
