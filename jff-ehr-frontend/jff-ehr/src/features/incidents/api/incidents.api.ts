import { apiClient } from "@/api/client";
import type {
  CamperDto,
  CampDto,
  CampRegistrationDto,
  MedicationEventDto,
  PrecampMedicalDto,
} from "@/api/types";

/**
 * Medication / treatment event / near miss reports.
 *
 * The option lists below are transcribed from the paper form (spec/forms/04)
 * and are the authority: exactly nine initial impressions and exactly three
 * contributing factors, in the form's order. Do not add to them.
 *
 * A filed event is append-and-review-only. Nobody edits it; a medical person
 * adds a review once, which the DB trigger permits exactly one time.
 */

export const EVENT_TYPES = [
  "Extra dose",
  "Wrong dose",
  "Wrong time",
  "Wrong camper",
  "Omission",
  "Omission of dose",
  "Wrong drug",
  "Expired product",
  "Wrong treatment",
] as const;

export const CONTRIBUTING_FACTORS = ["Distractions", "Workload", "Cross coverage"] as const;

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  return (await apiClient.get<T>(url, { params })).data;
}

export interface IncidentRosterEntry {
  registrationId: string;
  camper: CamperDto;
  cabin: string | null;
  diagnosis: string | null;
}

export interface IncidentFormContext {
  camp: CampDto | null;
  roster: IncidentRosterEntry[];
}

export async function fetchIncidentFormContext(
  campId: string | null,
): Promise<IncidentFormContext> {
  const [registrations, campers, camps] = await Promise.all([
    get<CampRegistrationDto[]>("/campregistrations"),
    get<CamperDto[]>("/campers"),
    get<CampDto[]>("/camps"),
  ]);
  const camp = campId ? (camps.find((c) => c.campId === campId) ?? null) : null;
  const camperById = new Map(campers.map((c) => [c.camperId, c]));

  const campRegs = registrations.filter((r) => r.campId === camp?.campId);
  const precamps = await Promise.all(
    campRegs.map((r) =>
      get<PrecampMedicalDto[]>("/precampmedicals", { registrationId: r.registrationId }),
    ),
  );

  const roster: IncidentRosterEntry[] = campRegs
    .map((r, i) => ({
      registrationId: r.registrationId,
      camper: camperById.get(r.camperId)!,
      cabin: r.cabin,
      diagnosis: precamps[i][0]?.diagnosis ?? camperById.get(r.camperId)?.diagnosis ?? null,
    }))
    .filter((r) => r.camper)
    .sort((a, b) => a.camper.surname.localeCompare(b.camper.surname));

  return { camp, roster };
}

export interface IncidentPayload {
  registrationId: string;
  eventAt: string;
  discoveryAt: string;
  description: string;
  /** JSON array drawn from EVENT_TYPES. */
  eventTypes: string;
  /** JSON array drawn from CONTRIBUTING_FACTORS. */
  contributingFactors: string | null;
  immediateAction: string;
  doctorNotified: string | null;
  noTreatmentOrdered: boolean;
  treatmentOrdered: string | null;
}

export async function fileIncident(payload: IncidentPayload): Promise<MedicationEventDto> {
  const { data } = await apiClient.post<MedicationEventDto>("/medicationevents", payload);
  return data;
}

export async function reviewIncident(
  eventId: string,
  correctiveAction: string,
): Promise<MedicationEventDto> {
  const { data } = await apiClient.post<MedicationEventDto>(
    `/medicationevents/${eventId}/review`,
    { correctiveAction },
  );
  return data;
}

export interface IncidentRow extends MedicationEventDto {
  camper: CamperDto | null;
  campLabel: string;
  types: string[];
  factors: string[];
}

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Filed events, scoped to the chosen active camp. Events whose registration
 * belongs to another camp are excluded, so the list matches the camp the rest
 * of the screen is acting on rather than mixing every camp's events together.
 */
export async function fetchIncidents(campId: string | null): Promise<IncidentRow[]> {
  if (!campId) return [];
  const [events, registrations, campers, camps] = await Promise.all([
    get<MedicationEventDto[]>("/medicationevents"),
    get<CampRegistrationDto[]>("/campregistrations"),
    get<CamperDto[]>("/campers"),
    get<CampDto[]>("/camps"),
  ]);
  const regById = new Map(registrations.map((r) => [r.registrationId, r]));
  const camperById = new Map(campers.map((c) => [c.camperId, c]));
  const campById = new Map(camps.map((c) => [c.campId, c]));

  return events
    .filter((e) => regById.get(e.registrationId)?.campId === campId)
    .map((e) => {
      const reg = regById.get(e.registrationId);
      const camp = reg && campById.get(reg.campId);
      return {
        ...e,
        camper: (reg && camperById.get(reg.camperId)) ?? null,
        campLabel: camp ? `Camp ${camp.campNumber}, ${camp.venue}` : "Camp",
        types: parseList(e.eventTypes),
        factors: parseList(e.contributingFactors),
      };
    })
    .sort((a, b) => b.eventAt.localeCompare(a.eventAt));
}
