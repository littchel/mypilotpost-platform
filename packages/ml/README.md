# Machine Learning Layer (Milestone 6)

This package contains the offline machine learning pipeline for myPilotPost.

Principles:
- ML is advisory only
- ML never owns platform state
- ML never runs inside Workers
- ML outputs are explainable and versioned

Folders:
- schemas/   SQL contracts only (read-only)
- training/  Offline feature extraction & model training
- inference/ Prediction & recommendation generation
- utils/     Shared helpers
