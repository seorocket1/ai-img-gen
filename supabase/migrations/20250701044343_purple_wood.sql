/*
  # Add username column to users table

  1. Changes
    - Add `username` column to `users` table
    - Set it as unique and not null
    - Create index for performance
    - Populate existing users with username based on user_id
  
  2. Security
    - No RLS changes needed as existing policies will apply
*/

-- Add username column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username text;
  END IF;
END $$;

-- Populate username for existing users (use user_id as fallback)
UPDATE users 
SET username = user_id 
WHERE username IS NULL;

-- Make username not null and unique
ALTER TABLE users ALTER COLUMN username SET NOT NULL;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_username_key' AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);