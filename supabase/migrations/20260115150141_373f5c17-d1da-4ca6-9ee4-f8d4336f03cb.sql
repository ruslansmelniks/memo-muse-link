-- Add transcription_status to memos table for background processing
ALTER TABLE public.memos ADD COLUMN IF NOT EXISTS transcription_status text 
  DEFAULT 'completed'
  CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed'));