import { cn } from "@/lib/utils";

interface FormSectionProps {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}

export function FormSection({
  icon,
  title,
  hint,
  tone = "default",
  children,
}: FormSectionProps) {
  const danger = tone === "danger";
  return (
    <section
      className={cn(
        "mb-3 rounded-card border p-4",
        danger ? "border-danger-border bg-danger-tint" : "border-card bg-surface",
      )}
    >
      <div
        className={cn(
          "mb-3 flex items-center gap-2 text-[13px] font-medium",
          danger ? "text-danger" : "text-accent",
        )}
      >
        {icon}
        <span>{title}</span>
        {hint && <span className="text-[11.5px] font-normal text-muted">{hint}</span>}
      </div>
      {children}
    </section>
  );
}
