
import { useTheme } from "@/components/ui/theme-provider";
import { Moon, Sun } from "lucide-react";

export const ThemeToggle = () => {
  const { theme, setTheme, mounted } = useTheme();
  
  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-full bg-background/90 dark:bg-gray-800/90 backdrop-blur-sm text-foreground dark:text-gray-200 
        shadow-md hover:shadow-lg transition-all 
        hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
