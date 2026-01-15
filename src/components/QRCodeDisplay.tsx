import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QRCodeDisplayProps {
  username: string | null;
  userId: string;
}

export function QRCodeDisplay({ username, userId }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  
  const profilePath = username ? `/profile/@${username}` : `/profile/${userId}`;
  const profileUrl = `${window.location.origin}${profilePath}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Profile",
          text: "Check out my profile on MemoMuse",
          url: profileUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* QR Code */}
      <div className="bg-white p-4 rounded-2xl shadow-lg">
        <QRCodeSVG
          value={profileUrl}
          size={180}
          level="M"
          marginSize={0}
        />
      </div>

      {/* Profile Link */}
      <div className="w-full">
        <p className="text-xs text-muted-foreground text-center mb-2">Your profile link</p>
        <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm text-center break-all font-mono">
          {username ? `@${username}` : profilePath}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </>
          )}
        </Button>
        <Button
          className="flex-1"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  );
}
