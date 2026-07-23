import { apiClient } from "@/api/client";
import type { CamperDto, CaregiverDto, EmergencyContactDto } from "@/api/types";

/**
 * Tier 1 maintain calls for the camper spine: campers themselves, caregivers
 * and emergency contacts (inline rows on the profile's Caregivers tab).
 * All writes require the medical or admin role; RLS enforces the same rule
 * at the database.
 */

export interface CamperPayload {
  firstName: string;
  surname: string;
  dob: string;
  sex: string;
  race: string | null;
  address: string | null;
  cellNumber: string | null;
  language: string | null;
  tShirtSize: string | null;
  photoUrl: string | null;
  diagnosis: string | null;
  treatingClinic: string | null;
  fileNumber: string;
  familyGroupId: string | null;
}

export async function createCamper(payload: CamperPayload): Promise<CamperDto> {
  const { data } = await apiClient.post<CamperDto>("/campers", payload);
  return data;
}

export async function updateCamper(camperId: string, payload: CamperPayload): Promise<CamperDto> {
  const { data } = await apiClient.put<CamperDto>(`/campers/${camperId}`, payload);
  return data;
}

export interface CaregiverPayload {
  name: string;
  cellNo: string;
  workNo: string | null;
  relationship: string;
  isPrimary: boolean;
}

export async function createCaregiver(camperId: string, payload: CaregiverPayload): Promise<CaregiverDto> {
  const { data } = await apiClient.post<CaregiverDto>("/caregivers", { camperId, ...payload });
  return data;
}

export async function updateCaregiver(caregiverId: string, payload: CaregiverPayload): Promise<CaregiverDto> {
  const { data } = await apiClient.put<CaregiverDto>(`/caregivers/${caregiverId}`, payload);
  return data;
}

export async function deleteCaregiver(caregiverId: string): Promise<void> {
  await apiClient.delete(`/caregivers/${caregiverId}`);
}

export interface EmergencyContactPayload {
  name: string;
  cellNo: string;
  workNo: string | null;
  relationship: string;
}

export async function createEmergencyContact(
  camperId: string,
  payload: EmergencyContactPayload,
): Promise<EmergencyContactDto> {
  const { data } = await apiClient.post<EmergencyContactDto>("/emergencycontacts", {
    camperId,
    ...payload,
  });
  return data;
}

export async function updateEmergencyContact(
  contactId: string,
  payload: EmergencyContactPayload,
): Promise<EmergencyContactDto> {
  const { data } = await apiClient.put<EmergencyContactDto>(
    `/emergencycontacts/${contactId}`,
    payload,
  );
  return data;
}

export async function deleteEmergencyContact(contactId: string): Promise<void> {
  await apiClient.delete(`/emergencycontacts/${contactId}`);
}
