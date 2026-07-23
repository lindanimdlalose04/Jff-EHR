import { apiClient } from "@/api/client";
import type {
  CamperDto,
  CampDto,
  CampRegistrationDto,
  PrescriptionDto,
} from "@/api/types";

/**
 * Prescriptions maintain. The one hybrid in the two-tier model: full CRUD
 * while no dose has been administered, locked afterwards (the API returns 409
 * and the DB trigger refuses the write independently). Withdrawing is a soft
 * delete and stays available in both states, since stopping a medication is a
 * legitimate clinical action.
 */

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  return (await apiClient.get<T>(url, { params })).data;
}

export interface PrescriptionPayload {
  medicationName: string;
  dose: string;
  route: string | null;
  frequency: string;
  /** JSON array of "HH:mm" strings. */
  scheduledTimes: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
}

export interface PrescriptionsContext {
  registration: CampRegistrationDto;
  camper: CamperDto;
  camp: CampDto | null;
  prescriptions: PrescriptionDto[];
}

export async function fetchPrescriptionsContext(
  registrationId: string,
): Promise<PrescriptionsContext> {
  const registration = await get<CampRegistrationDto>(`/campregistrations/${registrationId}`);
  const [camper, camp, prescriptions] = await Promise.all([
    get<CamperDto>(`/campers/${registration.camperId}`),
    get<CampDto>(`/camps/${registration.campId}`),
    get<PrescriptionDto[]>("/prescriptions", { registrationId }),
  ]);
  return { registration, camper, camp: camp ?? null, prescriptions };
}

export async function createPrescription(
  registrationId: string,
  payload: PrescriptionPayload,
): Promise<PrescriptionDto> {
  const { data } = await apiClient.post<PrescriptionDto>("/prescriptions", {
    registrationId,
    ...payload,
  });
  return data;
}

export async function updatePrescription(
  prescriptionId: string,
  payload: PrescriptionPayload,
): Promise<PrescriptionDto> {
  const { data } = await apiClient.put<PrescriptionDto>(
    `/prescriptions/${prescriptionId}`,
    payload,
  );
  return data;
}

/** Soft delete: withdraws the prescription from the active list. */
export async function withdrawPrescription(prescriptionId: string): Promise<void> {
  await apiClient.delete(`/prescriptions/${prescriptionId}`);
}

/** "07:00, 19:00" -> '["07:00","19:00"]'. */
export function timesToJson(input: string): string {
  const times = input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return JSON.stringify(times);
}

/** '["07:00","19:00"]' -> "07:00, 19:00". */
export function timesToInput(raw: string | null): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]).join(", ") : "";
  } catch {
    return "";
  }
}
