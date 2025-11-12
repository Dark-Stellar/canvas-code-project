-- Add unique constraint on draft_tasks to ensure proper upsert behavior
ALTER TABLE draft_tasks 
ADD CONSTRAINT draft_tasks_user_date_unique UNIQUE (user_id, date);