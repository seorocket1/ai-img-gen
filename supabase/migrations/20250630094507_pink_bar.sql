/*
  # Fix infinite recursion in users table RLS policies

  1. Problem
    - Admin policies were causing infinite recursion by querying the users table within users table policies
    - This happens when checking `users_1.is_admin = true` within a users table policy

  2. Solution
    - Drop the problematic admin policies that cause recursion
    - Keep the simple user policies that work correctly
    - Admin functionality can be handled at the application level instead of RLS level

  3. Security
    - Users can still only read and update their own data
    - Admin checks will be handled in the application code rather than database policies
*/

-- Drop the problematic admin policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Keep the working user policies (these don't cause recursion)
-- "Users can read own data" - (uid() = id)
-- "Users can update own data" - (uid() = id)

-- Note: Admin functionality should be handled at the application level
-- by checking the is_admin field after retrieving the user's own data