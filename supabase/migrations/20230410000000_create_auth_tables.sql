-- Migration: create_auth_tables.sql

-- Create table for storing authorized users from the spreadsheet
CREATE TABLE authorized_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  client_name TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Add Row Level Security
ALTER TABLE authorized_users ENABLE ROW LEVEL SECURITY;

-- Only allow system service to access this table
CREATE POLICY "Service role can manage authorized_users" 
ON authorized_users FOR ALL 
TO service_role USING (true);

-- Create sync_logs table for tracking credential syncs
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS to sync_logs
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for sync_logs
CREATE POLICY "Service role can manage sync_logs" 
ON sync_logs FOR ALL 
TO service_role USING (true);

-- Create a function to check if a user's password needs updating
CREATE OR REPLACE FUNCTION check_password_needs_update(p_username TEXT, p_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_stored_hash TEXT;
  v_needs_update BOOLEAN;
BEGIN
  -- Get the stored password hash
  SELECT password_hash INTO v_stored_hash
  FROM authorized_users
  WHERE username = p_username;
  
  -- Check if the password hash needs updating
  v_needs_update := NOT (crypt(p_password, v_stored_hash) = v_stored_hash);
  
  RETURN v_needs_update;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;