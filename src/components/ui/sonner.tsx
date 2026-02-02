import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group !pointer-events-none [&>*]:pointer-events-auto"
      position="top-center"
      // Offset well below safe area for notch/dynamic island (60px down from safe area)
      offset="calc(env(safe-area-inset-top, 44px) + 60px)"
      // Brief duration for native feel
      duration={1500}
      // No close button - swipe or tap to dismiss like native iOS
      closeButton={false}
      toastOptions={{
        duration: 1500,
        // Allow swipe/tap to dismiss
        dismissible: true,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background/95 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-md group-[.toaster]:rounded-xl group-[.toaster]:py-2.5 group-[.toaster]:px-4",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
