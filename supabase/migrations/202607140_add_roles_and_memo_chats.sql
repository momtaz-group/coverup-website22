-- 1. Add roles column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roles text NOT NULL DEFAULT 'user';

-- 2. Give admin role to specific emails
UPDATE public.profiles
SET roles = 'admin'
WHERE email IN ('am6291060@gmail.com', 'xabdelrhman090@gmail.com');

-- 3. Update profiles sync trigger function to handle roles
CREATE OR REPLACE FUNCTION public.sync_profile_from_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  default_role text;
BEGIN
  IF lower(new.email) IN ('am6291060@gmail.com', 'xabdelrhman090@gmail.com') THEN
    default_role := 'admin';
  ELSE
    default_role := 'user';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    auth_provider,
    roles,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_app_meta_data ->> 'provider', 'email'),
    default_role,
    coalesce(new.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    auth_provider = excluded.auth_provider,
    roles = CASE
      WHEN lower(excluded.email) IN ('am6291060@gmail.com', 'xabdelrhman090@gmail.com') THEN 'admin'
      ELSE public.profiles.roles
    END,
    updated_at = now();

  RETURN new;
END;
$$;

-- 4. Create admin_credentials table
CREATE TABLE IF NOT EXISTS public.admin_credentials (
  username text PRIMARY KEY,
  password text NOT NULL
);

-- Seed fixed admin credentials
INSERT INTO public.admin_credentials (username, password)
VALUES ('ARiana_GranDy', 'Momtaz_beta3_el_Ma7l')
ON CONFLICT (username) DO UPDATE SET password = excluded.password;

-- Restrict permissions on admin_credentials (only service_role key can read it)
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.admin_credentials TO service_role;

-- 5. Create memo_chats table
CREATE TABLE IF NOT EXISTS public.memo_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'محادثة جديدة',
  summary text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on memo_chats
ALTER TABLE public.memo_chats ENABLE ROW LEVEL SECURITY;

-- Grant permissions on memo_chats
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memo_chats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memo_chats TO service_role;

-- RLS policies
DROP POLICY IF EXISTS "Users can manage their own chats" ON public.memo_chats;
CREATE POLICY "Users can manage their own chats"
  ON public.memo_chats
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view all chats" ON public.memo_chats;
CREATE POLICY "Admins can view all chats"
  ON public.memo_chats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.roles = 'admin'
    )
  );
