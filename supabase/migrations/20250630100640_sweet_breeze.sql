/*
  # Fix Row-Level Security policies for users table

  1. Security Policy Updates
    - Drop existing problematic policies
    - Create proper INSERT policy for user sign-up
    - Create proper SELECT policy for user profile access
    - Create proper UPDATE policy for user profile updates

  2. Changes Made
    - Allow users to insert their own profile during sign-up
    - Allow users to read their own profile data
    - Allow users to update their own profile data
    - Ensure policies work with Supabase Auth

  3. Important Notes
    - These policies use auth.uid() which returns the authenticated user's ID
    - The INSERT policy allows users to create their own profile with matching ID
    - The SELECT and UPDATE policies ensure users can only access their own data
*/

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can view their own profile." ON users;
DROP POLICY IF EXISTS "Users can insert their own profile." ON users;

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to insert their own profile during sign-up
CREATE POLICY "Users can insert their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policy for users to read their own profile
CREATE POLICY "Users can read their own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create policy for users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Keep the admin policy for reading all user data
CREATE POLICY "Admins can read all user data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );

-- Create admin policy for updating user data (for credit management)
CREATE POLICY "Admins can update all user data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.is_admin = true
    )
  );