-- Create email logs table for tracking and idempotency
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text UNIQUE,
  email_type text NOT NULL,
  recipient text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id text,
  order_status text,
  resend_email_id text,
  delivery_status text NOT NULL DEFAULT 'queued',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "email_logs_service_role_all" ON public.email_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant select, insert, update, delete to service role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_logs TO service_role;
