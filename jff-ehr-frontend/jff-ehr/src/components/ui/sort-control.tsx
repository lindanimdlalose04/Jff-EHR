import { ArrowDownUp, ArrowDown, ArrowUp } from "lucide-react";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * The shared sort control for the list screens: a field chooser plus an
 * ascending/descending toggle. Kept identical everywhere so sorting is
 * learn-once across campers, camps, medications, MedShack and incidents.
 */

export type SortDirection = "asc" | "desc";

export interface SortOption {
  value: string;
  label: string;
}

interface SortControlProps {
  options: SortOption[];
  value: string;
  direction: SortDirection;
  onChange: (value: string) => void;
  onToggleDirection: () => void;
  id?: string;
  className?: string;
}

export function SortControl({
  options,
  value,
  direction,
  onChange,
  onToggleDirection,
  id,
  className,
}: SortControlProps) {
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <ArrowDownUp size={14} className="text-muted" />
      <span className="text-sm text-muted">Sort</span>
      <Select
        id={id}
        aria-label="Sort by"
        className="h-8 w-auto text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <button
        type="button"
        aria-label={direction === "asc" ? "Sort ascending, switch to descending" : "Sort descending, switch to ascending"}
        onClick={onToggleDirection}
        className="flex h-8 w-8 items-center justify-center rounded-control border border-field-border bg-field text-secondary transition hover:text-primary"
      >
        {direction === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
      </button>
    </div>
  );
}
