-- =============================================
-- SECURITY HARDENING MIGRATION FOR APP STORE
-- =============================================

-- 1. Fix notifications INSERT policy - only allow database triggers to insert
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create a security definer function for creating notifications (to be called by triggers only)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_actor_id uuid,
  p_memo_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, actor_id, memo_id)
  VALUES (p_user_id, p_type, p_actor_id, p_memo_id);
END;
$$;

-- No direct INSERT policy for notifications - only triggers can insert via the function
-- This prevents spam attacks

-- 2. Restrict follows visibility to authenticated users only
DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;

CREATE POLICY "Authenticated users can view follows"
ON public.follows
FOR SELECT
TO authenticated
USING (true);

-- 3. Restrict memo_likes visibility to authenticated users only
DROP POLICY IF EXISTS "Anyone can view likes" ON public.memo_likes;

CREATE POLICY "Authenticated users can view likes"
ON public.memo_likes
FOR SELECT
TO authenticated
USING (true);

-- 4. Restrict profiles visibility to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 5. Update the notification triggers to use the security definer function
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_name text;
BEGIN
  -- Don't notify if following yourself
  IF NEW.follower_id != NEW.following_id THEN
    -- Create in-app notification using the secure function
    PERFORM public.create_notification(NEW.following_id, 'follow', NEW.follower_id, NULL);
    
    -- Get actor name for push notification
    SELECT COALESCE(display_name, 'Someone') INTO actor_name
    FROM public.profiles WHERE user_id = NEW.follower_id;
    
    -- Queue push notification
    BEGIN
      PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'userId', NEW.following_id,
          'title', 'New Follower',
          'body', actor_name || ' started following you',
          'url', '/profile/' || NEW.follower_id
        )
      );
    EXCEPTION WHEN others THEN
      -- Silently continue if push fails
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  memo_owner_id uuid;
  memo_title text;
  actor_name text;
BEGIN
  -- Get the memo owner and title
  SELECT user_id, title INTO memo_owner_id, memo_title FROM public.memos WHERE id = NEW.memo_id;
  
  -- Don't notify if liking your own memo
  IF memo_owner_id IS NOT NULL AND memo_owner_id != NEW.user_id THEN
    -- Create in-app notification using the secure function
    PERFORM public.create_notification(memo_owner_id, 'like', NEW.user_id, NEW.memo_id);
    
    -- Get actor name for push notification
    SELECT COALESCE(display_name, 'Someone') INTO actor_name
    FROM public.profiles WHERE user_id = NEW.user_id;
    
    -- Queue push notification
    BEGIN
      PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push-notification',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := jsonb_build_object(
          'userId', memo_owner_id,
          'title', 'New Like',
          'body', actor_name || ' liked your memo "' || LEFT(memo_title, 30) || '"',
          'url', '/memo/' || NEW.memo_id
        )
      );
    EXCEPTION WHEN others THEN
      -- Silently continue if push fails
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Create triggers if they don't exist
DROP TRIGGER IF EXISTS on_follow_notify ON public.follows;
CREATE TRIGGER on_follow_notify
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_follow();

DROP TRIGGER IF EXISTS on_like_notify ON public.memo_likes;
CREATE TRIGGER on_like_notify
  AFTER INSERT ON public.memo_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_like();