CREATE TABLE feedback_upload_batches (
  submission_id TEXT PRIMARY KEY NOT NULL,
  token_hash TEXT NOT NULL,
  manifest_hash TEXT NOT NULL,
  manifest_json TEXT NOT NULL CHECK(json_valid(manifest_json)),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  committed_at TEXT
);
CREATE INDEX feedback_upload_expiry ON feedback_upload_batches(committed_at, expires_at);
CREATE TABLE feedback_attachments (
  submission_id TEXT NOT NULL REFERENCES feedback_upload_batches(submission_id) ON DELETE CASCADE,
  attachment_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes > 0 AND size_bytes <= 20971520),
  sha256 TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  PRIMARY KEY(submission_id, attachment_id)
);
