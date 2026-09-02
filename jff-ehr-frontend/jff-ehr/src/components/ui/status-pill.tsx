import { cn } from "@/lib/utils";

export type PillTone = "success" | "warning" | "danger" | "neutral" | "admin";

/**
 * Clinical Blue: every tone is a tinted fill with a matching border and a dark
 * readable text step. Success is green, NOT the accent. Blue is chrome in this
 * system and must never be read as "good". See spec/design/design-system.md.
 */
const toneStyles: Record<PillTone, string> = {
  success: "border-success bg-success-tint text-success-text",
  warning: "border-warning bg-warning-tint text-warning-text",
  danger: "border-danger bg-danger-tint text-danger-text",
  neutral: "border-field-border bg-neutral-tint text-neutral",
  admin: "border-admin bg-admin-tint text-admin",
};

interface StatusPillProps {
  tone: PillTone;
  children: React.ReactNode;
  className?: string;
}

export function StatusPill({ tone, children, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-semibold",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
