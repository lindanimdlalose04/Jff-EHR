import { apiClient } from "@/api/client";
import type {
  ConfirmRegistrationRequest,
  ImportResultDto,
  PendingRegistrationDto,
  CamperDto,
} from "@/api/types";

/**
 * Admin-only pre-camp registration intake. Every call is admin-gated at the API
 * (RegistrationIntakeController is [Authorize(Policy = "Admin")]); the UI gate is
 * convenience, the API gate is the enforcement.
 *
 * The flow: import a CSV export of the public intake form, review the staged
 * rows, and confirm each into a real camper, or discard it. Nothing here writes
 * clinical data; medical and the signature stay outside this path by design.
 */

export async function importRegistrationsCsv(file: File): Promise<ImportResultDto> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiClient.post<ImportResultDto>("/registrationintake/import", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function fetchPendingRegistrations(): Promise<PendingRegistrationDto[]> {
  return (await apiClient.get<PendingRegistrationDto[]>("/registrationintake/pending")).data;
}

export async function confirmRegistration(
  id: string,
  payload: ConfirmRegistrationRequest,
): Promise<CamperDto> {
  return (await apiClient.post<CamperDto>(`/registrationintake/${id}/confirm`, payload)).data;
}

export async function discardRegistration(id: string): Promise<void> {
  await apiClient.post(`/registrationintake/${id}/discard`);
}
