import { BANNED_DOMAIN_TITLE } from "@/lib/banned-domain-messages";

const RESTRICTED_EXAMPLES = [
  "Financial institutions",
  "Government websites",
  "Authentication portals",
  "Sites protected from automated crawling",
  "Domains that prohibit third-party scanning",
];

export function ScanningRestrictedNotice({
  onScanAnother,
}: {
  onScanAnother: () => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/80 p-6 dark:border-blue-500/30 dark:bg-blue-950/40">
      <h2 className="text-lg font-semibold text-blue-950 dark:text-blue-100">
        {BANNED_DOMAIN_TITLE}
      </h2>
      <p className="mt-3 text-sm leading-7 text-blue-900 dark:text-blue-100/90">
        This domain has been intentionally excluded from scanning.
      </p>
      <p className="mt-4 text-sm font-medium text-blue-950 dark:text-blue-100">
        Common examples include:
      </p>
      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-blue-900 dark:text-blue-100/90">
        {RESTRICTED_EXAMPLES.map((example) => (
          <li key={example} className="flex gap-2">
            <span aria-hidden>•</span>
            <span>{example}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-7 text-blue-900 dark:text-blue-100/90">
        This is not an error with your URL. Please try another publicly accessible
        ecommerce storefront.
      </p>
      <button
        type="button"
        onClick={onScanAnother}
        className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-950 dark:bg-blue-700 dark:hover:bg-blue-600"
      >
        Scan Another Site
      </button>
    </div>
  );
}
