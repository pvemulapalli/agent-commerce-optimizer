"use client";

import { trackHowItWorksViewed } from "@/lib/analytics-events";
import { cardSurfaceClass, textPrimaryClass, textSecondaryClass } from "@/lib/theme-classes";
import { useEffect, useRef } from "react";

const STEPS = [
  {
    number: "1",
    title: "Enter your storefront URL",
    description: "Paste your homepage or storefront domain to start a readiness assessment.",
  },
  {
    number: "2",
    title: "Merchant Signals evaluates",
    bullets: [
      "Discovery Readiness",
      "Catalog Readiness",
      "Trust Readiness",
      "Transaction Readiness",
    ],
  },
  {
    number: "3",
    title: "Receive prioritized recommendations and readiness benchmarks",
    description:
      "See where your storefront stands, compare against platform benchmarks, and get fix prompts you can act on.",
  },
];

export function HowItWorksSection() {
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
          trackHowItWorksViewed();
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={`${cardSurfaceClass} p-6 sm:p-8`}>
      <h2 className={`text-2xl font-semibold tracking-tight ${textPrimaryClass}`}>
        How Merchant Signals Works
      </h2>

      <ol className="mt-8 grid gap-6 lg:grid-cols-3">
        {STEPS.map((step) => (
          <li
            key={step.number}
            className="rounded-xl border border-card-border bg-card-muted p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-text-secondary">
              Step {step.number}
            </p>
            <h3 className={`mt-3 text-lg font-semibold ${textPrimaryClass}`}>{step.title}</h3>
            {"description" in step && step.description ? (
              <p className={`mt-3 text-sm leading-6 ${textSecondaryClass}`}>{step.description}</p>
            ) : null}
            {"bullets" in step && step.bullets ? (
              <ul className={`mt-3 space-y-2 text-sm ${textSecondaryClass}`}>
                {step.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <span className="mt-1 text-emerald-600 dark:text-emerald-400" aria-hidden>
                      •
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
