import { apiClient } from "@/api/client";
import type {
  ArrivalCheckDto,
  CamperDto,
  CampDto,
  CampRegistrationDto,
  ConsentRecordDto,
  MedicationDoseDto,
  MedicationEventDto,
  MedshackVisitDto,
  PrescriptionDto,
} from "@/api/types";
import {
  isPrescriptionActiveOn,
  parseScheduledTimes,
  resolveSlot,
  toLocalDay,
  type DoseSlot,
} from "@/features/medications/api/medications.api";

/**
 * Everything the camp hub needs for one camp episode, composed in one call:
 * the roster with its status pills, the day's medication round, this camp's
 * MedShack visits and its near-miss events.
 *
 * The roster pill follows the shared vocabulary. Consent is the acceptance
 * gate, so a missing consent record outranks the assessment state: no child is
 * accepted to camp without a signed indemnity.
 */

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  return (await apiClient.get<T>(url, { params })).data;
}

export type RosterPill = "assessed" | "draft" | "not assessed" | "no consent";

export interface RosterRow {
  registration: CampRegistrationDto;
  camper: CamperDto;
  arrivalCheck: ArrivalCheckDto | null;
  hasConsent: boolean;
  pill: RosterPill;
}

export interface CampDoseRow {
  slot: DoseSlot;
  prescription: PrescriptionDto;
  camper: CamperDto;
  registration: CampRegistrationDto;
}

export interface CampHub {
  camp: CampDto;
  /** The day the medication round is shown for, anchored into the camp. */
  day: string;
  isToday: boolean;
  roster: RosterRow[];
  doses: CampDoseRow[];
  visits: MedshackVisitDto[];
  incidents: MedicationEventDto[];
}

function rosterPill(check: ArrivalCheckDto | null, hasConsent: boolean): RosterPill {
  if (!hasConsent) return "no consent";
  if (!check) return "not assessed";
  return check.status === "signed" ? "assessed" : "draft";
}

export function pillTone(pill: RosterPill): "success" | "warning" | "danger" {
  if (pill === "assessed") return "success";
  if (pill === "no consent") return "danger";
  return "warning";
}

export async function fetchCampHub(campId: string, dayOffset: number, now: Date): Promise<CampHub> {
  const [camp, allRegistrations, campers] = await Promise.all([
    get<CampDto>(`/camps/${campId}`),
    get<CampRegistrationDto[]>("/campregistrations", { campId }),
    get<CamperDto[]>("/campers"),
  ]);

  const camperById = new Map(campers.map((c) => [c.camperId, c]));
  const registrations = allRegistrations.filter((r) => camperById.has(r.camperId));

  // Per-registration clinical fetches. A camp roster is a few dozen rows at most.
  const perRegistration = await Promise.all(
    registrations.map(async (registration) => {
      const registrationId = registration.registrationId;
      const [checks, consents, prescriptions, visits, incidents] = await Promise.all([
        get<ArrivalCheckDto[]>("/arrivalchecks", { registrationId }),
        get<ConsentRecordDto[]>("/consentrecords", { registrationId }),
        get<PrescriptionDto[]>("/prescriptions", { registrationId }),
        get<MedshackVisitDto[]>("/medshackvisits", { registrationId }),
        get<MedicationEventDto[]>("/medicationevents", { registrationId }),
      ]);
      return { registration, checks, consents, prescriptions, visits, incidents };
    }),
  );

  const today = toLocalDay(now);
  const anchorDay =
    today < camp.startDate ? camp.startDate : today > camp.endDate ? camp.endDate : today;
  const anchor = new Date(`${anchorDay}T00:00:00`);
  anchor.setDate(anchor.getDate() + dayOffset);
  const day = toLocalDay(anchor);

  const roster: RosterRow[] = perRegistration
    .map(({ registration, checks, consents }) => {
      const arrivalCheck = checks[0] ?? null;
      const hasConsent = consents.length > 0;
      return {
        registration,
        camper: camperById.get(registration.camperId)!,
        arrivalCheck,
        hasConsent,
        pill: rosterPill(arrivalCheck, hasConsent),
      };
    })
    .sort((a, b) =>
      `${a.camper.surname} ${a.camper.firstName}`.localeCompare(
        `${b.camper.surname} ${b.camper.firstName}`,
      ),
    );

  // The day's round for this camp: same computed-schedule model as screen 5.
  const activePrescriptions = perRegistration.flatMap(({ registration, prescriptions }) =>
    prescriptions
      .filter((p) => isPrescriptionActiveOn(p, day, camp))
      .map((p) => ({ registration, prescription: p })),
  );

  const doseLists = await Promise.all(
    activePrescriptions.map(({ prescription }) =>
      get<MedicationDoseDto[]>("/medicationdoses", {
        prescriptionId: prescription.prescriptionId,
      }),
    ),
  );

  const doses: CampDoseRow[] = [];
  activePrescriptions.forEach(({ registration, prescription }, i) => {
    for (const time of parseScheduledTimes(prescription.scheduledTimes)) {
      doses.push({
        slot: resolveSlot(prescription.prescriptionId, day, time, doseLists[i], now),
        prescription,
        camper: camperById.get(registration.camperId)!,
        registration,
      });
    }
  });
  doses.sort(
    (a, b) =>
      a.slot.time.localeCompare(b.slot.time) ||
      a.camper.surname.localeCompare(b.camper.surname),
  );

  return {
    camp,
    day,
    isToday: day === today,
    roster,
    doses,
    visits: perRegistration
      .flatMap((r) => r.visits)
      .sort((a, b) => b.visitAt.localeCompare(a.visitAt)),
    incidents: perRegistration
      .flatMap((r) => r.incidents)
      .sort((a, b) => b.eventAt.localeCompare(a.eventAt)),
  };
}
