import { apiClient } from "@/api/client";
import type {
  ArrivalCheckDto,
  CamperDto,
  CampDto,
  CampRegistrationDto,
  CaregiverDto,
  ConsentRecordDto,
  EmergencyContactDto,
  MedshackTreatmentDto,
  MedshackVisitDto,
  PrecampMedicalDto,
  PrescriptionDto,
} from "@/api/types";

export interface VisitWithTreatments extends MedshackVisitDto {
  treatments: MedshackTreatmentDto[];
}

/** Everything the camper detail hub needs, fetched in one composed call. */
export interface CamperDetail {
  camper: CamperDto;
  siblings: CamperDto[];
  caregivers: CaregiverDto[];
  emergencyContacts: EmergencyContactDto[];
  registrations: CampRegistrationDto[];
  camps: CampDto[];
  precampMedicals: PrecampMedicalDto[];
  arrivalChecks: ArrivalCheckDto[];
  visits: VisitWithTreatments[];
  prescriptions: PrescriptionDto[];
  consents: ConsentRecordDto[];
}

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  const { data } = await apiClient.get<T>(url, { params });
  return data;
}

export async function fetchCamperDetail(camperId: string): Promise<CamperDetail> {
  const [camper, caregivers, emergencyContacts, registrations, camps, allCampers] =
    await Promise.all([
      get<CamperDto>(`/campers/${camperId}`),
      get<CaregiverDto[]>("/caregivers", { camperId }),
      get<EmergencyContactDto[]>("/emergencycontacts", { camperId }),
      get<CampRegistrationDto[]>("/campregistrations", { camperId }),
      get<CampDto[]>("/camps"),
      get<CamperDto[]>("/campers"),
    ]);

  // One clinical fetch per registration; a camper has at most a handful.
  const perRegistration = await Promise.all(
    registrations.map(async (reg) => {
      const registrationId = reg.registrationId;
      const [precampMedicals, arrivalChecks, visits, prescriptions, consents] =
        await Promise.all([
          get<PrecampMedicalDto[]>("/precampmedicals", { registrationId }),
          get<ArrivalCheckDto[]>("/arrivalchecks", { registrationId }),
          get<MedshackVisitDto[]>("/medshackvisits", { registrationId }),
          get<PrescriptionDto[]>("/prescriptions", { registrationId }),
          get<ConsentRecordDto[]>("/consentrecords", { registrationId }),
        ]);
      const visitsWithTreatments: VisitWithTreatments[] = await Promise.all(
        visits.map(async (visit) => ({
          ...visit,
          treatments: await get<MedshackTreatmentDto[]>("/medshacktreatments", {
            visitId: visit.visitId,
          }),
        })),
      );
      return { precampMedicals, arrivalChecks, visits: visitsWithTreatments, prescriptions, consents };
    }),
  );

  const siblings = camper.familyGroupId
    ? allCampers.filter(
        (c) => c.familyGroupId === camper.familyGroupId && c.camperId !== camper.camperId,
      )
    : [];

  return {
    camper,
    siblings,
    caregivers,
    emergencyContacts,
    registrations,
    camps,
    precampMedicals: perRegistration.flatMap((r) => r.precampMedicals),
    arrivalChecks: perRegistration.flatMap((r) => r.arrivalChecks),
    visits: perRegistration.flatMap((r) => r.visits),
    prescriptions: perRegistration.flatMap((r) => r.prescriptions),
    consents: perRegistration.flatMap((r) => r.consents),
  };
}
