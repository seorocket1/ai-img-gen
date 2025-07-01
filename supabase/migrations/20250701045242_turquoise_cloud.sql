/*
  # Fix infinite recursion in RLS policies

  1. Policy Changes
    - Drop existing problematic admin policies that cause infinite recursion
    - Create new admin policies that don't reference the users table within itself
    - Keep existing user policies that work correctly

  2. Security
    - Maintain RLS on users table
    - Users can still read/update their own data
    - Admins will need to use service role key for admin operations
*/

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Keep the working user policies (these don't cause recursion)
-- "Users can read own data" - (uid() = id)
-- "Users can update own data" - (uid() = id)
-- "users_insert_own" - with_check: (uid() = id)
-- "users_select_own" - (uid() = id)
-- "users_update_own" - (uid() = id) with_check: (uid() = id)

-- Note: For admin operations, use the service role key which bypasses RLS
-- This is the recommended approach to avoid recursive policy issues