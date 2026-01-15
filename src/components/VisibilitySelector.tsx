import { Lock, Users, UserCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MemoVisibility } from '@/hooks/useMemoSharing';

interface VisibilitySelectorProps {
  value: MemoVisibility;
  onChange: (visibility: MemoVisibility) => void;
  disabled?: boolean;
}

const visibilityOptions: {
  value: MemoVisibility;
  label: string;
  description: string;
  icon: typeof Lock;
}[] = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can see this',
    icon: Lock,
  },
  {
    value: 'shared',
    label: 'Shared',
    description: 'Share with specific people or groups',
    icon: Users,
  },
  {
    value: 'followers',
    label: 'Followers',
    description: 'Anyone following you can see this',
    icon: UserCheck,
  },
  {
    value: 'void',
    label: 'The Void',
    description: 'Float into the universe for random discovery',
    icon: Sparkles,
  },
];

export function VisibilitySelector({ value, onChange, disabled }: VisibilitySelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Visibility</label>
      <div className="grid grid-cols-2 gap-2">
        {visibilityOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;
          
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex flex-col items-start p-3 rounded-lg border-2 transition-all text-left',
                'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card',
                disabled && 'opacity-50 cursor-not-allowed',
                option.value === 'void' && isSelected && 'border-purple-500 bg-purple-500/10'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon 
                  className={cn(
                    'h-4 w-4',
                    isSelected ? 'text-primary' : 'text-muted-foreground',
                    option.value === 'void' && isSelected && 'text-purple-500'
                  )} 
                />
                <span 
                  className={cn(
                    'font-medium text-sm',
                    isSelected ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {option.label}
                </span>
              </div>
              <span className="text-xs text-muted-foreground line-clamp-2">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VisibilityIcon({ visibility, className }: { visibility: MemoVisibility; className?: string }) {
  switch (visibility) {
    case 'private':
      return <Lock className={cn('h-3.5 w-3.5', className)} />;
    case 'shared':
      return <Users className={cn('h-3.5 w-3.5', className)} />;
    case 'followers':
      return <UserCheck className={cn('h-3.5 w-3.5', className)} />;
    case 'void':
      return <Sparkles className={cn('h-3.5 w-3.5 text-purple-500', className)} />;
    default:
      return <Lock className={cn('h-3.5 w-3.5', className)} />;
  }
}
