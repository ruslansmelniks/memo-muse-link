import { cn } from "@/lib/utils";
import { Category } from "@/types/memo";

interface CategoryFilterProps {
  categories: Category[];
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
}

const colorClasses: Record<string, string> = {
  coral: "bg-coral-100 text-coral-500 border-coral-200",
  mint: "bg-mint-100 text-mint-400 border-mint-200",
  lavender: "bg-lavender-100 text-lavender-400 border-lavender-200",
};

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
          selected === null
            ? "gradient-primary text-primary-foreground shadow-soft"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border",
            selected === category.id
              ? colorClasses[category.color]
              : "bg-background text-muted-foreground border-border hover:border-primary/30"
          )}
        >
          <span className="mr-1.5">{category.icon}</span>
          {category.name}
        </button>
      ))}
    </div>
  );
}
