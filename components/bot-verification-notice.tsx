import type { BotVerificationDiagnostic } from "@/lib/bot-verification-diagnostics";
import { BOT_VERIFICATION_ACTIONS } from "@/lib/bot-verification-diagnostics";
import { StorefrontReviewRequestPanel } from "@/components/storefront-review-request-panel";

export function BotVerificationNotice({
  diagnostic,
  storefrontUrl,
  onScanAnother,
}: {
  diagnostic: BotVerificationDiagnostic;
  storefrontUrl: string;
  onScanAnother: () => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/80 p-6 dark:border-blue-500/30 dark:bg-blue-950/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-blue-950 dark:text-blue-100">
          {diagnostic.title}
        </h2>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-900 dark:bg-blue-900/60 dark:text-blue-100">
          {diagnostic.confidence} confidence
        </span>
      </div>

      <dl className="mt-4 space-y-4 text-sm">
        <div>
          <dt className="font-semibold text-blue-950 dark:text-blue-100">Meaning</dt>
          <dd className="mt-1 leading-7 text-blue-900 dark:text-blue-100/90">
            {diagnostic.meaning}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-blue-950 dark:text-blue-100">What you can do</dt>
          <dd className="mt-2">
            <ul className="space-y-2 leading-7 text-blue-900 dark:text-blue-100/90">
              {BOT_VERIFICATION_ACTIONS.map((action) => (
                <li key={action} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onScanAnother}
        className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600"
      >
        Try Another Site
      </button>

      <StorefrontReviewRequestPanel storefrontUrl={storefrontUrl} failureType="bot_verification" />
    </div>
  );
}
