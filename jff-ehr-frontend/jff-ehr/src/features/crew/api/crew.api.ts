import { apiClient } from "@/api/client";
import type {
  CampDto,
  CrewCampRegistrationDto,
  CrewMedicalCheckinDto,
  CrewMemberDto,
} from "@/api/types";
import { isCampActive } from "@/lib/camp-state";

/**
 * The crew world: parallel to campers, not a reskin. Crew are staff and
 * volunteers with their own medical check-in (broviac/port and blood count,
 * which campers lack) and their own indemnity gate (form 06 + form 07).
 *
 * Crew members are Tier 1 (full CRUD, medical or admin). Crew medical
 * check-ins are operational and editable.
 */

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  return (await apiClient.get<T>(url, { params })).data;
}

export interface CrewPayload {
  name: string;
  surname: string;
  idNumber: string;
  dob: string | null;
  role: string;
  photoUrl: string | null;
}

export async function fetchCrew(): Promise<CrewMemberDto[]> {
  return get<CrewMemberDto[]>("/crewmembers");
}

export async function fetchCrewMember(crewId: string): Promise<CrewMemberDto> {
  return get<CrewMemberDto>(`/crewmembers/${crewId}`);
}

export async function createCrew(payload: CrewPayload): Promise<CrewMemberDto> {
  return (await apiClient.post<CrewMemberDto>("/crewmembers", payload)).data;
}

export async function updateCrew(crewId: string, payload: CrewPayload): Promise<void> {
  await apiClient.put(`/crewmembers/${crewId}`, payload);
}

// ---------------------------------------------------------------------------
// Crew list with their active-camp check-in status
// ---------------------------------------------------------------------------

export interface CrewListEntry {
  crew: CrewMemberDto;
  checkin: CrewMedicalCheckinDto | null;
}

export interface CrewListContext {
  activeCamp: CampDto | null;
  entries: CrewListEntry[];
}

export async function fetchCrewList(): Promise<CrewListContext> {
  const [crew, camps] = await Promise.all([
    get<CrewMemberDto[]>("/crewmembers"),
    get<CampDto[]>("/camps"),
  ]);
  const now = new Date();
  const activeCamp = camps.find((c) => isCampActive(c, now)) ?? null;

  const checkins = activeCamp
    ? await get<CrewMedicalCheckinDto[]>("/crewmedicalcheckins", { campId: activeCamp.campId })
    : [];
  const byCrew = new Map(checkins.map((c) => [c.crewId, c]));

  const entries = crew
    .map((member) => ({ crew: member, checkin: byCrew.get(member.crewId) ?? null }))
    .sort((a, b) =>
      `${a.crew.surname} ${a.crew.name}`.localeCompare(`${b.crew.surname} ${b.crew.name}`),
    );

  return { activeCamp, entries };
}

// ---------------------------------------------------------------------------
// Crew detail and check-in
// ---------------------------------------------------------------------------

/** One camp this crew member is registered to, with the camp joined in. */
export interface CrewCampEntry {
  registration: CrewCampRegistrationDto;
  camp: CampDto | null;
}

export interface CrewDetailContext {
  crew: CrewMemberDto;
  activeCamp: CampDto | null;
  checkin: CrewMedicalCheckinDto | null;
  /** Every camp this crew member is registered to (B3), most recent first. */
  camps: CrewCampEntry[];
}

export async function fetchCrewDetail(crewId: string): Promise<CrewDetailContext> {
  const [crew, camps, registrations] = await Promise.all([
    fetchCrewMember(crewId),
    get<CampDto[]>("/camps"),
    get<CrewCampRegistrationDto[]>("/crewcampregistrations", { crewId }),
  ]);
  const now = new Date();
  const activeCamp = camps.find((c) => isCampActive(c, now)) ?? null;
  const checkins = activeCamp
    ? await get<CrewMedicalCheckinDto[]>("/crewmedicalcheckins", {
        campId: activeCamp.campId,
        crewId,
      })
    : [];

  const campById = new Map(camps.map((c) => [c.campId, c]));
  const campEntries = registrations
    .map((r) => ({ registration: r, camp: campById.get(r.campId) ?? null }))
    .sort((a, b) => (b.camp?.startDate ?? "").localeCompare(a.camp?.startDate ?? ""));

  return { crew, activeCamp, checkin: checkins[0] ?? null, camps: campEntries };
}

