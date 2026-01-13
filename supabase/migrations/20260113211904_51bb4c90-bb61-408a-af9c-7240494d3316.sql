-- Update the handle_new_user function to NOT use email as fallback for display_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'));
  RETURN NEW;
END;
$function$;

-- Sanitize existing display_name values that look like email addresses
-- Replace email addresses with "User" to protect privacy
UPDATE public.profiles
SET display_name = 'User'
WHERE display_name LIKE '%@%.%';