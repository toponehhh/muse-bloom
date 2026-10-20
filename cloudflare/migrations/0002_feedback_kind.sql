ALTER TABLE feedback_submissions ADD COLUMN test_type TEXT NOT NULL DEFAULT 'unverified'
  CHECK (test_type IN ('human', 'automated', 'unverified'));
UPDATE feedback_submissions SET test_type = 'automated' WHERE source = 'automated-check';
CREATE INDEX feedback_kind_time ON feedback_submissions(test_type, received_at DESC);
CREATE VIEW human_feedback_submissions AS
  SELECT * FROM feedback_submissions AS candidate
  WHERE candidate.test_type = 'human'
    AND NOT EXISTS (
      SELECT 1 FROM feedback_submissions AS conflicting
      WHERE conflicting.participant_id = candidate.participant_id
        AND conflicting.game_version = candidate.game_version
        AND conflicting.test_type != 'human'
    );
