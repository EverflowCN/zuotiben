PRAGMA foreign_keys = ON;

ALTER TABLE files ADD COLUMN external_url TEXT NOT NULL DEFAULT '';
ALTER TABLE files ADD COLUMN usage_note TEXT NOT NULL DEFAULT '';
ALTER TABLE files ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';

UPDATE files
SET updated_at = CASE
  WHEN updated_at IS NULL OR updated_at = '' THEN COALESCE(created_at, CURRENT_TIMESTAMP)
  ELSE updated_at
END;

CREATE INDEX IF NOT EXISTS idx_files_updated ON files(updated_at, created_at);
CREATE INDEX IF NOT EXISTS idx_files_resource ON files(resource_id, version_id);
