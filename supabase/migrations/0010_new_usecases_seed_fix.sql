-- Adjust seed values so the same canonical device supports both the "clean"
-- (full cleanup resolves it) and "ambiguous" (minimal cleanup insufficient)
-- ticket-generator variants via the executor's `minimal` flag.
update mock_device_state
set state = '{"used_pct": 94, "threshold_pct": 90, "temp_size_gb": 3.2, "old_logs_size_gb": 1.1, "growth_pattern": "steady", "volume_type": "os"}'
where device_id = 'APPSRV02:C' and product = 'WindowsServer';

update mock_device_state
set state = '{"size_gb": 52, "quota_gb": 50, "deleted_items_gb": 6, "archive_available": true, "large_attachments": [{"message_id": "msg-1", "size_mb": 28}], "growth_pattern": "normal"}'
where device_id = 'kwilliams@corp.example.com' and product = 'ExchangeOnline';
