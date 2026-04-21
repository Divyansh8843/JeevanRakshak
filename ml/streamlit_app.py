from pathlib import Path
import json

import joblib
import numpy as np
import streamlit as st


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "model.joblib"
VERSION_PATH = BASE_DIR / "model" / "VERSION.txt"
METRICS_PATH = BASE_DIR / "model" / "metrics.json"
LABELS = ["SAFE", "AMBIGUOUS", "RISK_LOW", "RISK_HIGH"]

LABEL_DETAILS = {
    "SAFE": {
        "title": "Safe",
        "color": "#1f9d55",
        "summary": "The text does not show obvious signs of self-harm risk.",
    },
    "AMBIGUOUS": {
        "title": "Ambiguous",
        "color": "#b7791f",
        "summary": "The text is unclear or mixed. A careful human review is recommended.",
    },
    "RISK_LOW": {
        "title": "Low Risk",
        "color": "#d97706",
        "summary": "The text may contain mild warning signs or emotional distress.",
    },
    "RISK_HIGH": {
        "title": "High Risk",
        "color": "#dc2626",
        "summary": "The text may contain strong self-harm indicators. Escalate to human support.",
    },
}

SAMPLES = {
    "Safe": "Recently, I am doing well and happy and I hope things get better.",
    "Ambiguous": "Lately, I am struggling a lot and feel lost but I keep going.",
    "High Risk": "Recently, I feel so hopeless and want to end it all.",
}

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


st.set_page_config(
    page_title="JeevanRakshak Risk Detector",
    layout="wide",
    initial_sidebar_state="expanded",
)


