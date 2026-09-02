import { cn } from "@/lib/utils";

interface FormSectionProps {
  /**
   * Accepted for compatibility with existing call sites but no longer rendered.
   * An icon beside a section title is decoration, not meaning; see
   * spec/design/design-system.md, rule 3.
   */
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}

/**
 * A block of related fields under a ruled, uppercase heading, matching the
 * label-and-value grid on the record screens. Square, no shadow, and the
 * heading sits on a rule rather than floating inside padding, so a long form
 * reads as a sequence of sections rather than a stack of cards.
 */
export function FormSection({ title, hint, tone = "default", children }: FormSectionProps) {
  const danger = tone === "danger";
  return (
    <section className={cn("mb-3 border bg-surface", danger ? "border-danger" : "border-card")}>
      <div
        className={cn(
          "flex flex-wrap items-baseline justify-between gap-3 border-b px-4 pb-1.5 pt-3",
          danger ? "border-danger bg-danger-tint" : "border-card",
        )}
      >
        <h2
          className={cn(
            "text-xs font-bold uppercase tracking-[0.07em]",
            danger ? "text-danger-text" : "text-accent",
          )}
        >
          {title}
        </h2>
        {hint && <span className="text-sm font-normal text-muted">{hint}</span>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
