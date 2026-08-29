import { apiClient } from "@/api/client";
import type {
  ArrivalCheckDto,
  CamperDto,
  CampDto,
  CampRegistrationDto,
  MedicationDoseDto,
  MedshackVisitDto,
  PrescriptionDto,
  ConsentRecordDto,
} from "@/api/types";
import {
  isPrescriptionActiveOn,
  parseScheduledTimes,
  resolveSlot,
  toLocalDay,
  type DoseSlot,
} from "@/features/medications/api/medications.api";

/**
 * The home dashboard's data, composed in one call. Every field backs a tile
 * that traces to a stated client pain point (spec/wireframes/04): today's
 * round with the missed-dose flag, assessment progress against the six-hour
 * day-one bottleneck, recent MedShack activity, and the active camp anchor.
 *
 * Arrival checks and visits are fetched once (unfiltered) and narrowed to the
 * scoped camp client-side, rather than once per registration, to keep the
 * landing screen quick. The camp is chosen by the caller (the active-camp
 * scope) rather than assumed, since several camps can be active at once.
 */

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  return (await apiClient.get<T>(url, { params })).data;
}

export interface RoundTileEntry {
  slot: DoseSlot;
  camperName: string;
  camperId: string;
  registrationId: string;
  medicationName: string;
}

export interface RecentVisit {
  visitId: string;
  camperId: string | null;
  camperName: string;
  reason: string;
  visitAt: string;
}

/** One camp day on the adherence chart. */
export interface DayTotals {
  /** Local ISO day. */
  day: string;
  /** 1-based camp day. */
  dayNumber: number;
  given: number;
  missed: number;
}

/** A single thing that needs a person to act, shown in the exceptions table. */
export interface Exception {
  kind: "no consent" | "missed" | "draft check" | "not checked in";
  camperName: string;
  camperId: string;
  registrationId: string;
  detail: string;
}

export interface Dashboard {
  camp: CampDto | null;
  /** 1-based day within the camp, clamped; null before it starts. */
  dayNumber: number | null;
  totalDays: number;
  rosterCount: number;
  assessedCount: number;
  round: RoundTileEntry[];
  roundDay: string;
  isToday: boolean;
  recentVisits: RecentVisit[];
  /** Doses given and missed for each camp day reached so far. */
  byDay: DayTotals[];
  /** Scheduled and given for the round day, for the headline adherence figure. */
  scheduledToday: number;
  givenToday: number;
  exceptions: Exception[];
}

