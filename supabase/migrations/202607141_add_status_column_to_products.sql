-- Add status column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS status text DEFAULT 'public';
