import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Folder, FOLDER_COLORS, FOLDER_ICONS, FolderColor, FolderIcon } from "@/types/folder";
import { Folder as FolderIconLucide, Briefcase, Book, Heart, Star, Lightbulb, Music, Camera, Code, Coffee, Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description?: string; icon: string; color: string; is_public: boolean }) => void;
  folder?: Folder | null;
  isLoading?: boolean;
}

const iconComponents: Record<FolderIcon, React.ElementType> = {
  folder: FolderIconLucide,
  briefcase: Briefcase,
  book: Book,
  heart: Heart,
  star: Star,
  lightbulb: Lightbulb,
  music: Music,
  camera: Camera,
  code: Code,
  coffee: Coffee,
};

export function FolderModal({ isOpen, onClose, onSave, folder, isLoading }: FolderModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<FolderIcon>("folder");
  const [selectedColor, setSelectedColor] = useState<FolderColor>("primary");
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setDescription(folder.description || "");
      setSelectedIcon(folder.icon as FolderIcon);
      setSelectedColor(folder.color as FolderColor);
      setIsPublic(folder.is_public);
    } else {
      setName("");
      setDescription("");
      setSelectedIcon("folder");
      setSelectedColor("primary");
      setIsPublic(false);
    }
  }, [folder, isOpen]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      icon: selectedIcon,
      color: selectedColor,
      is_public: isPublic,
    });
  };

  const getColorClass = (colorId: FolderColor) => {
    return FOLDER_COLORS.find(c => c.id === colorId)?.class || "bg-primary";
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {folder ? "Edit Folder" : "Create New Folder"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Personal Journal"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="folder-description">Description (optional)</Label>
            <Textarea
              id="folder-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this folder for?"
              rows={2}
            />
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_ICONS.map((icon) => {
                const IconComponent = iconComponents[icon];
                return (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={cn(
                      "p-2.5 rounded-lg border-2 transition-all",
                      selectedIcon === icon
                        ? "border-primary bg-primary/10"
                        : "border-transparent bg-muted hover:bg-muted/80"
                    )}
                  >
                    <IconComponent className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColor(color.id as FolderColor)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    color.class,
                    selectedColor === color.id
                      ? "ring-2 ring-offset-2 ring-primary scale-110"
                      : "hover:scale-105"
                  )}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-5 w-5 text-primary" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {isPublic ? "Public Folder" : "Private Folder"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPublic
                    ? "All memos inside will be visible to everyone"
                    : "Only you can see memos in this folder"}
                </p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isLoading}>
            {isLoading ? "Saving..." : folder ? "Save Changes" : "Create Folder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
