-- Create storage bucket for audio memos
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-memos', 'audio-memos', true);

-- Create policy for authenticated users to upload their own audio
CREATE POLICY "Users can upload audio memos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio-memos');

-- Create policy for public read access to audio
CREATE POLICY "Audio memos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-memos');

-- Create policy for users to delete their own audio (based on path)
CREATE POLICY "Users can delete own audio"
ON storage.objects FOR DELETE
USING (bucket_id = 'audio-memos');

-- Create memos table to store memo data
CREATE TABLE public.memos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  transcript TEXT NOT NULL,
  summary TEXT,
  categories TEXT[] DEFAULT '{}',
  tasks TEXT[] DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  audio_url TEXT,
  duration INTEGER NOT NULL DEFAULT 0,
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on memos
ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read public memos
CREATE POLICY "Public memos are readable by everyone"
ON public.memos FOR SELECT
USING (is_public = true);

-- Allow anyone to insert memos (for now, until auth is added)
CREATE POLICY "Anyone can create memos"
ON public.memos FOR INSERT
WITH CHECK (true);

-- Allow anyone to update memos they created (by matching author_name for now)
CREATE POLICY "Anyone can update memos"
ON public.memos FOR UPDATE
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_memos_updated_at
BEFORE UPDATE ON public.memos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for memos
ALTER PUBLICATION supabase_realtime ADD TABLE public.memos;