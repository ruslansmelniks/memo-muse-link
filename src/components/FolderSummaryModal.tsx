import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Copy, X, Sparkles, Link2, Lightbulb, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FolderSummary {
  overview: string;
  themes: string[];
  nuggets: string[];
  connections: string;
}

interface FolderSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderName: string;
  summary: FolderSummary | null;
  isLoading: boolean;
  memoCount: number;
}

export function FolderSummaryModal({
  isOpen,
  onClose,
  folderName,
  summary,
  isLoading,
  memoCount,
}: FolderSummaryModalProps) {
  const handleCopy = () => {
    if (!summary) return;
    
    const text = `# ${folderName} Summary

## Overview
${summary.overview}

## Key Themes
${summary.themes.map(t => `- ${t}`).join("\n")}

## Nuggets
${summary.nuggets.map(n => `- ${n}`).join("\n")}

## Connections
${summary.connections}`;

    navigator.clipboard.writeText(text);
    toast.success("Summary copied to clipboard");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {folderName} Summary
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Synthesized from {memoCount} memo{memoCount !== 1 ? "s" : ""}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          {isLoading ? (
            <div className="py-12 text-center space-y-4">
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
              </div>
              <p className="text-muted-foreground">Analyzing your memos...</p>
            </div>
          ) : summary ? (
            <div className="space-y-6 pb-4">
              {/* Overview */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Overview</h3>
                </div>
                <p className="text-foreground leading-relaxed">{summary.overview}</p>
              </section>

              {/* Themes */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Key Themes</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {summary.themes.map((theme, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary"
                      className="px-3 py-1 text-sm font-medium"
                    >
                      {theme}
                    </Badge>
                  ))}
                </div>
              </section>

              {/* Nuggets */}
              {summary.nuggets.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Nuggets</h3>
                  </div>
                  <ul className="space-y-2">
                    {summary.nuggets.map((nugget, i) => (
                      <li 
                        key={i} 
                        className="flex items-start gap-2 text-foreground"
                      >
                        <span className="text-primary mt-1">•</span>
                        <span>{nugget}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Connections */}
              {summary.connections && (
                <section>
                  <div className="flex items-center gap-2 mb-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Connections</h3>
                  </div>
                  <p className="text-foreground leading-relaxed">{summary.connections}</p>
                </section>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              No summary available
            </div>
          )}
        </ScrollArea>

        {!isLoading && summary && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
            <Button onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Summary
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
