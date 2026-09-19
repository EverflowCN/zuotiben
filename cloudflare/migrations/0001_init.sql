PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 100,
  visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subject_id TEXT,
  resource_type TEXT NOT NULL DEFAULT '做题本',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published',
  visible INTEGER NOT NULL DEFAULT 1,
  pinned INTEGER NOT NULL DEFAULT 0,
  release_version TEXT NOT NULL DEFAULT 'v1.0',
  published_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sort_order INTEGER NOT NULL DEFAULT 100,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS resource_versions (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  name TEXT NOT NULL,
  release_version TEXT NOT NULL DEFAULT 'v1.0',
  published_at TEXT,
  format TEXT NOT NULL DEFAULT 'PDF',
  note TEXT NOT NULL DEFAULT '',
  meta_json TEXT NOT NULL DEFAULT '[]',
  current INTEGER NOT NULL DEFAULT 1,
  visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resource_links (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL,
  label TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'link',
  url TEXT NOT NULL DEFAULT '',
  access_code TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (version_id) REFERENCES resource_versions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS errata (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  version_id TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'recorded',
  visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES resource_versions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS experiences (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_url TEXT NOT NULL DEFAULT '',
  school TEXT NOT NULL DEFAULT '',
  major TEXT NOT NULL DEFAULT '',
  year TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published',
  visible INTEGER NOT NULL DEFAULT 1,
  published_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT '更新通知',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published',
  visible INTEGER NOT NULL DEFAULT 1,
  pinned INTEGER NOT NULL DEFAULT 0,
  dismissible INTEGER NOT NULL DEFAULT 1,
  audience TEXT NOT NULL DEFAULT '所有访客',
  publish_at TEXT,
  expires_at TEXT,
  cta_text TEXT NOT NULL DEFAULT '',
  cta_url TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  is_public INTEGER NOT NULL DEFAULT 0,
  resource_id TEXT,
  version_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE SET NULL,
  FOREIGN KEY (version_id) REFERENCES resource_versions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admin_profiles (
  email TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'admin',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_email TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_resources_public ON resources(status, visible, pinned, sort_order, updated_at);
CREATE INDEX IF NOT EXISTS idx_versions_resource ON resource_versions(resource_id, visible, sort_order);
CREATE INDEX IF NOT EXISTS idx_links_version ON resource_links(version_id, visible, sort_order);
CREATE INDEX IF NOT EXISTS idx_errata_resource ON errata(resource_id, visible, updated_at);
CREATE INDEX IF NOT EXISTS idx_announcements_public ON announcements(status, visible, pinned, publish_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_experiences_public ON experiences(status, visible, published_at);

INSERT OR IGNORE INTO subjects (id, name, code, sort_order, visible) VALUES
  ('subject-408', '计算机学科专业基础', '408', 10, 1),
  ('subject-302', '数学二', '302', 20, 1);

INSERT OR IGNORE INTO resources (id, slug, title, subject_id, resource_type, description, status, visible, pinned, release_version, published_at, updated_at, sort_order) VALUES
  ('resource-408-workbook', '408-workbook', '408 做题本', 'subject-408', '做题本', '计算机 408 复习、刷题与知识点整理。', 'published', 1, 0, 'v1.0', '2026-09-19', '2026-09-19', 10),
  ('resource-math2-workbook', 'math2-workbook', '数学二做题本', 'subject-302', '做题本', '数学二刷题、复盘与错题整理。', 'published', 1, 0, 'v1.0', '2026-09-19', '2026-09-19', 20);

INSERT OR IGNORE INTO resource_versions (id, resource_id, name, release_version, published_at, format, note, meta_json, current, visible, sort_order) VALUES
  ('version-408-standard', 'resource-408-workbook', '标准版', 'v1.0', '2026-09-19', 'PDF', '常规阅读与书写版本。', '["PDF","适合平板","普通打印"]', 1, 1, 10),
  ('version-408-print', 'resource-408-workbook', '打印专版', 'v1.0', '2026-09-19', 'PDF', '针对双面打印重新安排分页，需要的位置保留空白页。', '["A4","双面印刷","留空白页"]', 1, 1, 20),
  ('version-math2-standard', 'resource-math2-workbook', '标准版', 'v1.0', '2026-09-19', 'PDF', '适合平板阅读、书写与常规打印。', '["PDF","通用"]', 1, 1, 10),
  ('version-math2-print', 'resource-math2-workbook', '打印专版', 'v1.0', '2026-09-19', 'PDF', '针对纸质双面打印优化分页与留白。', '["A4","双面印刷","留空白页"]', 1, 1, 20);

INSERT OR IGNORE INTO announcements (id, title, kind, body, status, visible, pinned, dismissible, audience, publish_at, updated_at) VALUES
  ('announcement-update', '资源中心持续整理中', '更新通知', '资料会按标准版、平板版、打印专版等分别发布；经验贴与勘误栏目也会逐步补充。', 'published', 1, 1, 1, '所有访客', '2026-09-19T00:00:00Z', '2026-09-19');

INSERT OR IGNORE INTO site_settings (key, value_json) VALUES
  ('public.copy', '{"freeTitle":"全部资源免费公开","freeBody":"本站收录与整理的资源均免费公开，不设置付费门槛。","qqTitle":"更多资料在 QQ 群","qqBody":"更多资料、更新与交流可加入 QQ 群。","qqNumber":"1032998814","progressTitle":"功能持续添加中","progressBody":"资料、经验贴、勘误与更多实用功能会持续补充与完善。"}');
