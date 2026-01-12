import { User, Bell, Shield, Mic, Palette, HelpCircle, LogOut } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const settingsSections = [
  {
    title: "Account",
    items: [
      { icon: User, label: "Profile", description: "Manage your account details" },
      { icon: Bell, label: "Notifications", description: "Configure alerts and reminders", hasToggle: true },
      { icon: Shield, label: "Privacy", description: "Control who can see your memos" },
    ],
  },
  {
    title: "Recording",
    items: [
      { icon: Mic, label: "Audio Quality", description: "High quality recording" },
      { icon: Palette, label: "Appearance", description: "Theme and display settings" },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: HelpCircle, label: "Help Center", description: "FAQs and tutorials" },
    ],
  },
];

export function SettingsView() {
  return (
    <div className="container mx-auto px-4 py-6 pb-32">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h2 className="font-display text-3xl font-bold text-foreground mb-2">
          Settings
        </h2>
        <p className="text-muted-foreground">
          Customize your Mindflow experience
        </p>
      </div>

      {/* Profile Card */}
      <div className="glass-card rounded-2xl p-5 mb-8 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
            Y
          </div>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-lg text-foreground">Your Name</h3>
            <p className="text-sm text-muted-foreground">you@example.com</p>
          </div>
          <Button variant="soft" size="sm">Edit</Button>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-8">
        {settingsSections.map((section, sectionIndex) => (
          <div 
            key={section.title}
            className="animate-fade-in"
            style={{ animationDelay: `${150 + sectionIndex * 50}ms` }}
          >
            <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
              {section.title}
            </h3>
            <div className="glass-card rounded-2xl overflow-hidden divide-y divide-border">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    {item.hasToggle && <Switch defaultChecked />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="mt-8 animate-fade-in" style={{ animationDelay: "350ms" }}>
        <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10">
          <LogOut className="h-5 w-5 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
