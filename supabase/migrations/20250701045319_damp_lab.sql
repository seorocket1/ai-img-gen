/*
  # Database Cleanup and Alignment with Webapp

  1. Schema Analysis and Fixes
    - Fix users table structure to match webapp expectations
    - Ensure proper constraints and indexes
    - Fix RLS policies to avoid infinite recursion
    - Add missing username column and constraints
    - Remove password_hash (using Supabase Auth instead)
    - Fix user_id field (should be username, not separate field)

  2. Security
    - Proper RLS policies without recursion
    - Correct admin access patterns
    - Secure image generation access

  3. Performance
    - Add necessary indexes
    - Optimize for webapp usage patterns
*/

-- First, let's clean up any existing problematic policies and structures
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "Users can read own generations" ON image_generations;
DROP POLICY IF EXISTS "Users can insert own generations" ON image_generations;
DROP POLICY IF EXISTS "Admins can read all generations" ON image_generations;

-- Drop existing triggers and functions to recreate them properly
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS set_first_user_admin ON users;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS set_first_user_as_admin() CASCADE;

-- Fix the users table structure to match webapp expectations
-- The webapp expects: id, email, name, brand_name, website_url, username, credits, is_admin, created_at, updated_at
-- Remove password_hash (using Supabase Auth) and fix user_id to be username

-- Add username column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username text;
  END IF;
END $$;

-- Remove password_hash column if it exists (we use Supabase Auth)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users DROP COLUMN password_hash;
  END IF;
END $$;

-- Fix user_id column - it should be username, so let's rename it if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users RENAME COLUMN user_id TO username;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'user_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    -- Both exist, drop user_id and keep username
    ALTER TABLE users DROP COLUMN user_id;
  END IF;
END $$;

-- Ensure username is NOT NULL and UNIQUE
ALTER TABLE users ALTER COLUMN username SET NOT NULL;

-- Drop existing constraints that might conflict
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_user_id_key') THEN
    ALTER TABLE users DROP CONSTRAINT users_user_id_key;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_username_key') THEN
    ALTER TABLE users DROP CONSTRAINT users_username_key;
  END IF;
END $$;

-- Add unique constraint for username
ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);

-- Ensure all required columns exist with proper defaults
ALTER TABLE users ALTER COLUMN credits SET DEFAULT 100;
ALTER TABLE users ALTER COLUMN is_admin SET DEFAULT false;
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT now();

-- Create proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users (username); -- For backward compatibility

-- Ensure image_generations table is properly structured
CREATE INDEX IF NOT EXISTS idx_image_generations_user_id ON image_generations (user_id);
CREATE INDEX IF NOT EXISTS idx_image_generations_created_at ON image_generations (created_at DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_generations ENABLE ROW LEVEL SECURITY;

-- Create safe RLS policies for users table (no infinite recursion)
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to insert their own profile (for sign up)
CREATE POLICY "users_insert_own"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Additional policies for completeness
CREATE POLICY "users_select_own"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Image generation policies
CREATE POLICY "Users can read own generations"
  ON image_generations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own generations"
  ON image_generations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin policy for image generations (safe - doesn't query users table recursively)
CREATE POLICY "Admins can read all generations"
  ON image_generations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Create functions for triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION set_first_user_as_admin()
RETURNS TRIGGER AS $$
DECLARE
  user_count integer;
BEGIN
  -- Check if this is the first user (count existing users)
  SELECT COUNT(*) INTO user_count FROM users;
  
  -- If this is the first user, make them admin
  IF user_count = 0 THEN
    NEW.is_admin = true;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_first_user_admin
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_first_user_as_admin();

-- Clean up any orphaned data or inconsistencies
-- Remove any users without proper email or username
DELETE FROM users WHERE email IS NULL OR email = '' OR username IS NULL OR username = '';

-- Remove any image generations without proper user_id or image_data
DELETE FROM image_generations WHERE user_id IS NULL OR image_data IS NULL OR image_data = '';

-- Ensure image_type values are valid
UPDATE image_generations SET image_type = 'blog' WHERE image_type NOT IN ('blog', 'infographic');

-- Set default credits for any users without credits
UPDATE users SET credits = 100 WHERE credits IS NULL;

-- Set default admin status
UPDATE users SET is_admin = false WHERE is_admin IS NULL;

-- Ensure timestamps are set
UPDATE users SET created_at = now() WHERE created_at IS NULL;
UPDATE users SET updated_at = now() WHERE updated_at IS NULL;
UPDATE image_generations SET created_at = now() WHERE created_at IS NULL;