from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import os
import time
from typing import List

app = FastAPI(title="Suicide Risk Detector", version="1.0.0")

from pathlib import Path

# Determine base directory - handles both local dev and Render deployment
# In Render, rootDir=ml, so __file__ is ml/service/app.py, parent.parent goes to root
# In local dev, same calculation applies
BASE_DIR = Path(__file__).resolve().parent.parent  # Goes from ml/service/app.py -> ml/

# Use environment variable if set (for flexibility), otherwise use calculated path
MODEL_PATH = os.environ.get("MODEL_PATH", str(BASE_DIR / "model" / "model.joblib"))
VERSION_PATH = os.environ.get("VERSION_PATH", str(BASE_DIR / "model" / "VERSION.txt"))

LABELS = ["SAFE", "AMBIGUOUS", "RISK_LOW", "RISK_HIGH"]

class PredictIn(BaseModel):
    text: List[str]

class PredictOutItem(BaseModel):
    risk_label: str
    risk_score: float
    probs: List[float]
    version: str

_model = None
_version = ""


def softmax(x):
    import numpy as np
    e = np.exp(x - x.max(axis=1, keepdims=True))
    return e / e.sum(axis=1, keepdims=True)


def load_model():
    global _model, _version
    if _model is not None:
        return
    import joblib
    bundle = joblib.load(MODEL_PATH)
    # If the bundle contains the model directly (common in some joblib dumps) or is a dict
    if isinstance(bundle, dict) and "model" in bundle:
        _model = bundle["model"]
    else:
        _model = bundle
        
    try:
        with open(VERSION_PATH, "r", encoding="utf-8") as f:
            _version = f.read().strip()
    except Exception:
        _version = "unknown"


@app.on_event("startup")
async def startup():
    global _model
    t0 = time.time()
    try:
        load_model()
        # Warmup with safe error handling
        try:
            _model.predict(["warmup text"])
        except Exception as warmup_err:
            print(f"Warmup error (non-fatal): {warmup_err}")
        print(f"✓ Model loaded successfully in {time.time()-t0:.2f}s from {MODEL_PATH}")
    except Exception as e:
        print(f"✗ CRITICAL: Model failed to load: {e}")
        import traceback
        traceback.print_exc()
        # Don't exit - let app start so /health endpoint can report the error


@app.get("/health")
async def health():
    try:
        load_model()
        return {"ok": True, "version": _version}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.get("/check-model")
async def check_model():
    """Diagnostic endpoint to check model status and file paths"""
    import os
    result = {
        "model_loaded": _model is not None,
        "model_path": MODEL_PATH,
        "model_exists": os.path.exists(MODEL_PATH),
        "version": _version,
        "version_path": VERSION_PATH,
        "version_exists": os.path.exists(VERSION_PATH),
    }
    
    if _model is not None:
        result["model_type"] = str(type(_model).__name__)
        try:
            # Check if TF-IDF is fitted
            result["tfidf_fitted"] = hasattr(_model.named_steps.get("tfidf"), "idf_")
        except Exception as e:
            result["tfidf_check_error"] = str(e)
    
    return result


@app.post("/predict", response_model=List[PredictOutItem])
async def predict(inp: PredictIn):
    load_model()
    texts = [t if isinstance(t, str) else str(t) for t in inp.text]
    # Get decision function if available, else probabilities
    try:
        # For LogisticRegression, predict_proba is available
        import numpy as np
        probs = _model.predict_proba(texts)
    except Exception:
        # For models without predict_proba (e.g., LinearSVC), approximate via decision_function
        df = _model.decision_function(texts)
        probs = softmax(df)
    preds = probs.argmax(axis=1)
    out = []
    for i, p in enumerate(preds):
        out.append(
            PredictOutItem(
                risk_label=LABELS[int(p)],
                risk_score=float(probs[i][int(p)]),
                probs=[float(x) for x in probs[i]],
                version=_version,
            )
        )
    return out
