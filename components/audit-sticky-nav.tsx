"use client";

import {
  AUDIT_SCROLL_OFFSET_PX,
  scrollToElementById,
} from "@/lib/scroll-utils";
import { useCallback, useEffect, useRef, useState } from "react";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "findings-detected", label: "Detected" },
  { id: "findings-missing", label: "Missing" },
  { id: "findings-needs-review", label: "Needs Review" },
  { id: "generated-assets", label: "Generated Assets" },
  { id: "recommendations", label: "Recommendations" },
];

const SCROLL_SPY_OFFSET_PX = 128;

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
      if (top <= SCROLL_SPY_OFFSET_PX) {
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
    scrollToElementById(sectionId, "smooth", AUDIT_SCROLL_OFFSET_PX);
  }

  const tabs = SECTIONS.filter((section) => visibleSections.includes(section.id));

  return (
    <nav
      aria-label="Audit report sections"
      className="sticky top-16 z-20 -mx-1 rounded-xl border border-slate-200 bg-white/95 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-950/95"
    >
      <div className="relative">
        <div className="overflow-x-auto px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max snap-x snap-mandatory gap-1">
            {tabs.map((section) => {
              const isActive = activeId === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={`snap-start rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                    isActive
                      ? "bg-blue-900 text-white shadow-sm dark:bg-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  }`}
                  aria-current={isActive ? "true" : undefined}
                >
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
