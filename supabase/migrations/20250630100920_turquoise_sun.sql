/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Current admin policies create infinite recursion by querying the users table within the policy itself
    - This happens when checking `users.is_admin = true` in a policy that applies to the users table

  2. Solution
    - Drop the problematic admin policies that cause recursion
    - Keep the simple, safe policies for users to manage their own data
    - Admin functionality should be handled at the application level or through service role

  3. Changes
    - Remove recursive admin policies
    - Keep basic user self-access policies
    - Ensure no circular dependencies in policy definitions
*/

-- Drop all existing policies on users table to start fresh
DROP POLICY IF EXISTS "Admins can read all user data" ON users;
DROP POLICY IF EXISTS "Admins can update all user data" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can read their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Create simple, non-recursive policies
CREATE POLICY "Users can insert their own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read their own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Note: Admin functionality should be handled through service role or application logic
-- rather than through RLS policies to avoid recursion issues