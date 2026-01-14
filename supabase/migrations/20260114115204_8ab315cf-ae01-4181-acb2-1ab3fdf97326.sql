-- Remove any overly permissive SELECT policies on push_subscriptions
-- Keep only the user-specific policy
DROP POLICY IF EXISTS "Anyone can view push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Authenticated can view push subscriptions" ON push_subscriptions;