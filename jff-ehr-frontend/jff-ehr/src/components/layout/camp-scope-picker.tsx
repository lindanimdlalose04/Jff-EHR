import { Tent } from "lucide-react";
import { Select } from "@/components/ui/field";
import { useActiveCamp } from "@/app/active-camp-context";
import type { CampDto } from "@/api/types";

/**
 * The camp-scope control for the screens that act on the active camp (home,
 * rounds, MedShack, incidents). It adapts to how many camps are running at
 * once: no active camp shows nothing (the screen shows its own empty state), a
 * single active camp is a plain label, and two or more become a dropdown whose
 * choice carries across every scoped screen.
 */
export function CampScopePicker({ className = "" }: { className?: string }) {
  const { activeCamps, selectedCampId, setSelectedCampId } = useActiveCamp();

  if (activeCamps.length === 0) return null;

  const label = (camp: CampDto) => `Camp ${camp.campNumber}, ${camp.venue}`;

  if (activeCamps.length === 1) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium text-secondary ${className}`}
      >
        <Tent size={13} className="text-muted" />
        {label(activeCamps[0])}
      </span>
    );
  }

  return (
    <label className={`inline-flex items-center gap-1.5 ${className}`}>
      <Tent size={13} className="text-muted" />
      <span className="sr-only">Active camp</span>
      <Select
        className="h-8 w-auto text-[12.5px]"
        value={selectedCampId ?? ""}
        onChange={(e) => setSelectedCampId(e.target.value)}
      >
        {activeCamps.map((camp) => (
          <option key={camp.campId} value={camp.campId}>
            {label(camp)}
          </option>
        ))}
      </Select>
    </label>
  );
}
