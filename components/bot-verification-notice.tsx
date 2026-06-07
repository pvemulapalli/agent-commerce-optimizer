export function BotVerificationNotice({
  message,
  onScanAnother,
}: {
  message: string;
  onScanAnother: () => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/80 p-6 dark:border-blue-500/30 dark:bg-blue-950/40">
      <h2 className="text-lg font-semibold text-blue-950 dark:text-blue-100">
        Scan Temporarily Blocked
      </h2>
      <p className="mt-3 text-sm leading-7 text-blue-900 dark:text-blue-100/90">{message}</p>
      <button
        type="button"
        onClick={onScanAnother}
        className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-700 dark:hover:bg-blue-600"
      >
        Try Another Site
      </button>
    </div>
  );
}