def add_styles() -> None:
    st.markdown(
        """
        <style>
        :root {
            --jr-ink: #17202a;
            --jr-muted: #5b6472;
            --jr-line: #d8dee8;
            --jr-surface: #f7f9fb;
            --jr-accent: #0f766e;
        }

        .main .block-container {
            max-width: 1180px;
            padding-top: 2.2rem;
            padding-bottom: 3rem;
        }

        h1, h2, h3 {
            letter-spacing: 0;
            color: var(--jr-ink);
        }

        .jr-kicker {
            color: var(--jr-accent);
            font-size: 0.84rem;
            font-weight: 700;
            letter-spacing: 0.08rem;
            text-transform: uppercase;
            margin-bottom: 0.2rem;
        }

        .jr-subtitle {
            max-width: 780px;
            color: var(--jr-muted);
            font-size: 1.05rem;
            line-height: 1.65;
            margin: 0.4rem 0 1.1rem;
        }

        .jr-result {
            border: 1px solid var(--jr-line);
            border-left: 0.55rem solid var(--risk-color);
            border-radius: 8px;
            background: #ffffff;
            padding: 1.15rem 1.2rem;
            margin: 0.2rem 0 1.1rem;
            box-shadow: 0 10px 28px rgba(23, 32, 42, 0.06);
        }

        .jr-result h2 {
            margin: 0;
            font-size: 1.55rem;
        }

        .jr-result p {
            margin: 0.45rem 0 0;
            color: var(--jr-muted);
            line-height: 1.55;
        }

        .jr-meta {
            color: var(--jr-muted);
            font-size: 0.9rem;
        }

        .jr-note {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background: var(--jr-surface);
            padding: 0.9rem 1rem;
            color: #334155;
            line-height: 1.55;
            margin-top: 0.9rem;
        }

        div[data-testid="stMetric"] {
            background: #ffffff;
            border: 1px solid var(--jr-line);
            border-radius: 8px;
            padding: 0.8rem 0.9rem;
        }

        div[data-testid="stProgress"] > div {
            background-color: #e8edf3;
        }

        .stTextArea textarea {
            min-height: 220px;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


@st.cache_resource(show_spinner="Loading trained model...")
def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model file was not found at {MODEL_PATH}. Run train_sklearn.py first."
        )

    bundle = joblib.load(MODEL_PATH)
    model = bundle.get("model") if isinstance(bundle, dict) else bundle
    labels = bundle.get("labels", LABELS) if isinstance(bundle, dict) else LABELS

    try:
        version = VERSION_PATH.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        version = "unknown"

    return model, list(labels), version


@st.cache_data(show_spinner=False)
def load_metrics():
    if not METRICS_PATH.exists():
        return None
    return json.loads(METRICS_PATH.read_text(encoding="utf-8"))


def softmax(scores: np.ndarray) -> np.ndarray:
    scores = np.asarray(scores)
    if scores.ndim == 1:
        scores = scores.reshape(1, -1)
    exp_scores = np.exp(scores - scores.max(axis=1, keepdims=True))
    return exp_scores / exp_scores.sum(axis=1, keepdims=True)


def model_labels(model, fallback):
    labels = getattr(model, "classes_", None)
    if labels is None:
        return [str(label) for label in fallback]
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


def predict_text(model, labels, text: str):
    output_labels = model_labels(model, labels)
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba([text])[0]
    else:
        probs = softmax(model.decision_function([text]))[0]

    probability_by_label = {
        output_label: float(probs[index]) for index, output_label in enumerate(output_labels)
    }
    probability_by_label = apply_high_risk_override(text, probability_by_label)
    label = max(probability_by_label, key=probability_by_label.get)

    return {
        "label": label,
        "score": probability_by_label[label],
        "probs": [probability_by_label.get(display_label, 0.0) for display_label in labels],
    }


def render_header() -> None:
    st.markdown('<div class="jr-kicker">JeevanRakshak ML</div>', unsafe_allow_html=True)
    st.title("Suicide Risk Detection")
    st.markdown(
        '<p class="jr-subtitle">Analyze text for possible self-harm risk signals using the trained TF-IDF and logistic regression model.</p>',
        unsafe_allow_html=True,
    )


def render_result(result, labels, version: str, trained_labels: list[str]) -> None:
    details = LABEL_DETAILS.get(result["label"], LABEL_DETAILS["AMBIGUOUS"])
    confidence = result["score"]
    st.markdown(
        f"""
        <div class="jr-result" style="--risk-color: {details["color"]};">
            <div class="jr-meta">Predicted label</div>
            <h2>{details["title"]}</h2>
            <p>{details["summary"]}</p>
            <p><strong>Confidence:</strong> {confidence:.1%} &nbsp; <strong>Model:</strong> {version}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.subheader("Probability Breakdown")
    for label, probability in zip(labels, result["probs"]):
        if label not in trained_labels:
            continue
        detail = LABEL_DETAILS.get(label, LABEL_DETAILS["AMBIGUOUS"])
        left, right = st.columns([1, 4])
        left.markdown(f"**{detail['title']}**")
        right.progress(min(max(probability, 0.0), 1.0), text=f"{probability:.1%}")


def render_safety_note() -> None:
    st.markdown(
        """
        <div class="jr-note">
            This tool is a screening aid, not a clinical diagnosis. If someone may be in immediate danger,
            contact local emergency services now. In India, call 112 for emergency assistance. In the United
            States, call or text 988 for the Suicide and Crisis Lifeline.
        </div>
        """,
        unsafe_allow_html=True,
    )


def use_sample_input() -> None:
    st.session_state.input_text = SAMPLES[st.session_state.sample_choice]


def clear_input() -> None:
    st.session_state.input_text = ""


def main() -> None:
    add_styles()
    render_header()

    try:
        model, labels, version = load_model()
    except Exception as exc:
        st.error(str(exc))
        st.stop()
    trained_labels = [label for label in model_labels(model, labels) if label in LABELS]
    metrics = load_metrics()

    with st.sidebar:
        st.header("Model Status")
        st.metric("Version", version)
        st.metric("Trained Labels", len(trained_labels))
        if metrics:
            report = metrics.get("classification_report", {})
            accuracy = report.get("accuracy")
            macro_f1 = report.get("macro avg", {}).get("f1-score")
            if isinstance(accuracy, (int, float)):
                st.metric("Validation Accuracy", f"{accuracy:.2%}")
            if isinstance(macro_f1, (int, float)):
                st.metric("Macro F1", f"{macro_f1:.2%}")
        st.caption(str(MODEL_PATH))
        st.divider()
        st.header("Sample Inputs")
        st.radio(
            "Choose a quick sample",
            list(SAMPLES.keys()),
            index=0,
            key="sample_choice",
        )
        st.button(
            "Use selected sample",
            on_click=use_sample_input,
            use_container_width=True,
        )

    if "input_text" not in st.session_state:
        st.session_state.input_text = SAMPLES["Safe"]

    text = st.text_area(
        "Text to analyze",
        key="input_text",
        placeholder="Paste or type the message you want to evaluate.",
    )

    col_analyze, col_clear = st.columns([1, 1])
    analyze = col_analyze.button("Analyze Text", type="primary", use_container_width=True)
    col_clear.button("Clear", on_click=clear_input, use_container_width=True)

    render_safety_note()

    if analyze:
        cleaned = text.strip()
        if not cleaned:
            st.warning("Please enter text before analyzing.")
            st.stop()

        result = predict_text(model, labels, cleaned)
        st.divider()
        render_result(result, labels, version, trained_labels)


if __name__ == "__main__":
    main()
