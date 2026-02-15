"""
Feature Builder
===============

Purpose:
- Execute canonical training SQL
- Produce deterministic, flat training datasets
- NO ML logic
- NO normalization
- READ-ONLY access to database

Used in Milestone 6 (Machine Learning Layer)
"""

import sqlite3
import csv
from datetime import datetime
from pathlib import Path
from typing import Dict


# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[1]
SCHEMA_DIR = BASE_DIR / "schemas"
OUTPUT_DIR = BASE_DIR / "training" / "output"

TRAINING_SQL_FILE = SCHEMA_DIR / "training_data.sql"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ------------------------------------------------------------
# Database Connection (READ-ONLY)
# ------------------------------------------------------------

def get_db_connection(db_path: str) -> sqlite3.Connection:
    """
    Open SQLite/D1 database in read-only mode.
    """
    uri = f"file:{db_path}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    return conn


# ------------------------------------------------------------
# SQL Loader
# ------------------------------------------------------------

def load_sql(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"SQL file not found: {path}")
    return path.read_text()


# ------------------------------------------------------------
# Feature Extraction
# ------------------------------------------------------------

def extract_features(
    db_path: str,
    brand_id: str,
    cutoff_date: str,
    window_days: int,
) -> Path:
    """
    Execute training_data.sql and export result to CSV.

    Returns:
        Path to generated CSV file
    """

    sql = load_sql(TRAINING_SQL_FILE)

    conn = get_db_connection(db_path)

    try:
        cursor = conn.execute(
            sql,
            {
                "brand_id": brand_id,
                "cutoff_date": cutoff_date,
                "window_days": window_days,
            },
        )

        rows = cursor.fetchall()

        if not rows:
            raise RuntimeError(
                f"No training data returned for brand={brand_id}, window={window_days}"
            )

        timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        output_file = (
            OUTPUT_DIR / f"training_{brand_id}_{window_days}d_{timestamp}.csv"
        )

        with open(output_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)

            # Header
            writer.writerow(rows[0].keys())

            # Rows
            for row in rows:
                writer.writerow(list(row))

        return output_file

    finally:
        conn.close()


# ------------------------------------------------------------
# CLI Entry Point
# ------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Build ML training dataset (read-only)"
    )

    parser.add_argument(
        "--db",
        required=True,
        help="Path to SQLite / D1 database file",
    )
    parser.add_argument(
        "--brand",
        required=True,
        help="Brand ID",
    )
    parser.add_argument(
        "--cutoff",
        required=True,
        help="Cutoff date (ISO timestamp, UTC)",
    )
    parser.add_argument(
        "--window",
        type=int,
        default=30,
        help="Lookback window in days (default: 30)",
    )

    args = parser.parse_args()

    output_path = extract_features(
        db_path=args.db,
        brand_id=args.brand,
        cutoff_date=args.cutoff,
        window_days=args.window,
    )

    print(f"✅ Training dataset written to: {output_path}")
