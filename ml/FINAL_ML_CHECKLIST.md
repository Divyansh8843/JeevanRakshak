# Final ML Checklist

## Current Model

- Dataset: `data/Suicide_Detection.csv` from Kaggle.
- Rows trained: 232,074.
- Labels trained: `SAFE`, `RISK_HIGH`.
- Validation accuracy: 94.25%.
- Macro F1: 94.25%.
- High-risk recall: 93.30%.

## Run Locally

```powershell
cd ml
.\venv\Scripts\activate
python -m uvicorn service.app:app --host 0.0.0.0 --port 8001
```

```powershell
cd ml
.\venv\Scripts\activate
python -m streamlit run streamlit_app.py
```

## Verify

- API health: `http://localhost:8001/health`
- API metrics: `http://localhost:8001/metrics`
- Streamlit UI: `http://localhost:8501`
- Node-to-ML health: `http://localhost:8080/api/risk/health`

## Production Notes

- Do not claim 100% real-world accuracy. Use the validation metrics above.
- Keep `model/model.joblib`, `model/VERSION.txt`, and `model/metrics.json` deployed together.
- Do not commit the large Kaggle CSV unless your Git hosting supports large files.
- The model is a screening aid, not a diagnosis. Keep human review and emergency guidance in the product.
