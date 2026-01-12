import { Globe, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "auto", name: "Auto-Detect", flag: "🌐" },
  { code: "en-US", name: "English", flag: "🇺🇸" },
  { code: "ru-RU", name: "Русский", flag: "🇷🇺" },
  { code: "uk-UA", name: "Українська", flag: "🇺🇦" },
  { code: "es-ES", name: "Español", flag: "🇪🇸" },
  { code: "fr-FR", name: "Français", flag: "🇫🇷" },
  { code: "de-DE", name: "Deutsch", flag: "🇩🇪" },
];

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (code: string) => void;
  disabled?: boolean;
}

export function LanguageSelector({ 
  selectedLanguage, 
  onLanguageChange, 
  disabled 
}: LanguageSelectorProps) {
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage) 
    || SUPPORTED_LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button 
          variant="glass" 
          size="sm" 
          className="gap-2 min-w-[140px] justify-between"
          disabled={disabled}
        >
          <span className="flex items-center gap-2">
            <span className="text-base">{currentLang.flag}</span>
            <span className="text-sm">{currentLang.name}</span>
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-[180px]">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => onLanguageChange(lang.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
            </span>
            {selectedLanguage === lang.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
