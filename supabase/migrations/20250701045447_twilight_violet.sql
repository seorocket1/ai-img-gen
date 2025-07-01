/*
  # Fix User Table RLS Policies

  1. Security Updates
    - Drop existing policies with incorrect uid() function
    - Create new policies using correct auth.uid() function
    - Ensure proper permissions for user profile management

  2. Policy Changes
    - Allow authenticated users to insert their own profile
    - Allow authenticated users to read their own profile
    - Allow authenticated users to update their own profile
    - Keep admin policies for administrative access
*/

-- Drop existing policies that use incorrect uid() function
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Create correct policies using auth.uid()
CREATE POLICY "Allow users to insert their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow users to read their own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to read all user data
CREATE POLICY "Allow admins to read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to update all user data
CREATE POLICY "Allow admins to update all users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND is_admin = true
    )
  );