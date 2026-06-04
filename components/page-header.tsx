import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  className?: string;
  eyebrowClassName?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  className = "",
  eyebrowClassName = "",
}: PageHeaderProps) {
  return (
    <div className={`max-w-3xl ${className}`}>
      {eyebrow ? (
        <p
          className={`text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 ${eyebrowClassName}`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg sm:leading-8">
          {description}
        </p>
      ) : null}
    </div>
  );
}
