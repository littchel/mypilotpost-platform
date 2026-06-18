-- Backfill delivery_jobs.user_id using the brand owner's user_id where it is currently NULL
-- This ensures that historical and scheduled jobs can match the users join query in scheduler.js
UPDATE delivery_jobs
SET user_id = (
  SELECT owner_user_id 
  FROM brands 
  WHERE brands.id = delivery_jobs.brand_id
)
WHERE user_id IS NULL;
