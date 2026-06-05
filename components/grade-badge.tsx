type GradeTone = "emerald" | "blue" | "rose" | "slate";

function getGradeTone(grade: string): GradeTone {
  const letter = grade.trim().charAt(0).toUpperCase();
  if (letter === "A" || letter === "B") {
    return "emerald";
  }
  if (letter === "C") {
    return "blue";
  }
  if (letter === "D" || letter === "F") {
    return "rose";
  }
  return "slate";
}

const toneClasses: Record<GradeTone, string> = {
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-200",
  blue: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/40 dark:bg-blue-950/50 dark:text-blue-200",
  rose:
    "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/50 dark:text-rose-200",
  slate:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
};

type GradeBadgeProps = {
  grade: string;
  className?: string;
};

export function GradeBadge({ grade, className = "" }: GradeBadgeProps) {
  const letter = grade.trim().charAt(0).toUpperCase() || "—";
  const tone = getGradeTone(grade);
  const colors = toneClasses[tone];
  const accessibleLabel = letter === "—" ? "Grade unavailable" : `Grade ${letter}`;

  return (
    <>
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold md:hidden ${colors} ${className}`}
        title={accessibleLabel}
        aria-label={accessibleLabel}
      >
        {letter}
      </span>
      <span
        className={`hidden shrink-0 whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-semibold md:inline-flex ${colors} ${className}`}
        title={accessibleLabel}
        aria-label={accessibleLabel}
      >
        Grade {letter}
      </span>
    </>
  );
}
