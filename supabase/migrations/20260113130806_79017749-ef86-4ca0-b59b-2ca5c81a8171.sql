-- Create follows table for social following
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Create memo_likes table for tracking likes
CREATE TABLE public.memo_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  memo_id uuid NOT NULL REFERENCES public.memos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, memo_id)
);

-- Add view_count to memos table
ALTER TABLE public.memos ADD COLUMN view_count integer NOT NULL DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memo_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for follows table
CREATE POLICY "Anyone can view follows" ON public.follows
  FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- RLS policies for memo_likes table
CREATE POLICY "Anyone can view likes" ON public.memo_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like memos" ON public.memo_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike memos" ON public.memo_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Function to increment view count (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.increment_view_count(memo_uuid uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE memos SET view_count = view_count + 1 WHERE id = memo_uuid AND is_public = true;
$$;

-- Function to toggle like and update count atomically
CREATE OR REPLACE FUNCTION public.toggle_memo_like(p_memo_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  already_liked boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM memo_likes WHERE memo_id = p_memo_id AND user_id = p_user_id) INTO already_liked;
  
  IF already_liked THEN
    DELETE FROM memo_likes WHERE memo_id = p_memo_id AND user_id = p_user_id;
    UPDATE memos SET likes = likes - 1 WHERE id = p_memo_id;
    RETURN false;
  ELSE
    INSERT INTO memo_likes (memo_id, user_id) VALUES (p_memo_id, p_user_id);
    UPDATE memos SET likes = likes + 1 WHERE id = p_memo_id;
    RETURN true;
  END IF;
END;
$$;