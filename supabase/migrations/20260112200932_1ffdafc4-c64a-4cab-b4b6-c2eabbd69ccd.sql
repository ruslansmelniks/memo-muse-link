-- Add user_id column to memos table for ownership tracking
ALTER TABLE public.memos 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can create memos" ON public.memos;
DROP POLICY IF EXISTS "Anyone can update memos" ON public.memos;
DROP POLICY IF EXISTS "Public memos are readable by everyone" ON public.memos;

-- Create secure RLS policies

-- Users can read public memos OR their own private memos
CREATE POLICY "Users can read public memos or own memos"
ON public.memos FOR SELECT
USING (
  is_public = true 
  OR user_id = auth.uid()
);

-- Only authenticated users can create memos (and must set themselves as owner)
CREATE POLICY "Authenticated users can create own memos"
ON public.memos FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can only update their own memos
CREATE POLICY "Users can update own memos"
ON public.memos FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can only delete their own memos
CREATE POLICY "Users can delete own memos"
ON public.memos FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are publicly readable
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can create own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for profile timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();