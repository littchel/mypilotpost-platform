"""
Recommendation Generator
========================

Purpose:
- Turn predictions into ranked, explainable recommendations
- Offline only
"""

import pandas as pd


def generate_recommendations(predictions: pd.DataFrame) -> pd.DataFrame:
    recommendations = predictions.copy()

    recommendations["recommendation_type"] = "content_priority"
    recommendations["recommended_action"] = "publish_with_high_priority"

    recommendations["score"] = recommendations["predicted_value"]
    recommendations["confidence"] = recommendations["confidence"]

    recommendations["explanation"] = recommendations.apply(
        lambda r: {
            "reason": "High predicted engagement",
            "predicted_value": r["predicted_value"],
        },
        axis=1,
    )

    return recommendations
