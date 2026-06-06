import { AUDIT_SECTION_SCROLL_CLASS } from "@/lib/scroll-utils";
import Link from "next/link";

export const NEXT_STEP_LINKS = [
  {
    title: "Review Findings",
    description: "Start with detected and missing signals to understand your readiness gaps.",
    href: "#findings-detected",
    label: "View findings",
  },
  {
    title: "Download Generated Assets",
    description: "Use the remediation files to accelerate structured data and discovery fixes.",
    href: "#generated-assets",
    label: "Open assets",
  },
  {
    title: "Implement Fixes",
    description: "Follow prioritized recommendations to close the highest-impact gaps first.",
    href: "#recommendations",
    label: "View recommendations",
  },
  {
    title: "Re-run Scan",
    description: "Scan again after publishing changes to measure improvement.",
    href: "#audit-hero",
    label: "Run new scan",
  },
] as const;

function StepButtons({ size = "default" }: { size?: "default" | "sm" }) {
  const buttonClass =
    size === "sm"
      ? "rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-900 hover:bg-blue-50 dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-100 dark:hover:bg-blue-950/70"
      : "inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600";

  return (
    <div className="flex flex-wrap gap-2">
      {NEXT_STEP_LINKS.map((step) => (
        <Link key={step.href} href={step.href} className={buttonClass}>
          {step.label}
        </Link>
      ))}
    </div>
  );
}

/** Compact prompt after dimension scores — quick links without repeating the full block. */
export function AuditNextStepsInline() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/30 dark:bg-blue-950/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-900 dark:text-blue-200">
            What&apos;s next
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Jump to the highest-impact follow-up actions from this scan.
          </p>
        </div>
        <Link
          href="#next-steps"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-900 hover:underline dark:text-blue-200"
        >
          See all steps
          <span aria-hidden>→</span>
        </Link>
      </div>
      <div className="mt-3">
        <StepButtons size="sm" />
      </div>
    </div>
  );
}

export function AuditNextSteps({
  sectionId = "next-steps",
  showIntro = true,
}: {
  sectionId?: string;
  showIntro?: boolean;
}) {
  return (
    <section
      id={sectionId}
      className={`${AUDIT_SECTION_SCROLL_CLASS} rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8`}
    >
      {showIntro ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
            What&apos;s next
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-text-primary">Recommended Next Steps</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Use this scan as a starting point. Review gaps, apply fixes, and measure progress over
            time.
          </p>
        </>
      ) : (
        <h2 className="sr-only">Recommended Next Steps</h2>
      )}

      <ol className={`space-y-4 ${showIntro ? "mt-6" : ""}`}>
        {NEXT_STEP_LINKS.map((step, index) => (
          <li
            key={step.title}
            className="flex flex-col gap-3 rounded-xl border border-card-border bg-card-muted p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Step {index + 1}
              </p>
              <h3 className="mt-1 font-semibold text-text-primary">{step.title}</h3>
              <p className="mt-1 text-sm text-text-secondary">{step.description}</p>
            </div>
            <Link
              href={step.href}
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              {step.label}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
