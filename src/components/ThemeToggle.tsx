import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  className?: string;
  /** Render as a compact icon-only button */
  compact?: boolean;
}

export function ThemeToggle({ className = "", compact = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === "dark";

  if (compact) {
    return (
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={`rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-200 ${className}`}
        title={isDark ? "Modo claro" : "Modo escuro"}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.8125rem] font-medium transition-colors duration-200 ${className}`}
      title={isDark ? "Modo claro" : "Modo escuro"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span>{isDark ? "Modo Claro" : "Modo Escuro"}</span>
    </button>
  );
}
