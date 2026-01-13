-- Update notify_on_follow to also send push notification
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
    -- Create in-app notification
    INSERT INTO public.notifications (user_id, type, actor_id)
    VALUES (NEW.following_id, 'follow', NEW.follower_id);
    
    -- Get actor name for push notification
    SELECT COALESCE(display_name, 'Someone') INTO actor_name
    FROM public.profiles WHERE user_id = NEW.follower_id;
    
    -- Queue push notification via pg_net (if available) or handle in app
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
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Don't fail the transaction if push notification fails
    RETURN NEW;
END;
$$;

-- Update notify_on_like to also send push notification
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
    -- Create in-app notification
    INSERT INTO public.notifications (user_id, type, actor_id, memo_id)
    VALUES (memo_owner_id, 'like', NEW.user_id, NEW.memo_id);
    
    -- Get actor name for push notification
    SELECT COALESCE(display_name, 'Someone') INTO actor_name
    FROM public.profiles WHERE user_id = NEW.user_id;
    
    -- Queue push notification via pg_net (if available)
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
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Don't fail the transaction if push notification fails
    RETURN NEW;
END;
$$;