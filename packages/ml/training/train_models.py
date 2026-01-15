"""
Model Training
==============

Purpose:
- Train explainable baseline models
- Offline only
- Deterministic and reproducible
- NO database access
- NO inference
- NO platform coupling

Input:
- Prepared CSV from dataset_builder.py

Output:
- Serialized model artifacts
- Training metadata
"""

import json
import joblib
import pandas as pd
from pathlib import Path
from datetime import datetime
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline


# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
PREPARED_DIR = BASE_DIR / "prepared"
MODEL_DIR = BASE_DIR / "models"

MODEL_DIR.mkdir(parents=True, exist_ok=True)

LABEL_COLUMN = "engagement_label"

# ------------------------------------------------------------
# Training
# ------------------------------------------------------------

def train_model(input_csv: Path) -> Path:
    """
    Train a baseline regression model and persist it.
    """

    df = pd.read_csv(input_csv)

    if LABEL_COLUMN not in df.columns:
        raise RuntimeError(f"Missing label column: {LABEL_COLUMN}")

    X = df.drop(columns=[LABEL_COLUMN])
    y = df[LABEL_COLUMN]

    numeric_features = X.select_dtypes(include=["float64", "int64"]).columns.tolist()
    categorical_features = X.select_dtypes(include=["object"]).columns.tolist()

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", "passthrough", numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", LinearRegression()),
        ]
    )

    model.fit(X, y)

    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    model_version = f"engagement_model_{timestamp}"

    model_path = MODEL_DIR / f"{model_version}.joblib"
    metadata_path = MODEL_DIR / f"{model_version}.json"

    joblib.dump(model, model_path)

    metadata = {
        "model_version": model_version,
        "label": LABEL_COLUMN,
        "trained_at": timestamp,
        "rows_used": len(df),
        "numeric_features": numeric_features,
        "categorical_features": categorical_features,
        "algorithm": "LinearRegression",
        "explainability": "coefficients + one-hot features",
    }

    metadata_path.write_text(json.dumps(metadata, indent=2))

    return model_path


# ------------------------------------------------------------
# CLI Entry Point
# ------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Train ML models (offline)")
    parser.add_argument(
        "--input",
        required=True,
        help="Prepared dataset CSV from dataset_builder.py",
    )

    args = parser.parse_args()
    input_path = Path(args.input)

    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    model_path = train_model(input_path)
    print(f"✅ Model trained and saved to: {model_path}")
