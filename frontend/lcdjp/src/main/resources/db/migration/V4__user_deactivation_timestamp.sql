ALTER TABLE users ADD COLUMN deactivated_at TIMESTAMP NULL;

UPDATE users
   SET deactivated_at = CURRENT_TIMESTAMP
 WHERE deactivated_at IS NULL
   AND (LOWER(approval_status) = 'disabled' OR is_active = FALSE);
