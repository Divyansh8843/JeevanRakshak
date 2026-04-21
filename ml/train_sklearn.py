import json
import pandas as pd
import sklearn
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.utils.class_weight import compute_class_weight
import joblib
import os
from pathlib import Path
import numpy as np

LABELS = ["SAFE", "AMBIGUOUS", "RISK_LOW", "RISK_HIGH"]
BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_PATH = BASE_DIR / "data" / "sample.csv"
DEFAULT_OUT_DIR = BASE_DIR / "model"
TEXT_COLUMNS = ["text", "post", "input", "content", "body", "sentence", "message"]
LABEL_COLUMNS = ["label", "class", "output", "target", "risk", "category", "labels"]
LABEL_ALIASES = {
    "0": "SAFE",
    "1": "AMBIGUOUS",
    "2": "RISK_LOW",
    "3": "RISK_HIGH",
    "4": "RISK_HIGH",
    "safe": "SAFE",
    "normal": "SAFE",
    "not suicide": "SAFE",
    "not suicidal": "SAFE",
    "non suicide": "SAFE",
    "non-suicide": "SAFE",
    "non_suicide": "SAFE",
    "nonsuicidal": "SAFE",
    "not_suicidal": "SAFE",
    "depression": "AMBIGUOUS",
    "depressed": "AMBIGUOUS",
    "ambiguous": "AMBIGUOUS",
    "self harm": "RISK_LOW",
    "self-harm": "RISK_LOW",
    "risk low": "RISK_LOW",
    "risk_low": "RISK_LOW",
    "low": "RISK_LOW",
    "suicide": "RISK_HIGH",
    "suicidal": "RISK_HIGH",
    "risk high": "RISK_HIGH",
    "risk_high": "RISK_HIGH",
    "high": "RISK_HIGH",
}


def read_dataset(path: str) -> pd.DataFrame:
    dataset_path = Path(path)
    suffix = dataset_path.suffix.lower()
    if suffix == ".parquet":
        return pd.read_parquet(dataset_path)
    if suffix in {".json", ".jsonl"}:
        return pd.read_json(dataset_path, lines=suffix == ".jsonl")
    return pd.read_csv(dataset_path)


def choose_column(df: pd.DataFrame, explicit: str | None, candidates: list[str], kind: str) -> str:
    if explicit:
        if explicit not in df.columns:
            raise ValueError(f"{kind} column '{explicit}' was not found. Available columns: {list(df.columns)}")
        return explicit

    lowered = {str(column).lower().strip(): column for column in df.columns}
    for candidate in candidates:
        if candidate in lowered:
            return lowered[candidate]

    raise ValueError(
        f"Could not detect a {kind} column. Set {kind.upper()}_COLUMN in the environment. "
        f"Available columns: {list(df.columns)}"
    )


def normalize_label(value) -> str | None:
    raw = str(value).strip()
    key = raw.lower().replace("-", " ").replace("_", " ")
    key = " ".join(key.split())
    if raw.upper() in LABELS:
        return raw.upper()
    return LABEL_ALIASES.get(key)


def load_data(path: str, text_column: str | None = None, label_column: str | None = None):
    df = read_dataset(path)
    text_col = choose_column(df, text_column, TEXT_COLUMNS, "text")
    label_col = choose_column(df, label_column, LABEL_COLUMNS, "label")

    df = df.rename(columns={text_col: "text", label_col: "label"})
    df = df.dropna(subset=["text", "label"]).copy()
    df["text"] = df["text"].astype(str).str.strip()
    df["label"] = df["label"].map(normalize_label)
    df = df.dropna(subset=["text", "label"])
    df = df[df["label"].isin(LABELS)]
    df = df[df["text"].str.len() > 0]
    if df.empty:
        raise ValueError("No usable rows found after label normalization. Check your LABEL_COLUMN values.")
    return df


def train(df: pd.DataFrame, out_dir: str):
    X = df["text"].astype(str).tolist()
    y = df["label"].tolist()
    label_counts = df["label"].value_counts().to_dict()
    classes = np.asarray([label for label in LABELS if label in label_counts])

    if len(classes) < 2:
        raise ValueError(f"Need at least 2 classes to train. Found: {label_counts}")

    min_test_samples = len(classes)
    if len(y) < min_test_samples * 5:
        test_size_val = min(0.5, min_test_samples / len(y))
    else:
        test_size_val = 0.2
    stratify = y if min(label_counts.values()) >= 2 else None

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size_val, random_state=42, stratify=stratify
    )

    weights = compute_class_weight(
        class_weight="balanced", classes=classes, y=y_train
    )
    class_weight = {cls: float(w) for cls, w in zip(classes, weights)}

    pipe = Pipeline(
        steps=[
            (
                "tfidf",
                TfidfVectorizer(
                    lowercase=True,
                    ngram_range=(1, 2),
                    min_df=1,
                    max_features=int(os.environ.get("MAX_FEATURES", "100000")),
                    strip_accents="unicode",
                    sublinear_tf=True,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    max_iter=2000,
                    class_weight=class_weight,
                    solver="lbfgs",
                ),
            ),
        ]
    )

    pipe.fit(X_train, y_train)


    y_pred = pipe.predict(X_test)
    report_text = classification_report(y_test, y_pred, labels=list(classes), zero_division=0)
    report = classification_report(y_test, y_pred, labels=list(classes), zero_division=0, output_dict=True)
    print(report_text)

    os.makedirs(out_dir, exist_ok=True)
    joblib.dump({"model": pipe, "labels": LABELS, "trained_labels": list(classes)}, os.path.join(out_dir, "model.joblib"))
    with open(os.path.join(out_dir, "VERSION.txt"), "w", encoding="utf-8") as f:
        f.write(f"sklearn-{sklearn.__version__}")
    with open(os.path.join(out_dir, "metrics.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "sklearn_version": sklearn.__version__,
                "rows": len(df),
                "label_counts": label_counts,
                "trained_labels": list(classes),
                "classification_report": report,
            },
            f,
            indent=2,
        )


if __name__ == "__main__":
    data_path = os.environ.get("DATA_PATH", str(DEFAULT_DATA_PATH))
    out_dir = os.environ.get("OUT_DIR", str(DEFAULT_OUT_DIR))
    text_column = os.environ.get("TEXT_COLUMN")
    label_column = os.environ.get("LABEL_COLUMN")
    df = load_data(data_path, text_column=text_column, label_column=label_column)
    train(df, out_dir)


