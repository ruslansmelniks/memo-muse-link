-- =============================================
-- FIX STORAGE POLICIES FOR AUDIO-MEMOS BUCKET
-- =============================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can upload audio memos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own audio" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read audio memos" ON storage.objects;

-- Create secure INSERT policy - users can only upload to their own folder
CREATE POLICY "Users can upload own audio memos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-memos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create secure DELETE policy - users can only delete their own files
CREATE POLICY "Users can delete own audio memos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-memos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Keep public read access for public memos (intentional for social sharing)
CREATE POLICY "Anyone can read audio memos"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-memos');

-- =============================================
-- FIX AVATARS BUCKET POLICIES
-- =============================================

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Public read access for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can only upload avatars to their own folder
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only update their own avatars
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only delete their own avatars
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);