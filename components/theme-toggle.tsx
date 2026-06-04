"use client";

import { useThemePreference, type ThemePreference } from "@/components/theme-provider";

const OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "system", label: "System", icon: "💻" },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useThemePreference();

  return (
    <div
      className={`inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900 ${
        compact ? "gap-0.5" : "gap-1"
      }`}
      role="group"
      aria-label="Theme preference"
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            className={`rounded-md px-2 py-1.5 text-xs font-medium transition sm:px-2.5 ${
              active
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
            aria-pressed={active}
            title={option.label}
          >
            <span aria-hidden>{option.icon}</span>
            {!compact && <span className="ml-1 hidden sm:inline">{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
