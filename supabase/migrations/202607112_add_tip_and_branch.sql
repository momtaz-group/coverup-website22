-- Migration to add tip_amount and branch_location to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tip_amount numeric DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS branch_location text;
