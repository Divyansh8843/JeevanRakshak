import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.utils.class_weight import compute_class_weight
import joblib
import os
import numpy as np

LABELS = ["SAFE", "AMBIGUOUS", "RISK_LOW", "RISK_HIGH"]

def load_data(path: str):
    df = pd.read_csv(path)
    df = df.dropna(subset=["text", "label"]).copy()
    df["label"] = df["label"].str.upper().str.strip()
    df = df[df["label"].isin(LABELS)]
    return df


def train(df: pd.DataFrame, out_dir: str):
    X = df["text"].astype(str).tolist()
    y = df["label"].tolist()

    num_classes = len(LABELS)
    
    min_test_samples = num_classes
    
    
    if len(y) < min_test_samples * 5:  # Heuristic: if less than 5 samples per class needed for 20% split
        test_size_val = min_test_samples / len(y)
    else:
        test_size_val = 0.2

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size_val, random_state=42, stratify=y
    )

    # Class weights for imbalance
    classes = np.asarray(LABELS)
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
                    max_features=50000,
                    strip_accents="unicode",
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    max_iter=2000,
                    class_weight=class_weight,
                    solver="lbfgs",
                    n_jobs=-1,
                    multi_class="auto",
                ),
            ),
        ]
    )

    pipe.fit(X_train, y_train)


    y_pred = pipe.predict(X_test)
    print(classification_report(y_test, y_pred, labels=LABELS))

    os.makedirs(out_dir, exist_ok=True)
    joblib.dump({"model": pipe, "labels": LABELS}, os.path.join(out_dir, "model.joblib"))
    with open(os.path.join(out_dir, "VERSION.txt"), "w", encoding="utf-8") as f:
        f.write("sklearn-1.0.0")


if __name__ == "__main__":
    data_path = os.environ.get("DATA_PATH", "ml/data/sample.csv")
    out_dir = os.environ.get("OUT_DIR", "ml/model")
    df = load_data(data_path)
    train(df, out_dir)


