-- ENGINE 19 — Automation & Scheduling Certification
-- Adds compound index on delivery_jobs(status, scheduled_at)
-- for the delivery scheduler query that runs every minute.
-- Without this index, the scheduler does a full table scan 1440x/day.

CREATE INDEX IF NOT EXISTS idx_delivery_jobs_status_scheduled
ON delivery_jobs(status, scheduled_at);
