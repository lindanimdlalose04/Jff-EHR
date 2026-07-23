import { apiClient } from "@/api/client";
import type {
  ArrivalCheckDto,
  CamperDto,
  CampDto,
  CampRegistrationDto,
  MedicationDoseDto,
  PrecampMedicalDto,
  PrescriptionDto,
} from "@/api/types";

/**
 * Medication grid and rounds.
 *
 * Architecture note: medication_doses is append-only (the clinical
 * immutability trigger blocks every column update except the soft-delete
 * pair), so a "scheduled" row can never be flipped to "given". The schedule is
 * therefore COMPUTED from each prescription's scheduled_times across its date
 * range, and a dose row is written only when an administration is recorded.
 * A slot is missed when its time has passed and no given row exists, which
 * makes the missed flag automatic rather than a manual status anyone sets.
 */

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  return (await apiClient.get<T>(url, { params })).data;
}

export type SlotState = "given" | "pending" | "missed";

export interface DoseSlot {
  prescriptionId: string;
  /** Local ISO day, "2026-07-14". */
  day: string;
  /** "19:00". */
  time: string;
  scheduledAt: Date;
  state: SlotState;
  givenDose: MedicationDoseDto | null;
}

export function parseScheduledTimes(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function toLocalDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Builds the scheduled datetime for a slot in the browser's local zone. */
export function slotDateTime(day: string, time: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/**
 * Resolves one slot's state from the dose rows recorded against its
 * prescription. A given row wins; otherwise time decides pending vs missed.
 */
export function resolveSlot(
  prescriptionId: string,
  day: string,
  time: string,
  doses: MedicationDoseDto[],
  now: Date,
): DoseSlot {
  const scheduledAt = slotDateTime(day, time);
  const match = doses.find((dose) => {
    const at = new Date(dose.scheduledAt);
    return toLocalDay(at) === day && `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}` === time;
  });
  const given =
    match && ((match.status ?? "").toLowerCase() === "given" || match.administeredAt != null)
      ? match
      : null;

  return {
    prescriptionId,
    day,
    time,
    scheduledAt,
    state: given ? "given" : scheduledAt < now ? "missed" : "pending",
    givenDose: given ?? null,
  };
}

// ---------------------------------------------------------------------------
// Per-camper weekly grid
// ---------------------------------------------------------------------------

export interface CamperGridContext {
  registration: CampRegistrationDto;
  camper: CamperDto;
  camp: CampDto | null;
  arrivalCheck: ArrivalCheckDto | null;
  precamp: PrecampMedicalDto | null;
  prescriptions: PrescriptionDto[];
  dosesByPrescription: Record<string, MedicationDoseDto[]>;
}

export async function fetchCamperGrid(registrationId: string): Promise<CamperGridContext> {
  const registration = await get<CampRegistrationDto>(`/campregistrations/${registrationId}`);
  const [camper, camp, checks, precamps, prescriptions] = await Promise.all([
    get<CamperDto>(`/campers/${registration.camperId}`),
    get<CampDto>(`/camps/${registration.campId}`),
    get<ArrivalCheckDto[]>("/arrivalchecks", { registrationId }),
    get<PrecampMedicalDto[]>("/precampmedicals", { registrationId }),
    get<PrescriptionDto[]>("/prescriptions", { registrationId }),
  ]);

  const doseLists = await Promise.all(
    prescriptions.map((p) =>
      get<MedicationDoseDto[]>("/medicationdoses", { prescriptionId: p.prescriptionId }),
    ),
  );
  const dosesByPrescription: Record<string, MedicationDoseDto[]> = {};
  prescriptions.forEach((p, i) => {
    dosesByPrescription[p.prescriptionId] = doseLists[i];
  });

  return {
    registration,
    camper,
    camp: camp ?? null,
    arrivalCheck: checks[0] ?? null,
    precamp: precamps[0] ?? null,
    prescriptions,
    dosesByPrescription,
  };
}

// ---------------------------------------------------------------------------
// Per-camp rounds for a given day
// ---------------------------------------------------------------------------

export interface RoundEntry {
  slot: DoseSlot;
  prescription: PrescriptionDto;
  camper: CamperDto;
  registration: CampRegistrationDto;
}

export interface RoundsContext {
  camp: CampDto | null;
  /** The day actually shown, after anchoring into the camp's date range. */
  day: string;
  isToday: boolean;
  entries: RoundEntry[];
}

/**
 * Rounds for the active camp, offset in days from the anchor. The anchor is
 * today when today falls inside the camp, otherwise the camp's nearest day, so
 * the screen opens on real work rather than an empty list when the demo camp's
 * dates have passed.
 */
export async function fetchRounds(dayOffset: number, now: Date): Promise<RoundsContext> {
  const [camps, registrations, campers, prescriptions] = await Promise.all([
    get<CampDto[]>("/camps"),
    get<CampRegistrationDto[]>("/campregistrations"),
    get<CamperDto[]>("/campers"),
    get<PrescriptionDto[]>("/prescriptions"),
  ]);

  const camp = camps.find((c) => c.status.toLowerCase() === "active") ?? null;
  const today = toLocalDay(now);
  if (!camp) return { camp: null, day: today, isToday: true, entries: [] };

  const anchorDay =
    today < camp.startDate ? camp.startDate : today > camp.endDate ? camp.endDate : today;
  const anchor = new Date(`${anchorDay}T00:00:00`);
  anchor.setDate(anchor.getDate() + dayOffset);
  const day = toLocalDay(anchor);

  const regById = new Map(registrations.map((r) => [r.registrationId, r]));
  const camperById = new Map(campers.map((c) => [c.camperId, c]));
  const campPrescriptions = prescriptions.filter(
    (p) => regById.get(p.registrationId)?.campId === camp.campId,
  );

  const doseLists = await Promise.all(
    campPrescriptions.map((p) =>
      get<MedicationDoseDto[]>("/medicationdoses", { prescriptionId: p.prescriptionId }),
    ),
  );

  const entries: RoundEntry[] = [];
  campPrescriptions.forEach((prescription, i) => {
    const registration = regById.get(prescription.registrationId);
    const camper = registration && camperById.get(registration.camperId);
    if (!registration || !camper) return;
    if (!isPrescriptionActiveOn(prescription, day, camp)) return;

    for (const time of parseScheduledTimes(prescription.scheduledTimes)) {
      entries.push({
        slot: resolveSlot(prescription.prescriptionId, day, time, doseLists[i], now),
        prescription,
        camper,
        registration,
      });
    }
  });

  entries.sort(
    (a, b) =>
      a.slot.time.localeCompare(b.slot.time) ||
      a.camper.surname.localeCompare(b.camper.surname),
  );
  return { camp, day, isToday: day === today, entries };
}

/** A prescription covers a day if it started by then and has not ended. */
export function isPrescriptionActiveOn(
  prescription: PrescriptionDto,
  day: string,
  camp: CampDto | null,
): boolean {
  if (day < prescription.startDate) return false;
  const end = prescription.endDate ?? camp?.endDate ?? null;
  if (end && day > end) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Recording an administration (the electronic signature)
// ---------------------------------------------------------------------------

export async function recordDose(input: {
  prescriptionId: string;
  scheduledAt: Date;
  notes?: string | null;
}): Promise<MedicationDoseDto> {
  const { data } = await apiClient.post<MedicationDoseDto>("/medicationdoses", {
    prescriptionId: input.prescriptionId,
    scheduledAt: input.scheduledAt.toISOString(),
    administeredAt: new Date().toISOString(),
    status: "given",
    notes: input.notes ?? null,
  });
  return data;
}
