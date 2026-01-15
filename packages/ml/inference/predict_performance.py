"""
Performance Prediction
======================

Purpose:
- Generate performance predictions using trained models
- Offline only
- NO database writes
"""

import joblib
import json
import pandas as pd
from pathlib import Path
from datetime import datetime


def predict(model_path: Path, inference_csv: Path) -> pd.DataFrame:
    model = joblib.load(model_path)
    df = pd.read_csv(inference_csv)

    predictions = model.predict(df)

    result = df.copy()
    result["predicted_value"] = predictions
    result["confidence"] = 0.7  # baseline confidence (improved later)

    result["prediction_type"] = "engagement_score"
    result["trained_at"] = datetime.utcnow().isoformat()
    result["model_version"] = model_path.stem

    return result
