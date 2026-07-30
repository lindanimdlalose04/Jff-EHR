/**
 * A camp's temporal state, derived from today's date against its start and end
 * dates. The stored status field is used only to mark a camp cancelled;
 * planned, active and completed are informational and derived here, so a camp
 * whose end date has passed is never shown as a stale active, and a camp whose
 * dates contain today is active with no manual status setting.
 *
 * Dates arrive as "YYYY-MM-DD" strings (DateOnly), which compare lexically in
 * date order, so plain string comparison is correct. Both ends are inclusive:
 * a camp is active on its start date and on its end date.
 */
export type CampState = "planned" | "active" | "completed" | "cancelled";

interface CampLike {
  startDate: string;
  endDate: string;
  status: string;
}

function localDay(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export function deriveCampState(camp: CampLike, now: Date): CampState {
  if (camp.status.toLowerCase() === "cancelled") return "cancelled";
  const today = localDay(now);
  if (today < camp.startDate) return "planned";
  if (today > camp.endDate) return "completed";
  return "active";
}

export function isCampActive(camp: CampLike, now: Date): boolean {
  return deriveCampState(camp, now) === "active";
}
