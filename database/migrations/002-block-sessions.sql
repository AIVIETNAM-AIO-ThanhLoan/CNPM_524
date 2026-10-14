-- Blocking a user revokes every existing session, even if later unblocked.
CREATE TRIGGER invalidate_sessions_after_block
AFTER UPDATE ON users FOR EACH ROW
DELETE FROM sessions WHERE user_id = NEW.id AND NEW.blocked = TRUE;
