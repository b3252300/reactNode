import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({
  className = "",
  showLabel = false,
}: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`btn-secondary ${showLabel ? "px-3 py-1.5" : "h-9 w-9 p-0"} ${className}`}
      aria-label={isDark ? "切換為明亮模式" : "切換為深色模式"}
      title={isDark ? "切換為明亮模式" : "切換為深色模式"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-slate-600" />
      )}
      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? "明亮" : "深色"}
        </span>
      )}
    </button>
  );
}

export default ThemeToggle;
