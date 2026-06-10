// markOnboardingStep removed — it used a v1 schema (brand_id PK + boolean step columns)
// that never existed in the actual onboarding_progress table (user_id PK, data TEXT blob).
// Ingest handlers that called this are unwired and do not affect the active onboarding flow.
