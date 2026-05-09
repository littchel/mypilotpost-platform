-- seed_growth_rewards.sql
-- Initial rewards for the Growth Engine

-- 1. Bonus Trial Days
INSERT INTO growth_rewards (id, type, value, condition_json)
VALUES ('rew_7days', 'bonus_days', '7', '{"points_required": 200, "level": "Growth"}');

INSERT INTO growth_rewards (id, type, value, condition_json)
VALUES ('rew_30days', 'bonus_days', '30', '{"points_required": 1000, "level": "Pro"}');

-- 2. Feature Unlocks
INSERT INTO growth_rewards (id, type, value, condition_json)
VALUES ('feat_analytics', 'report_unlock', 'advanced_analytics', '{"points_required": 500}');

INSERT INTO growth_rewards (id, type, value, condition_json)
VALUES ('feat_platforms', 'feature_unlock', 'extra_platforms', '{"points_required": 800}');

-- 3. Initial Growth Profile for existing users (Optional migration script)
-- To be run via a worker or manual D1 exec
-- INSERT INTO growth_profiles (id, user_id, brand_id, points, level, referral_code)
-- SELECT lower(hex(randomblob(16))), id, brand_id, 0, 'Starter', upper(substr(hex(randomblob(4)), 1, 8))
-- FROM users JOIN brand_users ON users.id = brand_users.user_id;
