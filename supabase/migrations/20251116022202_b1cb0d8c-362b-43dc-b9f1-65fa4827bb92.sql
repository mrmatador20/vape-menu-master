-- Fix critical security issue: Make user_id NOT NULL in orders table
-- This ensures every order is always tied to an authenticated user
ALTER TABLE orders ALTER COLUMN user_id SET NOT NULL;