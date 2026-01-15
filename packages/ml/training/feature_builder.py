"""
Feature Builder
================

Purpose:
- Execute canonical training SQL
- Produce deterministic, flat training datasets
- NO ML logic
- NO normalization
- READ-ONLY access to database

Used in Milestone 6 (Machine Learning Layer)
"""

import os
import sqlite3
import csv
from datetime import datetime
from pathlib import Path

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
    return sqlite3.connect(uri, uri=True)


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
    Execute training_data.sql an_
