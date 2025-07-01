/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Current RLS policies on users table are causing infinite recursion
    - This happens when policies reference the same table they're protecting

  2. Solution
    - Drop existing problematic policies
    - Create new, properly structured policies using auth.uid()
    - Ensure policies don't create circular dependencies

  3. Security
    - Users can only access their own profile data
    - Policies use auth.uid() which directly references the authenticated user's ID
    - No circular table references that could cause recursion
*/

-- Drop existing policies that might be causing recursion
DROP POLICY IF EXISTS "Users can read their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Create new, safe policies using auth.uid()
CREATE POLICY "users_select_own" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "users_insert_own" 
  ON users 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" 
  ON users 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id) 
  WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;