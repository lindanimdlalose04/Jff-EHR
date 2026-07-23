import { apiClient } from "@/api/client";
import type {
  ArrivalCheckDto,
  CamperDto,
  CampDto,
  CampRegistrationDto,
  PrecampMedicalDto,
} from "@/api/types";

/**
 * Arrival check (the nurse's day-one form, Refinement A + B). One per
 * registration, draft -> signed lifecycle. Writes require the medical role;
 * a signed check accepts no further edits (trigger + API both refuse), so
 * corrections go through amend: soft-delete the signed row, start a new draft.
 */

export interface ArrivalCheckPayload {
  hasAllergies: boolean;
  allergiesDetail: string | null;
  eyesight: string | null;
  hearing: string | null;
  mobilityAids: string | null;
  prosthesis: string | null;
  otherNotes: string | null;
  adlNeeds: string | null;
  tbScreening: string | null;
  hasMedication: boolean;
  medicationHandedIn: boolean;
  medicationHandedInDate: string | null;
  medicationList: string | null;
  physicalCondition: string | null;
  additionalNotes: string | null;
}

export interface ArrivalCheckContext {
  registration: CampRegistrationDto;
  camper: CamperDto;
  camp: CampDto | null;
  precamp: PrecampMedicalDto | null;
  existing: ArrivalCheckDto | null;
}

export async function fetchArrivalCheckContext(
  registrationId: string,
): Promise<ArrivalCheckContext> {
  const { data: registration } = await apiClient.get<CampRegistrationDto>(
    `/campregistrations/${registrationId}`,
  );
  const [camperRes, campRes, precampRes, checkRes] = await Promise.all([
    apiClient.get<CamperDto>(`/campers/${registration.camperId}`),
    apiClient.get<CampDto>(`/camps/${registration.campId}`),
    apiClient.get<PrecampMedicalDto[]>("/precampmedicals", { params: { registrationId } }),
    apiClient.get<ArrivalCheckDto[]>("/arrivalchecks", { params: { registrationId } }),
  ]);
  return {
    registration,
    camper: camperRes.data,
    camp: campRes.data ?? null,
    precamp: precampRes.data[0] ?? null,
    existing: checkRes.data[0] ?? null,
  };
}

export async function createArrivalCheck(
  registrationId: string,
  payload: ArrivalCheckPayload,
): Promise<ArrivalCheckDto> {
  const { data } = await apiClient.post<ArrivalCheckDto>("/arrivalchecks", {
    registrationId,
    ...payload,
  });
  return data;
}

export async function updateArrivalCheck(
  arrivalCheckId: string,
  payload: ArrivalCheckPayload,
): Promise<ArrivalCheckDto> {
  const { data } = await apiClient.put<ArrivalCheckDto>(
    `/arrivalchecks/${arrivalCheckId}`,
    payload,
  );
  return data;
}

export async function signArrivalCheck(arrivalCheckId: string): Promise<ArrivalCheckDto> {
  const { data } = await apiClient.post<ArrivalCheckDto>(`/arrivalchecks/${arrivalCheckId}/sign`);
  return data;
}

/** The first half of the amend flow: retire the signed row as a visible amendment. */
export async function softDeleteArrivalCheck(arrivalCheckId: string): Promise<void> {
  await apiClient.delete(`/arrivalchecks/${arrivalCheckId}`);
}
