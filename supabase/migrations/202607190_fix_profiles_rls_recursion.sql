-- Fix infinite recursion on profiles table
-- Run this in Supabase SQL Editor

-- 1. Create a SECURITY DEFINER helper function to check admin status (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin_user(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = uid AND profiles.roles = 'admin'
  );
$$;

-- 2. Drop ALL existing policies on profiles to start clean
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.profiles;

-- 3. Recreate safe policies that NEVER query profiles from within profiles
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- 4. Fix memo_chats admin policy to use the SECURITY DEFINER function
DROP POLICY IF EXISTS "Admins can view all chats" ON public.memo_chats;
CREATE POLICY "Admins can view all chats"
  ON public.memo_chats
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));
