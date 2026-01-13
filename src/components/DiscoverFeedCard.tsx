import { Heart, Eye, Headphones, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DiscoverMemo } from "@/hooks/useDiscoverMemos";
import { cn } from "@/lib/utils";

interface DiscoverFeedCardProps {
  memo: DiscoverMemo;
  className?: string;
}

export function DiscoverFeedCard({ memo, className }: DiscoverFeedCardProps) {
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isDemo = memo.id.startsWith("demo-");
  const memoLink = isDemo ? "#" : `/memo/${memo.id}`;
  const profileLink = isDemo || !memo.author.id ? "#" : `/profile/${memo.author.id}`;

  return (
    <Card className={cn("border-0 shadow-none bg-transparent", className)}>
      <CardContent className="p-0">
        {/* Author Row */}
        <div className="flex items-center gap-3 mb-3">
          <Link to={profileLink}>
            <Avatar className="h-8 w-8">
              <AvatarImage src={memo.author.avatar} alt={memo.author.name} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                {memo.author.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link 
              to={profileLink}
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              {memo.author.name}
            </Link>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{formatTimeAgo(memo.createdAt)}</span>
          </div>
        </div>

        {/* Title */}
        <Link to={memoLink}>
          <h3 className="font-display font-semibold text-lg text-foreground leading-tight mb-2 hover:text-primary transition-colors line-clamp-2">
            {memo.title}
          </h3>
        </Link>

        {/* Summary/Excerpt */}
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 mb-3">
          {memo.summary || memo.transcript.slice(0, 200)}
        </p>

        {/* Bottom Row: Categories + Metrics */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Categories + Audio indicator */}
          <div className="flex items-center gap-2 flex-wrap">
            {memo.categories.slice(0, 2).map((category) => (
              <Badge 
                key={category} 
                variant="secondary"
                className="text-xs font-normal"
              >
                {category}
              </Badge>
            ))}
            {memo.audioUrl && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Headphones className="h-3.5 w-3.5" />
                <span>{formatDuration(memo.duration)}</span>
              </div>
            )}
          </div>

          {/* Right: Engagement metrics */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              <span>{memo.likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              <span>{memo.viewCount}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
