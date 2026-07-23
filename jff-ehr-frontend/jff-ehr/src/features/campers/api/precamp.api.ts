import { apiClient } from "@/api/client";
import type { CamperDto, CampRegistrationDto, PrecampMedicalDto } from "@/api/types";

/**
 * Pre-camp medical (the caregiver's half of the intake, Refinement A).
 * One per registration; editable (no signing lifecycle), medical role required
 * for writes, soft-delete only.
 */

export interface PrecampPayload {
  diagnosis: string | null;
  hospitalFileNumber: string | null;
  treatingContact: string | null;
  vlOver1000: boolean | null;
  viralLoad: string | null;
  vlTestDate: string | null;
  vlDateReceived: string | null;
  clinicalFindings: string | null;
  tbStatus: string | null;
  hepatitisB: boolean | null;
  tbOisHistory: boolean;
  tbOisHistoryDetail: string | null;
  medicationList: string | null;
  adherenceBarriers: boolean;
  adherenceBarriersDetail: string | null;
  dietaryRequirements: string | null;
  religion: string | null;
  additionalInfo: string | null;
  camperHistoryNotes: string | null;
}

export interface PrecampFormContext {
  registration: CampRegistrationDto;
  camper: CamperDto;
  existing: PrecampMedicalDto | null;
}

export async function fetchPrecampFormContext(registrationId: string): Promise<PrecampFormContext> {
  const { data: registration } = await apiClient.get<CampRegistrationDto>(
    `/campregistrations/${registrationId}`,
  );
  const [{ data: camper }, { data: existing }] = await Promise.all([
    apiClient.get<CamperDto>(`/campers/${registration.camperId}`),
    apiClient.get<PrecampMedicalDto[]>("/precampmedicals", { params: { registrationId } }),
  ]);
  return { registration, camper, existing: existing[0] ?? null };
}

export async function createPrecamp(
  registrationId: string,
  payload: PrecampPayload,
): Promise<PrecampMedicalDto> {
  const { data } = await apiClient.post<PrecampMedicalDto>("/precampmedicals", {
    registrationId,
    ...payload,
  });
  return data;
}

export async function updatePrecamp(
  precampId: string,
  payload: PrecampPayload,
): Promise<PrecampMedicalDto> {
  const { data } = await apiClient.put<PrecampMedicalDto>(`/precampmedicals/${precampId}`, payload);
  return data;
}
