-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('follow', 'like')),
  actor_id uuid NOT NULL,
  memo_id uuid REFERENCES public.memos(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "Users can read own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (user_id = auth.uid());

-- System can insert notifications (via trigger with security definer)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create function to notify on follow
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Don't notify if following yourself
  IF NEW.follower_id != NEW.following_id THEN
    INSERT INTO public.notifications (user_id, type, actor_id)
    VALUES (NEW.following_id, 'follow', NEW.follower_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for follows
CREATE TRIGGER on_follow_notify
AFTER INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_follow();

-- Create function to notify on like
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  memo_owner_id uuid;
BEGIN
  -- Get the memo owner
  SELECT user_id INTO memo_owner_id FROM public.memos WHERE id = NEW.memo_id;
  
  -- Don't notify if liking your own memo
  IF memo_owner_id IS NOT NULL AND memo_owner_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, actor_id, memo_id)
    VALUES (memo_owner_id, 'like', NEW.user_id, NEW.memo_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for likes
CREATE TRIGGER on_like_notify
AFTER INSERT ON public.memo_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_like();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;