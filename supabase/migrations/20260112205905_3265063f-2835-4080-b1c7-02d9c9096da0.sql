-- Create folders table
CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'folder',
  color text DEFAULT 'primary',
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- RLS policies for folders
CREATE POLICY "Users can read own folders" ON public.folders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own folders" ON public.folders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own folders" ON public.folders
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own folders" ON public.folders
  FOR DELETE USING (user_id = auth.uid());

-- Add trigger for updated_at
CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add folder_id column to memos
ALTER TABLE public.memos 
  ADD COLUMN folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL;

-- Add visibility_override column (null = inherit from folder, true/false = explicit)
ALTER TABLE public.memos 
  ADD COLUMN visibility_override boolean DEFAULT NULL;

-- Create index for faster folder filtering
CREATE INDEX idx_memos_folder_id ON public.memos(folder_id);

-- Policy for viewing public folders (for Discover)
CREATE POLICY "Anyone can view public folders" ON public.folders
  FOR SELECT USING (is_public = true);