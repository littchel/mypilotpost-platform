"""
Model Evaluation
================

Purpose:
- Evaluate trained ML models offline
- Measure accuracy and stability
- Detect basic data drift
- NO database access
- NO inference
- NO writes to platform state

Inputs:
- Prepared dataset CSV
- Trained model artifact (.joblib)

Outputs:
- Evaluation report (JSON)
"""

import json
import joblib
import pandas as pd
from pathlib import Path
from datetime import datetime
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
EVAL_DIR = BASE_DIR / "evaluation"

EVAL_DIR.mkdir(parents=True, exist_ok=True)

LABEL_COLUMN = "engagement_label"


# ------------------------------------------------------------
# Evaluation Logic
# ------------------------------------------------------------

def evaluate_model(model_path: Path, dataset_csv: Path) -> Path:
    """
    Evaluate a trained model against a prepared dataset.
    """

    model = joblib.load(model_path)
    df = pd.read_csv(dataset_csv)

    if LABEL_COLUMN not in df.columns:
        raise RuntimeError(f"Missing label column: {LABEL_COLUMN}")

    X = df.drop(columns=[LABEL_COLUMN])
    y_true = df[LABEL_COLUMN]

    y_pred = model.predict(X)

    metrics = {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "mse": float(mean_squared_error(y_true, y_pred)),
        "rmse": float(mean_squared_error(y_true, y_pred, squared=False)),
        "r2": float(r2_score(y_true, y_pred)),
    }

    # --------------------------------------------------------
    # Simple Drift Signals (Heuristic, Explainable)
    # --------------------------------------------------------

    drift_signals = {}

    for col in X.select_dtypes(include=["float64", "int64"]).columns:
        drift_signals[col] = {
            "mean": float(X[col].mean()),
            "stddev": float(X[col].std()),
        }

    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    report = {
        "model_file": model_path.name,
        "dataset_file": dataset_csv.name,
        "evaluated_at": timestamp,
        "rows_evaluated": len(df),
        "metrics": metrics,
        "feature_statistics": drift_signals,
        "evaluation_notes": [
            "Offline evaluation only",
            "Metrics are observational",
            "No automated decisions should be made from this report",
        ],
    }

    report_path = EVAL_DIR / f"evaluation_{model_path.stem}_{timestamp}.json"
    report_path.write_text(json.dumps(report, indent=2))

    return report_path


# ------------------------------------------------------------
# CLI Entry Point
# ------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Evaluate trained ML model")
    parser.add_argument(
        "--model",
        required=True,
        help="Path to trained model (.joblib)",
    )
    parser.add_argument(
        "--data",
        required=True,
        help="Prepared dataset CSV",
    )

    args = parser.parse_args()

    model_path = Path(args.model)
    data_path = Path(args.data)

    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")

    if not data_path.exists():
        raise FileNotFoundError(f"Dataset file not found: {data_path}")

    report = evaluate_model(model_path, data_path)
    print(f"✅ Evaluation report written to: {report}")
