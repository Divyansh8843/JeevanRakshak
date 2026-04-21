# Dataset Guide

The bundled `data/sample.csv` is only a demo dataset. It is useful for checking that
the pipeline runs, but it is too small and template-like for a final mental-health
classifier.

## Recommended Dataset

For a stronger binary project, start with Kaggle's **Suicide and Depression Detection**
dataset by Nikhileswar Komati. It contains about 232k Reddit posts with `text` and
`class` columns. The trainer automatically maps `suicide` to `RISK_HIGH` and
`non-suicide` / `not suicidal` to `SAFE`.

Download the CSV into `ml/data/`, then train with:

```powershell
$env:DATA_PATH="data/Suicide_Detection.csv"
$env:TEXT_COLUMN="text"
$env:LABEL_COLUMN="class"
.\venv\Scripts\python.exe train_sklearn.py
```

For Hugging Face datasets, export or download a CSV with text and label columns, then
set `DATA_PATH`, `TEXT_COLUMN`, and `LABEL_COLUMN` the same way.

## Notes

High validation accuracy on Reddit data does not guarantee clinical accuracy. For a
responsible project, report macro F1, recall for `RISK_HIGH`, confusion matrix results,
and limitations. Keep human review and crisis escalation in the product flow.
