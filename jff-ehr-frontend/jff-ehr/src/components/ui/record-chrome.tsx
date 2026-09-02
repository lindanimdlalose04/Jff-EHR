import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The shared record parts from spec/design/design-system.md, section 5:
 * the pinned banner, the tab strip, and the label-and-value grid.
 *
 * These exist so a screen composes known parts instead of inventing new ones.
 * That is what stops the interface drifting back into a different card for
 * every situation. Square, ruled, no shadows.
 */

/** A status flag shown in a banner. Always carries a word, never colour alone. */
export interface BannerFlag {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
}

const flagTone: Record<BannerFlag["tone"], string> = {
  success: "border-success bg-success-tint text-success-text",
  warning: "border-warning bg-warning-tint text-warning-text",
  danger: "border-danger bg-danger-tint text-danger-text",
  neutral: "border-field-border bg-neutral-tint text-neutral",
};

/**
 * Pinned identity strip. The hospital convention: who this record is about,
 * their identifiers, and anything dangerous, all visible without scrolling.
 * `title` is rendered as given, so campers pass "SURNAME, First".
 */
export function RecordBanner({
  title,
  meta,
  flags = [],
  media,
  actions,
}: {
  title: string;
  meta: ReactNode;
  flags?: BannerFlag[];
  media?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-card bg-page px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        {media}
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-primary">{title}</h1>
          <p className="mt-0.5 text-sm text-secondary">{meta}</p>
        </div>
      </div>
      {(flags.length > 0 || actions) && (
        <div className="flex flex-col items-end gap-2">
        <div className="flex flex-wrap justify-end gap-1.5">
          {flags.map((f) => (
            <span
              key={f.label}
              className={cn(
                "border px-2 py-[3px] text-xs font-bold uppercase tracking-[0.04em]",
                flagTone[f.tone],
              )}
            >
              {f.label}
            </span>
          ))}
        </div>
        {actions}
        </div>
      )}
    </div>
  );
}

/** Solid accent tab strip over a record. The active tab inverts to the surface. */
export function TabStrip<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
}) {
  return (
    <div role="tablist" className="flex flex-wrap bg-accent">
      {tabs.map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={t === active}
          onClick={() => onChange(t)}
          className={cn(
            "border-r border-accent-strong px-3.5 py-2 text-base font-semibold transition",
            t === active
              ? "bg-surface text-primary"
              : "text-white/85 hover:bg-accent-strong hover:text-white",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/** Uppercase section rule above a block of fields or a table. */
export function SectionHead({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-card px-4 pb-1.5 pt-3">
      <h2 className="text-xs font-bold uppercase tracking-[0.07em] text-accent">{title}</h2>
      {hint && <span className="text-sm text-muted">{hint}</span>}
    </div>
  );
}

/**
 * Two label-and-value pairs per row on wide screens, one on narrow. Labels sit
 * in a fixed column so values line up down the page, which is what makes a
 * record scannable rather than readable.
 */
export function FieldGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 sm:grid-cols-[150px_1fr] lg:grid-cols-[150px_1fr_150px_1fr]">{children}</dl>;
}

export function Field({
  label,
  value,
  mono = false,
  full = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <>
      <dt
        className={cn(
          "border-b border-divider px-4 py-2 text-sm font-semibold text-secondary",
          full && "lg:col-start-1",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "border-b border-divider px-3 py-2 text-base text-primary",
          mono && "mono",
          full && "lg:col-span-3",
        )}
      >
        {value || <span className="text-muted">Not recorded</span>}
      </dd>
    </>
  );
}

/**
 * Flush row of headline figures under a banner. Deliberately not separate
 * cards: one ruled strip reads as a single summary rather than four objects.
 */
export function StatStrip({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap border-b border-card">{children}</div>;
}

export function Stat({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: ReactNode;
  tone?: "plain" | "warning" | "danger";
}) {
  return (
    <div className="min-w-[120px] flex-1 border-r border-divider px-4 py-2.5 last:border-r-0">
      <span
        className={cn(
          "block text-xl font-bold tabular-nums",
          tone === "warning" && "text-warning-text",
          tone === "danger" && "text-danger-text",
          tone === "plain" && "text-primary",
        )}
      >
        {value}
      </span>
      <span className="mt-0.5 block text-xs font-normal normal-case tracking-normal text-muted">
        {label}
      </span>
    </div>
  );
}

/** Search, filters and the primary action, on a rule above a table. */
export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-divider px-4 py-2.5">
      {children}
    </div>
  );
}

/** Dense ruled table. Never a card per row. */
export function DataTable({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-base">
        <thead>
          <tr>{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const thClass =
  "border-b border-card bg-header-tint px-4 py-2 text-left text-xs font-bold uppercase tracking-[0.06em] text-secondary";
export const tdClass = "border-b border-divider px-4 py-2 text-primary align-middle";

/**
 * Header for a create-or-edit form, where there is not yet a record to pin a
 * banner to. Same ruled, square treatment as the banner so the two read as one
 * system, but without identifiers or flags.
 */
export function PageHead({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <div className="mb-3 border border-card bg-surface">
      <div className="border-b border-card bg-page px-4 py-3">
        <h1 className="text-lg font-bold text-primary">{title}</h1>
        {meta && <p className="mt-0.5 text-sm text-secondary">{meta}</p>}
      </div>
    </div>
  );
}

/**
 * Page footer for a long table. A camp roster is forty children and the camper
 * register runs to hundreds, which is past the point where one scrolling list
 * is readable. Shows the window and the total, so "31 to 60 of 124" tells you
 * both where you are and how much there is.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  noun = "records",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) {
    return (
      <div className="border-t border-divider px-4 py-2.5 text-sm text-muted">
        {total} {noun}
      </div>
    );
  }
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-divider px-4 py-2.5">
      <span className="text-sm text-muted">
        Showing <span className="mono font-semibold text-primary">{from}</span> to{" "}
        <span className="mono font-semibold text-primary">{to}</span> of{" "}
        <span className="mono font-semibold text-primary">{total}</span> {noun}
      </span>
      <span className="flex-1" />
      <span className="text-sm text-muted">
        Page <span className="mono">{page + 1}</span> of <span className="mono">{pages}</span>
      </span>
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
        className="rounded-control border border-field-border bg-field px-3 py-1 text-sm font-semibold text-secondary transition hover:text-primary disabled:opacity-40"
      >
        Previous
      </button>
      <button
        type="button"
        disabled={page >= pages - 1}
        onClick={() => onPage(page + 1)}
        className="rounded-control border border-field-border bg-field px-3 py-1 text-sm font-semibold text-secondary transition hover:text-primary disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
