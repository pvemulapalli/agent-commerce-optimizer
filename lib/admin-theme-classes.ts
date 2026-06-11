import {
  cardNestedClass,
  inputClass,
  textPrimaryClass,
  textSecondaryClass,
} from "./theme-classes";

export const adminSectionClass =
  "rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8";
export const adminHeadingClass = `text-lg font-semibold ${textPrimaryClass}`;
export const adminBodyClass = `mt-2 text-sm leading-6 ${textSecondaryClass}`;
export const adminInputClass = inputClass;
export const adminLabelClass = `block text-sm font-medium ${textPrimaryClass}`;
export const adminTextareaClass = `mt-2 w-full ${inputClass}`;
export const adminTextareaMonoClass = `mt-2 w-full font-mono ${inputClass}`;
export const adminSecondaryButtonClass =
  "rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-card-muted disabled:opacity-60";
export const adminCodeClass =
  "rounded bg-card-muted px-1.5 py-0.5 text-xs text-text-primary";
export const adminNestedPanelClass = `mt-6 space-y-4 ${cardNestedClass} px-4 py-4`;
export const adminTableWrapClass =
  "mt-4 overflow-x-auto rounded-lg border border-card-border";
export const adminTableHeadClass = "sticky top-0 bg-card-muted";
export const adminTableHeaderCellClass =
  "border-b border-card-border px-3 py-2 text-xs uppercase tracking-wide text-text-secondary";
export const adminTableCellClass = "px-3 py-3 text-text-secondary";
export const adminTableRowClass = "border-b border-card-border align-top";
