"use client";

import { useCallback, useEffect, useState } from "react";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "findings-detected", label: "Detected" },
  { id: "findings-missing", label: "Missing" },
  { id: "findings-needs-review", label: "Needs Review" },
  { id: "generated-assets", label: "Generated Assets" },
  { id: "recommendations", label: "Recommendations" },
];

const SCROLL_SPY_OFFSET_PX = 120;

export function AuditStickyNav({
  visibleSections,
  resetKey,
}: {
  visibleSections: string[];
  resetKey?: string;
}) {
  const [activeId, setActiveId] = useState("overview");

  useEffect(() => {
    if (resetKey) {
      setActiveId("overview");
    }
  }, [resetKey]);

  const resolveActiveSection = useCallback(() => {
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
    setActiveId(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <nav
      aria-label="Audit report sections"
      className="sticky top-16 z-20 -mx-1 overflow-x-auto rounded-xl border border-slate-200 bg-white/95 px-2 py-2 shadow-sm backdrop-blur"
    >
      <div className="flex min-w-max gap-1">
        {SECTIONS.filter((section) => visibleSections.includes(section.id)).map(
          (section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeId === section.id
                  ? "bg-blue-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {section.label}
            </button>
          ),
        )}
      </div>
    </nav>
  );
}
