import { apiClient } from "@/api/client";
import type {
  CamperDto,
  CampDto,
  CampRegistrationDto,
  CrewMemberDto,
  MedshackTreatmentDto,
  MedshackVisitDto,
} from "@/api/types";
import { isCampActive } from "@/lib/camp-state";

/**
 * MedShack visits (Tier 2, append and correct only) and their treatments
 * (repeating rows, append-only, sequence numbered server-side).
 *
 * A visit is saved first, then its treatment rows are appended to the returned
 * visit id, because medshack_treatments carries the visit foreign key. Both
 * writes require the medical role.
 */

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  return (await apiClient.get<T>(url, { params })).data;
}

export interface RosterEntry {
  registrationId: string;
  camper: CamperDto;
  groupName: string | null;
  cabin: string | null;
}

export interface VisitFormContext {
  camp: CampDto | null;
  roster: RosterEntry[];
  doctors: CrewMemberDto[];
}

export async function fetchVisitFormContext(): Promise<VisitFormContext> {
  const [registrations, campers, camps, crew] = await Promise.all([
    get<CampRegistrationDto[]>("/campregistrations"),
    get<CamperDto[]>("/campers"),
    get<CampDto[]>("/camps"),
    get<CrewMemberDto[]>("/crewmembers"),
  ]);

  const now = new Date();
  const camp = camps.find((c) => isCampActive(c, now)) ?? null;
  const camperById = new Map(campers.map((c) => [c.camperId, c]));

  const roster: RosterEntry[] = registrations
    .filter((r) => r.campId === camp?.campId)
    .map((r) => ({
      registrationId: r.registrationId,
      camper: camperById.get(r.camperId)!,
      groupName: r.groupName,
      cabin: r.cabin,
    }))
    .filter((r) => r.camper)
    .sort((a, b) =>
      `${a.camper.surname} ${a.camper.firstName}`.localeCompare(
        `${b.camper.surname} ${b.camper.firstName}`,
      ),
    );

  return { camp, roster, doctors: crew.filter((c) => c.role.toLowerCase() === "doctor") };
}

export interface VisitPayload {
  registrationId: string;
  visitAt: string;
  reason: string;
  accompaniedBy: string | null;
  temperature: number | null;
  pulse: number | null;
  bloodPressure: string | null;
  oxygenSaturation: number | null;
  medicalHistory: string | null;
  signsSymptoms: string | null;
  findings: string | null;
  nursingReport: string | null;
  adviceGiven: string | null;
  doctorId: string | null;
}

export interface TreatmentPayload {
  /** ISO timestamp. */
  treatmentTime: string;
  treatmentDescription: string;
  outcome: string | null;
}

export async function createVisit(payload: VisitPayload): Promise<MedshackVisitDto> {
  const { data } = await apiClient.post<MedshackVisitDto>("/medshackvisits", payload);
  return data;
}

export async function appendTreatment(
  visitId: string,
  treatment: TreatmentPayload,
): Promise<MedshackTreatmentDto> {
  const { data } = await apiClient.post<MedshackTreatmentDto>("/medshacktreatments", {
    visitId,
    ...treatment,
  });
  return data;
}

/**
 * Saves the visit, then appends its treatment rows in order so the
 * server-computed sequence numbers follow the order the nurse entered them.
 */
export async function createVisitWithTreatments(
  payload: VisitPayload,
  treatments: TreatmentPayload[],
): Promise<MedshackVisitDto> {
  const visit = await createVisit(payload);
  for (const treatment of treatments) {
    await appendTreatment(visit.visitId, treatment);
  }
  return visit;
}

export interface VisitRow extends MedshackVisitDto {
  camper: CamperDto | null;
  campLabel: string;
  treatments: MedshackTreatmentDto[];
}

export async function fetchVisits(): Promise<VisitRow[]> {
  const [visits, registrations, campers, camps] = await Promise.all([
    get<MedshackVisitDto[]>("/medshackvisits"),
    get<CampRegistrationDto[]>("/campregistrations"),
    get<CamperDto[]>("/campers"),
    get<CampDto[]>("/camps"),
  ]);
  const regById = new Map(registrations.map((r) => [r.registrationId, r]));
  const camperById = new Map(campers.map((c) => [c.camperId, c]));
  const campById = new Map(camps.map((c) => [c.campId, c]));

  const rows = await Promise.all(
    visits.map(async (visit): Promise<VisitRow> => {
      const reg = regById.get(visit.registrationId);
      const camp = reg && campById.get(reg.campId);
      return {
        ...visit,
        camper: (reg && camperById.get(reg.camperId)) ?? null,
        campLabel: camp ? `Camp ${camp.campNumber}, ${camp.venue}` : "Camp",
        treatments: (
          await get<MedshackTreatmentDto[]>("/medshacktreatments", { visitId: visit.visitId })
        ).sort((a, b) => a.sequenceNo - b.sequenceNo),
      };
    }),
  );
  return rows.sort((a, b) => b.visitAt.localeCompare(a.visitAt));
}
