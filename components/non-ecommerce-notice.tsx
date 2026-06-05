export function NonEcommerceNotice({
  message,
  onScanAnother,
}: {
  message: string;
  onScanAnother: () => void;
}) {
  const paragraphs = message.split("\n\n").filter(Boolean);

  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-6 dark:border-amber-500/30 dark:bg-amber-950/40">
      <h2 className="text-lg font-semibold text-amber-950 dark:text-amber-100">
        Not an Ecommerce Storefront
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-amber-900 dark:text-amber-100/90">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <button
        type="button"
        onClick={onScanAnother}
        className="mt-5 inline-flex items-center justify-center rounded-lg bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-950 dark:bg-amber-700 dark:hover:bg-amber-600"
      >
        Scan Another Site
      </button>
    </div>
  );
}
