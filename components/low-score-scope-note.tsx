import {
  LOW_SCORE_SCOPE_NOTE,
  LOW_SCORE_SCOPE_NOTE_SECONDARY,
} from "@/lib/scan-messaging";

export function LowScoreScopeNote() {
  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-950/50">
      <p className="text-sm leading-6 text-amber-950 dark:text-amber-100">{LOW_SCORE_SCOPE_NOTE}</p>
      <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-100/90">
        {LOW_SCORE_SCOPE_NOTE_SECONDARY}
      </p>
    </div>
  );
}