export interface CheckinPayload {
  allergies: string | null;
  eyesight: string | null;
  hearing: string | null;
  currentMedications: string | null;
  comments: string | null;
  medicalReleaseSigned: boolean;
}

export async function createCrewCheckin(
  crewId: string,
  campId: string,
  payload: CheckinPayload,
): Promise<CrewMedicalCheckinDto> {
  return (
    await apiClient.post<CrewMedicalCheckinDto>("/crewmedicalcheckins", {
      crewId,
      campId,
      ...payload,
    })
  ).data;
}

export async function updateCrewCheckin(
  checkinId: string,
  payload: CheckinPayload,
): Promise<void> {
  await apiClient.put(`/crewmedicalcheckins/${checkinId}`, payload);
}

// ---------------------------------------------------------------------------
// Crew-to-camp attendance (B3). A crew member is registered per camp, mirroring
// how a camper registers; attendance is a distinct fact from the medical
// check-in, so a person can be attending a camp yet "not checked in".
// ---------------------------------------------------------------------------

export interface CampCrewEntry {
  registration: CrewCampRegistrationDto;
  crew: CrewMemberDto | null;
  checkin: CrewMedicalCheckinDto | null;
}

/** Crew registered to one camp, joined with each member and their check-in. */
export async function fetchCampCrew(campId: string): Promise<CampCrewEntry[]> {
  const [registrations, crew, checkins] = await Promise.all([
    get<CrewCampRegistrationDto[]>("/crewcampregistrations", { campId }),
    get<CrewMemberDto[]>("/crewmembers"),
    get<CrewMedicalCheckinDto[]>("/crewmedicalcheckins", { campId }),
  ]);
  const crewById = new Map(crew.map((c) => [c.crewId, c]));
  const checkinByCrew = new Map(checkins.map((c) => [c.crewId, c]));
  return registrations
    .map((r) => ({
      registration: r,
      crew: crewById.get(r.crewId) ?? null,
      checkin: checkinByCrew.get(r.crewId) ?? null,
    }))
    .sort((a, b) =>
      `${a.crew?.surname ?? ""} ${a.crew?.name ?? ""}`.localeCompare(
        `${b.crew?.surname ?? ""} ${b.crew?.name ?? ""}`,
      ),
    );
}

/** Crew members not yet registered to the given camp (for the add picker). */
export async function fetchCrewNotInCamp(campId: string): Promise<CrewMemberDto[]> {
  const [registrations, crew] = await Promise.all([
    get<CrewCampRegistrationDto[]>("/crewcampregistrations", { campId }),
    get<CrewMemberDto[]>("/crewmembers"),
  ]);
  const taken = new Set(registrations.map((r) => r.crewId));
  return crew
    .filter((c) => !taken.has(c.crewId))
    .sort((a, b) => `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`));
}

export async function addCrewToCamp(
  crewId: string,
  campId: string,
  role: string | null,
): Promise<CrewCampRegistrationDto> {
  return (
    await apiClient.post<CrewCampRegistrationDto>("/crewcampregistrations", {
      crewId,
      campId,
      role,
      status: "registered",
    })
  ).data;
}

export async function updateCrewRegistration(
  crewRegistrationId: string,
  status: string,
  role: string | null,
): Promise<void> {
  await apiClient.put(`/crewcampregistrations/${crewRegistrationId}`, { status, role });
}

export async function removeCrewFromCamp(crewRegistrationId: string): Promise<void> {
  await apiClient.delete(`/crewcampregistrations/${crewRegistrationId}`);
}
