/*
  # User Management and Credit System

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `brand_name` (text)
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
      - `title` (text)
      - `content` (text)
      - `style` (text, optional)
      - `colour` (text, optional)
      - `credits_used` (integer)
      - `image_data` (text - base64)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for user data access
    - Add admin policies for user management
*/

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

-- Users can read and update their own data
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

-- Admins can read all users
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

-- Admins can update all users
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

-- Users can read their own image generations
CREATE POLICY "Users can read own generations"
  ON image_generations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own image generations
CREATE POLICY "Users can insert own generations"
  ON image_generations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can read all image generations
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
  -- Check if this is the first user
  IF (SELECT COUNT(*) FROM users) = 1 THEN
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