"""
Dataset Builder
===============

Purpose:
- Prepare training datasets for ML models
- Handle nulls, type casting, encoding
- Deterministic and explainable
- NO database access
- NO model logic

Input:
- CSV output from feature_builder.py

Output:
- Cleaned CSV ready for training
"""

import csv
from pathlib import Path
from typing import List, Dict


# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
INPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR = BASE_DIR / "prepared"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ------------------------------------------------------------
# Feature Definitions
# ------------------------------------------------------------

NUMERIC_FEATURES = {
    "word_count",
    "media_count",
    "hashtag_count",
    "char_count",
    "publish_hour",
    "publish_day_of_week",
    "avg_total_usage",
    "avg_delivered_usage",
    "delivery_success_ratio",
    "delivery_attempts",
    "successful_deliveries",
    "avg_retry_count",
    "delivery_success_rate",
    "avg_rank_position",
    "avg_rank_change",
    "audit_issue_count",
}

CATEGORICAL_FEATURES = {
    "platform",
    "format",
    "locale",
    "brand_industry",
    "plan_tier",
}

LABEL_COLUMNS = {
    "engagement_label",
    "clicks_label",
}


# ------------------------------------------------------------
# Utilities
# ------------------------------------------------------------

def is_float(value: str) -> bool:
    try:
        float(value)
        return True
    except (TypeError, ValueError):
        return False


# ------------------------------------------------------------
# Dataset Preparation
# ------------------------------------------------------------

def prepare_dataset(input_csv: Path) -> Path:
    """
    Clean and encode dataset for ML consumption.
    """

    with open(input_csv, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows:
        raise RuntimeError("Input dataset is empty")

    prepared_rows: List[Dict] = []

    for row in rows:
        clean_row: Dict = {}

        for key, value in row.items():
            if key in NUMERIC_FEATURES or key in LABEL_COLUMNS:
                clean_row[key] = float(value) if is_float(value) else 0.0

            elif key in CATEGORICAL_FEATURES:
                clean_row[key] = value.strip().lower() if value else "unknown"

            else:
                # Pass-through for IDs and non-modeled fields
                clean_row[key] = value

        prepared_rows.append(clean_row)

    output_path = OUTPUT_DIR / f"prepared_{input_csv.name}"

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=prepared_rows[0].keys())
        writer.writeheader()
        writer.writerows(prepared_rows)

    return output_path


# ------------------------------------------------------------
# CLI Entry Point
# ------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Prepare ML training dataset")
    parser.add_argument(
        "--input",
        required=True,
        help="Path to training CSV produced by feature_builder.py",
    )

    args = parser.parse_args()
    input_path = Path(args.input)

    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    output = prepare_dataset(input_path)
    print(f"✅ Prepared dataset written to: {output}")
