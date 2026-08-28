import { differenceInYears, format, parseISO } from "date-fns";
import type { PillTone } from "@/components/ui/status-pill";

export function formatDate(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy");
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy, HH:mm");
}

export function ageYears(dobIso: string): number {
  return differenceInYears(new Date(), parseISO(dobIso));
}

/** Camp + registration statuses → design-system pill tones. */
export function statusTone(status: string): PillTone {
  switch (status.toLowerCase()) {
    case "active":
    case "checked_in":
    case "attended":
      return "success";
    case "planned":
    case "registered":
      return "warning";
    case "completed":
    case "closed":
    case "cancelled":
      return "neutral";
    default:
      return "neutral";
  }
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

export function initialsOf(first: string, last: string): string {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

/**
 * The `sex` column holds two conventions in live data: "M" / "F" from the
 * original seeder, and "Male" / "Female" from the registration intake import.
 * Reading it with a bare `sex === "M"` test displayed every "Male" camper as
 * Female, and worse, the camper edit form loaded "Female" as "M", so saving an
 * unrelated change silently flipped her sex. Normalise on the way in and out.
 *
 * Canonical stored form is "M" / "F", matching the form enum and the seeder.
 */
export function normaliseSex(sex: string | null | undefined): "M" | "F" | null {
  const v = (sex ?? "").trim().toLowerCase();
  if (v === "m" || v === "male") return "M";
  if (v === "f" || v === "female") return "F";
  return null;
}

/** Human label for either stored convention. */
export function formatSex(sex: string | null | undefined): string {
  const n = normaliseSex(sex);
  return n === "M" ? "Male" : n === "F" ? "Female" : "Not recorded";
}
