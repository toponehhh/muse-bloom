CREATE TABLE feedback_submissions (
  submission_id TEXT PRIMARY KEY NOT NULL,
  payload_hash TEXT NOT NULL,
  received_at TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  game_version TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('participant-session', 'manual-feedback', 'automated-check')),
  clarity INTEGER NOT NULL CHECK (clarity BETWEEN 1 AND 5),
  readability INTEGER NOT NULL CHECK (readability BETWEEN 1 AND 5),
  visuals INTEGER NOT NULL CHECK (visuals BETWEEN 1 AND 5),
  enjoyment INTEGER NOT NULL CHECK (enjoyment BETWEEN 1 AND 5),
  would_continue TEXT NOT NULL CHECK (would_continue IN ('Yes', 'Maybe', 'No')),
  record_json TEXT NOT NULL CHECK (json_valid(record_json))
);
CREATE INDEX feedback_participant_time ON feedback_submissions(participant_id, received_at DESC);
CREATE INDEX feedback_source_time ON feedback_submissions(source, received_at DESC);
