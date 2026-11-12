ALTER TABLE spd_sync_log
  ADD COLUMN failure_message VARCHAR(1000) NULL,
  ADD COLUMN failure_code VARCHAR(64) NULL,
  ADD COLUMN http_status SMALLINT NULL,
  ADD KEY idx_spd_order_failures (tenant_id, instance_id, direction, kind, state, created_time);
