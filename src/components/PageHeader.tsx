interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="mb-6 animate-fade-in">
      <h2 className="font-display text-3xl font-bold text-foreground mb-2">
        {title}
      </h2>
      {subtitle && (
        <p className="text-muted-foreground">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
