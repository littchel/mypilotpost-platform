-- verify-db.sql

SELECT name FROM sqlite_master WHERE type='table';

-- identity tables
SELECT name FROM sqlite_master WHERE name='users';
SELECT name FROM sqlite_master WHERE name='brands';
SELECT name FROM sqlite_master WHERE name='brand_users';

-- admin system
SELECT name FROM sqlite_master WHERE name='customers';
SELECT name FROM sqlite_master WHERE name='billing';
SELECT name FROM sqlite_master WHERE name='usage_metrics';
SELECT name FROM sqlite_master WHERE name='missions';

-- analytics
SELECT name FROM sqlite_master WHERE name='analytics_events';
SELECT name FROM sqlite_master WHERE name='analytics_daily';

-- delivery system
SELECT name FROM sqlite_master WHERE name='delivery_jobs';