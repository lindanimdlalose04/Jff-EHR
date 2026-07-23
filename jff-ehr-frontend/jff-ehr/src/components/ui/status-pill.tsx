import { cn } from "@/lib/utils";

export type PillTone = "success" | "warning" | "danger" | "neutral" | "admin";

const toneStyles: Record<PillTone, string> = {
  success: "bg-accent-tint text-accent",
  warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger",
  neutral: "bg-neutral-tint text-neutral",
  admin: "bg-admin-tint text-admin",
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
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