export async function fetchDashboard(
  campId: string | null,
  now: Date,
): Promise<Dashboard> {
  const camp = campId ? await get<CampDto>(`/camps/${campId}`) : null;
  if (!camp) {
    return {
      camp: null,
      dayNumber: null,
      totalDays: 0,
      rosterCount: 0,
      assessedCount: 0,
      round: [],
      roundDay: toLocalDay(now),
      isToday: true,
      byDay: [],
      scheduledToday: 0,
      givenToday: 0,
      exceptions: [],
      recentVisits: [],
    };
  }

  const [registrations, campers, arrivalChecks, visits, prescriptions, consents] = await Promise.all([
    get<CampRegistrationDto[]>("/campregistrations", { campId: camp.campId }),
    get<CamperDto[]>("/campers"),
    get<ArrivalCheckDto[]>("/arrivalchecks"),
    get<MedshackVisitDto[]>("/medshackvisits"),
    get<PrescriptionDto[]>("/prescriptions"),
    get<ConsentRecordDto[]>("/consentrecords"),
  ]);

  const camperById = new Map(campers.map((c) => [c.camperId, c]));
  const roster = registrations.filter((r) => camperById.has(r.camperId));
  const rosterRegIds = new Set(roster.map((r) => r.registrationId));
  const regById = new Map(roster.map((r) => [r.registrationId, r]));
  const nameOf = (registrationId: string) => {
    const camper = camperById.get(regById.get(registrationId)?.camperId ?? "");
    return camper ? `${camper.firstName} ${camper.surname}` : "Unknown camper";
  };

  const assessedCount = arrivalChecks.filter(
    (a) => rosterRegIds.has(a.registrationId) && a.status === "signed",
  ).length;

  // Day X of Y, clamped into the camp's date range.
  const today = toLocalDay(now);
  const start = new Date(`${camp.startDate}T00:00:00`);
  const end = new Date(`${camp.endDate}T00:00:00`);
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.round((end.getTime() - start.getTime()) / dayMs) + 1;
  let dayNumber: number | null;
  if (today < camp.startDate) {
    dayNumber = null;
  } else if (today > camp.endDate) {
    dayNumber = totalDays;
  } else {
    const nowDay = new Date(`${today}T00:00:00`);
    dayNumber = Math.round((nowDay.getTime() - start.getTime()) / dayMs) + 1;
  }

  // Today's round, anchored into the camp (the demo camp's dates may be past).
  const roundDay =
    today < camp.startDate ? camp.startDate : today > camp.endDate ? camp.endDate : today;

  const activePrescriptions = prescriptions.filter(
    (p) => rosterRegIds.has(p.registrationId) && isPrescriptionActiveOn(p, roundDay, camp),
  );
  const doseLists = await Promise.all(
    activePrescriptions.map((p) =>
      get<MedicationDoseDto[]>("/medicationdoses", { prescriptionId: p.prescriptionId }),
    ),
  );

  const round: RoundTileEntry[] = [];
  activePrescriptions.forEach((p, i) => {
    const camper = camperById.get(regById.get(p.registrationId)?.camperId ?? "");
    for (const time of parseScheduledTimes(p.scheduledTimes)) {
      round.push({
        slot: resolveSlot(p.prescriptionId, roundDay, time, doseLists[i], now),
        camperName: camper ? `${camper.firstName} ${camper.surname}` : "Unknown camper",
        camperId: camper?.camperId ?? "",
        registrationId: p.registrationId,
        medicationName: p.medicationName ?? "",
      });
    }
  });
  round.sort(
    (a, b) => a.slot.time.localeCompare(b.slot.time) || a.camperName.localeCompare(b.camperName),
  );

  const recentVisits: RecentVisit[] = visits
    .filter((v) => rosterRegIds.has(v.registrationId))
    .sort((a, b) => b.visitAt.localeCompare(a.visitAt))
    .slice(0, 4)
    .map((v) => ({
      visitId: v.visitId,
      camperId: regById.get(v.registrationId)?.camperId ?? null,
      camperName: nameOf(v.registrationId),
      reason: v.reason ?? "Visit",
      visitAt: v.visitAt,
    }));

  // ---- Report figures -------------------------------------------------
  // Doses given and missed for every camp day reached so far, so the chart can
  // show the run of the camp rather than only today. Reuses the dose lists
  // already fetched above, so this costs no extra requests.
  const allDoses = doseLists.flat();
  const daysSoFar = Math.max(0, Math.min(dayNumber ?? 0, totalDays));
  const byDay: DayTotals[] = [];
  for (let i = 0; i < daysSoFar; i++) {
    const iso = toLocalDay(new Date(start.getTime() + i * dayMs));
    let given = 0;
    let missed = 0;
    for (const p of prescriptions) {
      if (!rosterRegIds.has(p.registrationId)) continue;
      if (!isPrescriptionActiveOn(p, iso, camp)) continue;
      for (const time of parseScheduledTimes(p.scheduledTimes)) {
        const slot = resolveSlot(p.prescriptionId, iso, time, allDoses, now);
        if (slot.state === "given") given += 1;
        else if (slot.state === "missed") missed += 1;
      }
    }
    byDay.push({ day: iso, dayNumber: i + 1, given, missed });
  }

  const scheduledToday = round.length;
  const givenToday = round.filter((r) => r.slot.state === "given").length;

  // Exceptions: only what a person has to act on, most serious first.
  const consentRegIds = new Set(consents.map((c) => c.registrationId));
  const checkByReg = new Map(arrivalChecks.map((a) => [a.registrationId, a]));
  const exceptions: Exception[] = [];
  for (const reg of roster) {
    const camper = camperById.get(reg.camperId);
    if (!camper) continue;
    const base = {
      camperName: `${camper.surname}, ${camper.firstName}`,
      camperId: camper.camperId,
      registrationId: reg.registrationId,
    };
    if (!consentRegIds.has(reg.registrationId)) {
      exceptions.push({ ...base, kind: "no consent", detail: "Indemnity not signed, blocks participation" });
    }
    const check = checkByReg.get(reg.registrationId);
    if (!check) {
      exceptions.push({ ...base, kind: "not checked in", detail: "Registered, no arrival check yet" });
    } else if (check.status !== "signed") {
      exceptions.push({ ...base, kind: "draft check", detail: "Arrival check saved as draft, not signed" });
    }
  }
  for (const entry of round) {
    if (entry.slot.state !== "missed") continue;
    exceptions.push({
      kind: "missed",
      camperName: entry.camperName,
      camperId: entry.camperId,
      registrationId: entry.registrationId,
      detail: `${entry.medicationName}, ${entry.slot.time} round`,
    });
  }
  const order: Record<Exception["kind"], number> = {
    "no consent": 0,
    missed: 1,
    "draft check": 2,
    "not checked in": 3,
  };
  exceptions.sort((a, b) => order[a.kind] - order[b.kind]);
  return {
    camp,
    dayNumber,
    totalDays,
    rosterCount: roster.length,
    assessedCount,
    round,
    roundDay,
    isToday: roundDay === today,
    recentVisits,
    byDay,
    scheduledToday,
    givenToday,
    exceptions,
  };
}
