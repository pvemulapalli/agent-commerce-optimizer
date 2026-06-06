"use client";

import {
  getAuditScrollOffsetPx,
  scrollToElementById,
} from "@/lib/scroll-utils";
import { useCallback, useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  {
    id: "next-steps",
    label: "Next Steps",
    accent: true,
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden fill="currentColor">
        <path d="M10 2a1 1 0 0 1 .894.553l1.618 3.236 3.236 1.618a1 1 0 0 1 0 1.788l-3.236 1.618-1.618 3.236A1 1 0 0 1 10 18l-1.618-3.236-3.236-1.618a1 1 0 0 1 0-1.788l3.236-1.618L8.106 2.553A1 1 0 0 1 10 2Zm0 3.382L9.382 7.5 7.5 8.118 9.382 8.736 10 10.618l.618-1.882L12.5 8.118l-1.882-.618L10 5.382Z" />
      </svg>
    ),
  },
  { id: "platform-detection", label: "Platform" },
  { id: "findings-detected", label: "Detected" },
  { id: "findings-missing", label: "Missing" },
  { id: "findings-needs-review", label: "Needs Review" },
  { id: "generated-assets", label: "Generated Assets" },
  { id: "recommendations", label: "Recommendations" },
];

export function AuditStickyNav({
  visibleSections,
  resetKey,
}: {
  visibleSections: string[];
  resetKey?: string;
}) {
  const [activeId, setActiveId] = useState("overview");
  const clickLockUntilRef = useRef(0);

  useEffect(() => {
    if (resetKey) {
      setActiveId("overview");
    }
  }, [resetKey]);

  const resolveActiveSection = useCallback(() => {
    if (Date.now() < clickLockUntilRef.current) {
      return;
    }

    let current = visibleSections[0] ?? "overview";

    for (const sectionId of visibleSections) {
      const element = document.getElementById(sectionId);
      if (!element) {
        continue;
      }

      const { top } = element.getBoundingClientRect();
      if (top <= getAuditScrollOffsetPx()) {
        current = sectionId;
      }
    }

    setActiveId(current);
  }, [visibleSections]);

  useEffect(() => {
    resolveActiveSection();

    window.addEventListener("scroll", resolveActiveSection, { passive: true });
    window.addEventListener("resize", resolveActiveSection);

    return () => {
      window.removeEventListener("scroll", resolveActiveSection);
      window.removeEventListener("resize", resolveActiveSection);
    };
  }, [resolveActiveSection]);

  function scrollToSection(sectionId: string) {
    clickLockUntilRef.current = Date.now() + 900;
    setActiveId(sectionId);
    scrollToElementById(sectionId, "smooth");
  }

  const tabs = SECTIONS.filter((section) => visibleSections.includes(section.id));

  return (
    <nav
      aria-label="Scan report sections"
      className="sticky top-16 z-20 -mx-1 rounded-xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-950/95"
    >
      <div className="relative">
        <div className="overflow-x-auto px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max snap-x snap-mandatory gap-1">
            {tabs.map((section) => {
              const isActive = activeId === section.id;
              const isAccent = "accent" in section && section.accent;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={`inline-flex snap-start items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                    isActive
                      ? "bg-blue-900 text-white shadow-sm dark:bg-blue-700"
                      : isAccent
                        ? "border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-100 dark:hover:bg-emerald-950/70"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                  aria-current={isActive ? "true" : undefined}
                >
                  {"icon" in section && section.icon ? section.icon : null}
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white via-white/80 to-transparent dark:from-slate-950 dark:via-slate-950/80"
        />
      </div>
    </nav>
  );
}
