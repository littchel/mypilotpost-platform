"""
Export ML Outputs
=================

Purpose:
- Persist ML outputs to D1 ML tables
- Append-only
- ML-owned writes ONLY
"""

import sqlite3
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict
import pandas as pd


def export_predictions(
    db_path: str,
    predictions: pd.DataFrame,
    brand_id: str,
):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    for _, row in predictions.iterrows():
        cursor.execute(
            """
            INSERT INTO ml_predictions (
              id,
              brand_id,
              subject_type,
              subject_id,
              prediction_type,
              predicted_value,
              confidence,
              baseline_value,
              reference_window_days,
              model_version,
              trained_at,
              explanation,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                brand_id,
                "content",
                row.get("content_id"),
                row["prediction_type"],
                float(row["predicted_value"]),
                float(row["confidence"]),
                None,
                30,
                row["model_version"],
                row["trained_at"],
                json.dumps(
                    {
                        "explanation": "Baseline linear regression prediction",
                    }
                ),
                datetime.utcnow().isoformat(),
            ),
        )

    conn.commit()
    conn.close()


def export_recommendations(
    db_path: str,
    recommendations: pd.DataFrame,
    brand_id: str,
):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    for _, row in recommendations.iterrows():
        cursor.execute(
            """
            INSERT INTO ml_recommendations (
              id,
              brand_id,
              recommendation_type,
              target_type,
              target_id,
              recommended_action,
              score,
              confidence,
              explanation,
              model_version,
              trained_at,
              created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid.uuid4()),
                brand_id,
                row["recommendation_type"],
                "content",
                row.get("content_id"),
                row["recommended_action"],
                float(row["score"]),
                float(row["confidence"]),
                json.dumps(row["explanation"]),
                row["model_version"],
                row["trained_at"],
                datetime.utcnow().isoformat(),
            ),
        )

    conn.commit()
    conn.close()
