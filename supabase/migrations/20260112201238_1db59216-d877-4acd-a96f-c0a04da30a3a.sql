-- Add DELETE policy for profiles table (GDPR compliance)
CREATE POLICY "Users can delete own profile"
ON public.profiles FOR DELETE
TO authenticated
USING (user_id = auth.uid());