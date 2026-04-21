from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import json
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
METRICS_PATH = os.environ.get("METRICS_PATH", str(BASE_DIR / "model" / "metrics.json"))

LABELS = ["SAFE", "AMBIGUOUS", "RISK_LOW", "RISK_HIGH"]
HIGH_RISK_PHRASES = [
    "kill myself",
    "end my life",
    "end it all",
    "take my life",
    "hurt myself",
    "cut myself",
    "suicide",
    "want to die",
    "wish i was dead",
    "wish i were dead",
    "want to disappear",
    "disappear forever",
    "no reason to live",
    "no reason to go on",
]

class PredictIn(BaseModel):
    text: List[str]

class PredictOutItem(BaseModel):
    risk_label: str
    risk_score: float
    probs: List[float]
    version: str

_model = None
_version = ""
_bundle_labels = LABELS


def softmax(x):
    import numpy as np
    e = np.exp(x - x.max(axis=1, keepdims=True))
    return e / e.sum(axis=1, keepdims=True)


def model_labels():
    labels = getattr(_model, "classes_", None)
    if labels is None:
        return LABELS
    return [str(label) for label in labels]


def has_high_risk_phrase(text: str) -> bool:
    normalized = " ".join(text.lower().split())
    return any(phrase in normalized for phrase in HIGH_RISK_PHRASES)


def apply_high_risk_override(text: str, probability_by_label: dict):
    if not has_high_risk_phrase(text):
        return probability_by_label

    score = max(probability_by_label.get("RISK_HIGH", 0.0), 0.95)
    remaining = max(1.0 - score, 0.0)
    other_labels = [label for label in LABELS if label != "RISK_HIGH"]
    other_total = sum(probability_by_label.get(label, 0.0) for label in other_labels)

    adjusted = {"RISK_HIGH": score}
    for label in other_labels:
        if other_total > 0:
            adjusted[label] = remaining * probability_by_label.get(label, 0.0) / other_total
        else:
            adjusted[label] = remaining / len(other_labels)
    return adjusted


def load_model():
    global _model, _version, _bundle_labels
    if _model is not None:
        return
    import joblib
    bundle = joblib.load(MODEL_PATH)
    # If the bundle contains the model directly (common in some joblib dumps) or is a dict
    if isinstance(bundle, dict) and "model" in bundle:
        _model = bundle["model"]
        _bundle_labels = [str(label) for label in bundle.get("labels", LABELS)]
    else:
        _model = bundle
        
    try:
        with open(VERSION_PATH, "r", encoding="utf-8") as f:
            _version = f.read().strip()
    except Exception:
        _version = "unknown"


def load_metrics():
    try:
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


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
        return {
            "ok": True,
            "version": _version,
            "model_labels": model_labels(),
            "display_labels": _bundle_labels,
            "metrics_available": load_metrics() is not None,
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.get("/metrics")
async def metrics():
    load_model()
    data = load_metrics()
    if data is None:
        return {"ok": False, "error": "metrics.json not found"}
    return {"ok": True, "metrics": data}


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
        "metrics_path": METRICS_PATH,
        "metrics_exists": os.path.exists(METRICS_PATH),
    }
    
    if _model is not None:
        result["model_type"] = str(type(_model).__name__)
        result["model_labels"] = model_labels()
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
    labels = model_labels()
    out = []
    for i, text in enumerate(texts):
        probability_by_label = {
            label: float(probs[i][idx]) for idx, label in enumerate(labels)
        }
        probability_by_label = apply_high_risk_override(text, probability_by_label)
        risk_label = max(probability_by_label, key=probability_by_label.get)
        out.append(
            PredictOutItem(
                risk_label=risk_label,
                risk_score=probability_by_label[risk_label],
                probs=[probability_by_label.get(label, 0.0) for label in LABELS],
                version=_version,
            )
        )
    return out
