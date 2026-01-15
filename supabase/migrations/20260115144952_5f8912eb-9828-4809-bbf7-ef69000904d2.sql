-- Add username column to profiles table
ALTER TABLE public.profiles ADD COLUMN username text UNIQUE;

-- Create index for faster username lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Add constraint for valid usernames (lowercase, alphanumeric, underscores, 3-20 chars)
ALTER TABLE public.profiles ADD CONSTRAINT valid_username 
  CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');