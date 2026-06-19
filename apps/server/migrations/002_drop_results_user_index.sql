-- 移除 draft_results(user_id) 次級索引
-- 理由：此 index 唯一用途是加速「個人戰績頁」這類 WHERE user_id = ? 查詢，
-- 但戰績頁不在 MVP 範疇（見範疇邊界）。目前沒有任何 query path 會用到它，
-- 留著只是徒增寫入成本與儲存空間。未來要做戰績頁時再以一行 migration 加回即可。
DROP INDEX IF EXISTS idx_results_user;
