import { apiClient } from "@/api/client";
import type {
  ArrivalCheckDto,
  CamperDto,
  CampDto,
  CampRegistrationDto,
  MedicationDoseDto,
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
import { isCampActive } from "@/lib/camp-state";

/**
 * The home dashboard's data, composed in one call. Every field backs a tile
 * that traces to a stated client pain point (spec/wireframes/04): today's
 * round with the missed-dose flag, assessment progress against the six-hour
 * day-one bottleneck, recent MedShack activity, and the active camp anchor.
 *
 * Arrival checks and visits are fetched once (unfiltered) and narrowed to the
 * active camp client-side, rather than once per registration, to keep the
 * landing screen quick.
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
}

export async function fetchDashboard(now: Date): Promise<Dashboard> {
  const camps = await get<CampDto[]>("/camps");
  const camp = camps.find((c) => isCampActive(c, now)) ?? null;
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
      recentVisits: [],
    };
  }

  const [registrations, campers, arrivalChecks, visits, prescriptions] = await Promise.all([
    get<CampRegistrationDto[]>("/campregistrations", { campId: camp.campId }),
    get<CamperDto[]>("/campers"),
    get<ArrivalCheckDto[]>("/arrivalchecks"),
    get<MedshackVisitDto[]>("/medshackvisits"),
    get<PrescriptionDto[]>("/prescriptions"),
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
  };
}
