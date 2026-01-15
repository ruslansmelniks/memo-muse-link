import { useState, useEffect } from 'react';
import { X, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { VisibilitySelector, VisibilityIcon } from '@/components/VisibilitySelector';
import { ShareRecipientPicker } from '@/components/ShareRecipientPicker';
import { MemoVisibility, ShareRecipient, useMemoSharing } from '@/hooks/useMemoSharing';
import { toast } from 'sonner';

interface ShareVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  memo: {
    id: string;
    title: string;
    visibility: MemoVisibility;
  };
  onUpdate: (memoId: string, visibility: MemoVisibility, recipients?: ShareRecipient[]) => Promise<void>;
}

export function ShareVisibilityModal({ 
  isOpen, 
  onClose, 
  memo,
  onUpdate,
}: ShareVisibilityModalProps) {
  const [visibility, setVisibility] = useState<MemoVisibility>(memo.visibility);
  const [shareRecipients, setShareRecipients] = useState<ShareRecipient[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { getMemoShares } = useMemoSharing();

  // Load existing shares when modal opens
  useEffect(() => {
    if (isOpen) {
      setVisibility(memo.visibility);
      
      // Load existing share recipients if visibility is 'shared'
      if (memo.visibility === 'shared') {
        loadExistingShares();
      } else {
        setShareRecipients([]);
      }
    }
  }, [isOpen, memo.visibility, memo.id]);

  const loadExistingShares = async () => {
    const shares = await getMemoShares(memo.id);
    // Convert shares to recipients - we'd need to fetch profile/group details
    // For now, we'll just clear and let user re-select
    setShareRecipients([]);
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    // Validate shared visibility has recipients
    if (visibility === 'shared' && shareRecipients.length === 0) {
      toast.error('Please select at least one person or group to share with');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(
        memo.id, 
        visibility, 
        visibility === 'shared' ? shareRecipients : undefined
      );
      toast.success('Visibility updated');
      onClose();
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = visibility !== memo.visibility || 
    (visibility === 'shared' && shareRecipients.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div 
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg glass-card rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            <h2 className="font-display font-semibold text-xl">Share & Visibility</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Memo preview */}
        <div className="mb-6 p-3 rounded-xl bg-muted/50 flex items-center gap-3">
          <VisibilityIcon visibility={memo.visibility} className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{memo.title}</p>
            <p className="text-xs text-muted-foreground capitalize">
              Currently: {memo.visibility === 'void' ? 'In The Void' : memo.visibility}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Visibility Selector */}
          <VisibilitySelector 
            value={visibility} 
            onChange={setVisibility} 
          />

          {/* Share Recipients Picker - shown only when visibility is 'shared' */}
          {visibility === 'shared' && (
            <div className="p-4 rounded-xl bg-muted/30 border border-border">
              <Label className="text-sm font-medium text-foreground mb-3 block">
                Share with
              </Label>
              <ShareRecipientPicker
                selectedRecipients={shareRecipients}
                onChange={setShareRecipients}
              />
            </div>
          )}

          {/* Void explainer */}
          {visibility === 'void' && (
            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                ✨ Your memo will float into the universe for random listeners to discover. 
                You'll see how many people found it, but not who.
              </p>
            </div>
          )}

          {/* Followers explainer */}
          {visibility === 'followers' && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-sm text-foreground/80">
                👥 Only people who follow you will be able to see this memo in their feed.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="glass" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="hero" 
            className="flex-1" 
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
