-- Add preferred_language to profiles table
ALTER TABLE public.profiles 
ADD COLUMN preferred_language text NOT NULL DEFAULT 'auto';

-- Add language column to memos table
ALTER TABLE public.memos 
ADD COLUMN language text;