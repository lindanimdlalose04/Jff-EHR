import { apiClient } from "@/api/client";
import type {
  CamperDto,
  CampDto,
  CampRegistrationDto,
  ConsentRecordDto,
} from "@/api/types";

/**
 * Consent capture per registration (spec/forms/01 part 3). Consent records are
 * Tier 2: append-only, never editable, never hard-deleted (the clinical
 * immutability trigger enforces this). A correction is a withdrawal (soft
 * delete) followed by a fresh record.
 *
 * The paper form's separable acknowledgements (indemnity, media release) are
 * modelled as distinct consent types on separate records, which matches the
 * schema and the form's "media release can be declined independently" note: a
 * declined media release simply has no record.
 */

export const CONSENT_TYPES = [
  { value: "indemnity", label: "Indemnity (attend, participate, travel)" },
  { value: "media_release", label: "Media release (photo and video)" },
  { value: "medical_treatment", label: "Medical treatment" },
] as const;

export function consentTypeLabel(value: string | null): string {
  return CONSENT_TYPES.find((t) => t.value === value)?.label ?? (value ?? "Consent");
}

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  return (await apiClient.get<T>(url, { params })).data;
}

export interface ConsentContext {
  registration: CampRegistrationDto;
  camper: CamperDto;
  camp: CampDto | null;
  consents: ConsentRecordDto[];
}

export async function fetchConsentContext(registrationId: string): Promise<ConsentContext> {
  const registration = await get<CampRegistrationDto>(`/campregistrations/${registrationId}`);
  const [camper, camp, consents] = await Promise.all([
    get<CamperDto>(`/campers/${registration.camperId}`),
    get<CampDto>(`/camps/${registration.campId}`),
    get<ConsentRecordDto[]>("/consentrecords", { registrationId }),
  ]);
  return { registration, camper, camp: camp ?? null, consents };
}

export interface ConsentPayload {
  consentType: string;
  signedBy: string;
  witnessName: string | null;
  signedAt: string;
  signedLocation: string | null;
  documentUrl: string | null;
  popiaAcknowledged: boolean;
}

export async function createConsent(
  registrationId: string,
  payload: ConsentPayload,
): Promise<ConsentRecordDto> {
  const { data } = await apiClient.post<ConsentRecordDto>("/consentrecords", {
    registrationId,
    ...payload,
  });
  return data;
}

/** Withdraws a consent record (soft delete); a fresh record replaces it. */
export async function withdrawConsent(consentId: string): Promise<void> {
  await apiClient.delete(`/consentrecords/${consentId}`);
}
