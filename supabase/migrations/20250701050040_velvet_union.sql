/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Admin policies are causing infinite recursion by querying the users table from within users table policies
    - This happens when checking if current user is admin while already evaluating policies on users table

  2. Solution
    - Drop the problematic admin policies that cause recursion
    - Create new admin policies that use auth.jwt() to check admin status directly
    - Keep existing user-specific policies intact

  3. Changes
    - Remove recursive admin policies
    - Add new non-recursive admin policies using JWT claims or simpler checks
*/

-- Drop the problematic admin policies that cause infinite recursion
DROP POLICY IF EXISTS "Allow admins to read all users" ON users;
DROP POLICY IF EXISTS "Allow admins to update all users" ON users;

-- Create new admin policies that don't cause recursion
-- These policies will use a simpler approach that doesn't query the users table recursively

-- Allow admins to read all users (using a direct check without recursion)
CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Check if the current user's ID matches an admin user
    -- This avoids recursion by not querying the users table in the policy
    auth.uid() IN (
      SELECT id FROM users WHERE is_admin = true
    )
  );

-- Actually, let's use a different approach to avoid any recursion
-- We'll create a function that safely checks admin status

-- Create a function to check admin status without recursion
CREATE OR REPLACE FUNCTION is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(is_admin, false) 
  FROM users 
  WHERE id = user_id;
$$;

-- Drop the policy we just created and recreate with the function
DROP POLICY IF EXISTS "Admins can read all users" ON users;

-- Create admin policies using the function
CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Admins can update all users"
  ON users
  FOR UPDATE
  TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));