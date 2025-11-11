from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import os
import time
from typing import List

app = FastAPI(title="Suicide Risk Detector", version="1.0.0")

MODEL_PATH = os.environ.get("MODEL_PATH", "ml/model/model.joblib")
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
    bundle = joblib.load(MODEL_PATH)
    _model = bundle["model"]
    with open("ml/model/VERSION.txt", "r", encoding="utf-8") as f:
        _version = f.read().strip()


@app.on_event("startup")
async def startup():
    t0 = time.time()
    load_model()
    # Warmup
    try:
        _model.predict(["warmup text"])
    except Exception:
        pass
    print(f"Model loaded in {time.time()-t0:.2f}s")


@app.get("/health")
async def health():
    try:
        load_model()
        return {"ok": True, "version": _version}
    except Exception as e:
        return {"ok": False, "error": str(e)}


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
