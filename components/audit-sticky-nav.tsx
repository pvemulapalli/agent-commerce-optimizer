"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "findings-detected", label: "Detected" },
  { id: "findings-missing", label: "Missing" },
  { id: "findings-needs-review", label: "Needs Review" },
  { id: "generated-assets", label: "Generated Assets" },
  { id: "recommendations", label: "Recommendations" },
];

export function AuditStickyNav({
  visibleSections,
}: {
  visibleSections: string[];
}) {
  const [activeId, setActiveId] = useState("overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.1, 0.35, 0.6] },
    );

    for (const section of visibleSections) {
      const element = document.getElementById(section);
      if (element) {
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, [visibleSections]);

  function scrollToSection(sectionId: string) {
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
