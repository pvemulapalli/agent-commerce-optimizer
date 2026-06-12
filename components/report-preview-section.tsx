"use client";

import { trackReportPreviewViewed } from "@/lib/analytics-events";
import { cardSurfaceClass, textPrimaryClass, textSecondaryClass } from "@/lib/theme-classes";
import Image from "next/image";
import { useEffect, useRef } from "react";

const PREVIEW_ITEMS = [
  {
    title: "Readiness score",
    description: "Overall agentic commerce readiness with letter grade and dimension breakdown.",
  },
  {
    title: "Platform detection",
    description: "Identified commerce platform with confidence signals from your storefront.",
  },
  {
    title: "Recommendations",
    description: "Prioritized opportunities ranked by business impact and readiness gap.",
  },
  {
    title: "Readiness categories",
    description: "Discovery, catalog, trust, and transaction readiness in one view.",
  },
  {
    title: "Fix prompts",
    description: "Copy-ready prompts and downloadable assets to accelerate remediation.",
  },
];

export function ReportPreviewSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackedRef = useRef(false);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || trackedRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          trackedRef.current = true;
          trackReportPreviewViewed();
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={`${cardSurfaceClass} p-6 sm:p-8`}>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
        Report preview
      </p>
      <h2 className={`mt-2 text-2xl font-semibold tracking-tight ${textPrimaryClass}`}>
        What You&apos;ll Learn
      </h2>
      <p className={`mt-3 max-w-3xl text-sm leading-6 sm:text-base ${textSecondaryClass}`}>
        Every assessment surfaces readiness scores, platform signals, prioritized recommendations,
        and actionable fix prompts — so you know exactly what agents and AI systems can use today.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <ul className="space-y-4">
          {PREVIEW_ITEMS.map((item) => (
            <li
              key={item.title}
              className="rounded-xl border border-card-border bg-card-muted px-4 py-4"
            >
              <h3 className={`font-semibold ${textPrimaryClass}`}>{item.title}</h3>
              <p className={`mt-1 text-sm leading-6 ${textSecondaryClass}`}>{item.description}</p>
            </li>
          ))}
        </ul>

        <div className="space-y-4">
          <figure className="overflow-hidden rounded-xl border border-card-border bg-card-muted shadow-sm">
            <Image
              src="/screenshots/audit-results-platform-detection.png"
              alt="Readiness assessment showing score, platform detection, and recommendations"
              width={1200}
              height={900}
              className="h-auto w-full"
            />
            <figcaption className={`px-4 py-3 text-xs ${textSecondaryClass}`}>
              Readiness score, platform detection, and prioritized recommendations
            </figcaption>
          </figure>
          <figure className="overflow-hidden rounded-xl border border-card-border bg-card-muted shadow-sm">
            <Image
              src="/screenshots/generated-fixes-downloads.png"
              alt="Generated fix prompts and downloadable readiness assets"
              width={1200}
              height={900}
              className="h-auto w-full"
            />
            <figcaption className={`px-4 py-3 text-xs ${textSecondaryClass}`}>
              Readiness categories, fix prompts, and downloadable assets
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
