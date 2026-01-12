export interface Folder {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  memo_count?: number;
}

export type FolderColor = 
  | "primary" 
  | "lavender" 
  | "coral" 
  | "sage" 
  | "amber" 
  | "rose" 
  | "sky" 
  | "violet";

export const FOLDER_COLORS: { id: FolderColor; label: string; class: string }[] = [
  { id: "primary", label: "Primary", class: "bg-primary" },
  { id: "lavender", label: "Lavender", class: "bg-lavender-200" },
  { id: "coral", label: "Coral", class: "bg-coral-200" },
  { id: "sage", label: "Sage", class: "bg-sage-200" },
  { id: "amber", label: "Amber", class: "bg-amber-400" },
  { id: "rose", label: "Rose", class: "bg-rose-400" },
  { id: "sky", label: "Sky", class: "bg-sky-400" },
  { id: "violet", label: "Violet", class: "bg-violet-400" },
];

export const FOLDER_ICONS = [
  "folder",
  "briefcase",
  "book",
  "heart",
  "star",
  "lightbulb",
  "music",
  "camera",
  "code",
  "coffee",
] as const;

export type FolderIcon = typeof FOLDER_ICONS[number];
