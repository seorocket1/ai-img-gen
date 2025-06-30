/*
  # Complete Database Schema Setup with Conflict Resolution

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `brand_name` (text, optional)
      - `website_url` (text, optional)
      - `user_id` (text, unique - custom user ID)
      - `password_hash` (text)
      - `credits` (integer, default 100)
      - `is_admin` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `image_generations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `image_type` (text - 'blog' or 'infographic')
      - `title` (text, optional)
      - `content` (text, optional)
      - `style` (text, optional)
      - `colour` (text, optional)
      - `credits_used` (integer)
      - `image_data` (text - base64)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for user data access
    - Add admin policies for user management

  3. Functions and Triggers
    - Auto-update timestamp function
    - First user admin assignment function
*/

-- Drop existing policies if they exist to avoid conflicts
DO $$ 
BEGIN
    -- Drop policies for users table
    DROP POLICY IF EXISTS "Users can read own data" ON users;
    DROP POLICY IF EXISTS "Users can update own data" ON users;
    DROP POLICY IF EXISTS "Admins can read all users" ON users;
    DROP POLICY IF EXISTS "Admins can update all users" ON users;
    
    -- Drop policies for image_generations table
    DROP POLICY IF EXISTS "Users can read own generations" ON image_generations;
    DROP POLICY IF EXISTS "Users can insert own generations" ON image_generations;
    DROP POLICY IF EXISTS "Admins can read all generations" ON image_generations;
EXCEPTION
    WHEN undefined_object THEN
        NULL; -- Ignore if policies don't exist
END $$;

-- Drop existing triggers and functions if they exist
DO $$
BEGIN
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    DROP TRIGGER IF EXISTS set_first_user_admin ON users;
    DROP FUNCTION IF EXISTS update_updated_at_column();
    DROP FUNCTION IF EXISTS set_first_user_as_admin();
EXCEPTION
    WHEN undefined_object THEN
        NULL; -- Ignore if they don't exist
END $$;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  brand_name text,
  website_url text,
  user_id text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  credits integer DEFAULT 100,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS image_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  image_type text NOT NULL CHECK (image_type IN ('blog', 'infographic')),
  title text,
  content text,
  style text,
  colour text,
  credits_used integer NOT NULL,
  image_data text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_generations ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
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

CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update all users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create policies for image_generations table
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

CREATE POLICY "Admins can read all generations"
  ON image_generations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to set first user as admin
CREATE OR REPLACE FUNCTION set_first_user_as_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first user (count = 0 before insert)
  IF (SELECT COUNT(*) FROM users) = 0 THEN
    NEW.is_admin = true;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to set first user as admin
CREATE TRIGGER set_first_user_admin
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_first_user_as_admin();