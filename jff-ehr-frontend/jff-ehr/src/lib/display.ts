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
