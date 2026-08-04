import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { CampDto } from "@/api/types";
import { useCamps } from "@/features/camps/hooks/use-camps";
import { getActiveCamps } from "@/lib/camp-state";

/**
 * The active-camp scope, shared across every screen that acts on "the camp
 * happening now": home, medication rounds, MedShack and incidents. The NPO can
 * run camps in several provinces at once, so the scope is a chosen camp among
 * however many are active, not an assumed single one. The choice is picked once
 * and carried across those screens for the session.
 */

interface ActiveCampContextValue {
  /** Every camp active today, earliest start first. */
  activeCamps: CampDto[];
  /** The camp the scoped screens act on, or null when none is active. */
  selectedCampId: string | null;
  selectedCamp: CampDto | null;
  setSelectedCampId: (campId: string) => void;
  isLoading: boolean;
}

const ActiveCampContext = createContext<ActiveCampContextValue | null>(null);

export function ActiveCampProvider({ children }: { children: ReactNode }) {
  const [now] = useState(() => new Date());
  const { data: camps, isLoading } = useCamps();
  const [override, setOverride] = useState<string | null>(null);

  const activeCamps = useMemo(() => getActiveCamps(camps ?? [], now), [camps, now]);

  // The default is the first active camp. An explicit choice is honoured only
  // while that camp is still active, so a camp ending or being cancelled falls
  // back cleanly to the default rather than leaving a dangling selection.
  const selectedCampId =
    override && activeCamps.some((c) => c.campId === override)
      ? override
      : (activeCamps[0]?.campId ?? null);
  const selectedCamp = activeCamps.find((c) => c.campId === selectedCampId) ?? null;

  const value = useMemo<ActiveCampContextValue>(
    () => ({
      activeCamps,
      selectedCampId,
      selectedCamp,
      setSelectedCampId: setOverride,
      isLoading,
    }),
    [activeCamps, selectedCampId, selectedCamp, isLoading],
  );

  return <ActiveCampContext.Provider value={value}>{children}</ActiveCampContext.Provider>;
}

export function useActiveCamp(): ActiveCampContextValue {
  const ctx = useContext(ActiveCampContext);
  if (!ctx) throw new Error("useActiveCamp must be used inside <ActiveCampProvider>");
  return ctx;
}
