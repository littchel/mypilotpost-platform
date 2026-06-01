// packages/api/src/core/schedule/queries.js

export const listSchedule = `
SELECT
  id,
  content_type,
  content_id,
  platform,
  scheduled_at,
  status
FROM delivery_jobs
WHERE brand_id = ?
  AND scheduled_at BETWEEN ? AND ?
  AND status != 'cancelled'
ORDER BY scheduled_at ASC
`;

export const insertSchedule = `
INSERT INTO delivery_jobs (
  brand_id,
  content_type,
  content_id,
  platform,
  scheduled_at,
  status,
  campaign_id,
  created_at
) VALUES (?, ?, ?, ?, ?, 'scheduled', ?, datetime('now'))
`;

export const conflictCheck = `
SELECT COUNT(*) as count
FROM delivery_jobs
WHERE brand_id = ?
  AND platform = ?
  AND status = 'scheduled'
  AND ABS(strftime('%s', scheduled_at) - strftime('%s', ?)) < 900
`;

export const cancelSchedule = `
UPDATE delivery_jobs
SET status = 'cancelled'
WHERE id = ? AND brand_id = ?
`;
