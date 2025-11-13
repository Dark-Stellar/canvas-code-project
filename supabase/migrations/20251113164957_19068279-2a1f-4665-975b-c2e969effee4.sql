-- Add length constraints to protect against malicious input

-- Constraint for daily_reports notes (max 5000 characters)
ALTER TABLE daily_reports 
ADD CONSTRAINT check_notes_length 
CHECK (length(notes) <= 5000);

-- Constraint for templates description (max 500 characters)
ALTER TABLE templates 
ADD CONSTRAINT check_description_length 
CHECK (length(description) <= 500);

-- Constraint for templates title (max 200 characters)
ALTER TABLE templates 
ADD CONSTRAINT check_title_length 
CHECK (length(title) <= 200 AND length(title) > 0);

-- Add comment explaining the security constraints
COMMENT ON CONSTRAINT check_notes_length ON daily_reports IS 'Prevents malicious input: notes limited to 5000 characters';
COMMENT ON CONSTRAINT check_description_length ON templates IS 'Prevents malicious input: description limited to 500 characters';
COMMENT ON CONSTRAINT check_title_length ON templates IS 'Prevents malicious input: title must be 1-200 characters';