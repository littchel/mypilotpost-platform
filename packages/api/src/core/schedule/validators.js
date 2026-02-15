// packages/api/src/core/schedule/validators.js

export async function assertNoConflict(db, brandId, platform, scheduledAt) {
  const res = await db
    .prepare(
      `SELECT COUNT(*) as count
       FROM delivery_jobs
       WHERE brand_id = ?
         AND platform = ?
         AND status = 'scheduled'
         AND ABS(strftime('%s', scheduled_at) - strftime('%s', ?)) < 900`
    )
    .bind(brandId, platform, scheduledAt)
    .first();

  if (res.count > 0) {
    const err = new Error("Scheduling conflict on this platform");
    err.status = 409;
    throw err;
  }
}
