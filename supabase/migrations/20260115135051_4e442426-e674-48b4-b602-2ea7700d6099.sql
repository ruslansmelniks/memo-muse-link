-- Create groups table for shared spaces
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create group_members table
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create memo_shares table for direct and group sharing
CREATE TABLE public.memo_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_id uuid NOT NULL REFERENCES public.memos(id) ON DELETE CASCADE,
  shared_with_user_id uuid,
  shared_with_group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (shared_with_user_id IS NOT NULL OR shared_with_group_id IS NOT NULL)
);

-- Add visibility column to memos table
ALTER TABLE public.memos 
ADD COLUMN visibility text NOT NULL DEFAULT 'private' 
CHECK (visibility IN ('private', 'shared', 'followers', 'void'));

-- Migrate existing is_public memos to appropriate visibility
UPDATE public.memos SET visibility = 'followers' WHERE is_public = true;

-- Enable RLS on new tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memo_shares ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- Helper function to check if user is admin of a group
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id AND role = 'admin'
  )
$$;

-- Helper function to check if user has access to a memo via shares
CREATE OR REPLACE FUNCTION public.has_memo_access(_user_id uuid, _memo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memo_shares ms
    LEFT JOIN public.group_members gm ON ms.shared_with_group_id = gm.group_id AND gm.user_id = _user_id
    WHERE ms.memo_id = _memo_id
    AND (ms.shared_with_user_id = _user_id OR gm.user_id IS NOT NULL)
  )
$$;

-- RLS Policies for groups table
CREATE POLICY "Users can create groups"
ON public.groups FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members can view their groups"
ON public.groups FOR SELECT
TO authenticated
USING (public.is_group_member(auth.uid(), id));

CREATE POLICY "Admins can update their groups"
ON public.groups FOR UPDATE
TO authenticated
USING (public.is_group_admin(auth.uid(), id))
WITH CHECK (public.is_group_admin(auth.uid(), id));

CREATE POLICY "Admins can delete their groups"
ON public.groups FOR DELETE
TO authenticated
USING (public.is_group_admin(auth.uid(), id));

-- RLS Policies for group_members table
CREATE POLICY "Members can view group members"
ON public.group_members FOR SELECT
TO authenticated
USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Admins can add members"
ON public.group_members FOR INSERT
TO authenticated
WITH CHECK (public.is_group_admin(auth.uid(), group_id) OR (auth.uid() = user_id AND NOT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_members.group_id)));

CREATE POLICY "Admins can remove members"
ON public.group_members FOR DELETE
TO authenticated
USING (public.is_group_admin(auth.uid(), group_id) OR auth.uid() = user_id);

-- RLS Policies for memo_shares table
CREATE POLICY "Memo owners can create shares"
ON public.memo_shares FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "Users can view shares they have access to"
ON public.memo_shares FOR SELECT
TO authenticated
USING (
  auth.uid() = shared_by 
  OR auth.uid() = shared_with_user_id 
  OR (shared_with_group_id IS NOT NULL AND public.is_group_member(auth.uid(), shared_with_group_id))
);

CREATE POLICY "Memo owners can delete shares"
ON public.memo_shares FOR DELETE
TO authenticated
USING (auth.uid() = shared_by);

-- Update memos RLS policy to handle new visibility types
DROP POLICY IF EXISTS "Users can read public memos or own memos" ON public.memos;

CREATE POLICY "Users can read memos based on visibility"
ON public.memos FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR visibility = 'void'
  OR (visibility = 'followers' AND EXISTS (
    SELECT 1 FROM public.follows WHERE follower_id = auth.uid() AND following_id = memos.user_id
  ))
  OR (visibility = 'shared' AND public.has_memo_access(auth.uid(), id))
);

-- Allow anonymous users to view void memos
CREATE POLICY "Anyone can view void memos"
ON public.memos FOR SELECT
TO anon
USING (visibility = 'void');

-- Add trigger for groups updated_at
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();