import { apiClient } from "@/api/client";
import type {
  CampDto,
  CrewMedicalCheckinDto,
  CrewMemberDto,
} from "@/api/types";

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
  const activeCamp = camps.find((c) => c.status.toLowerCase() === "active") ?? null;

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

export interface CrewDetailContext {
  crew: CrewMemberDto;
  activeCamp: CampDto | null;
  checkin: CrewMedicalCheckinDto | null;
}

export async function fetchCrewDetail(crewId: string): Promise<CrewDetailContext> {
  const [crew, camps] = await Promise.all([
    fetchCrewMember(crewId),
    get<CampDto[]>("/camps"),
  ]);
  const activeCamp = camps.find((c) => c.status.toLowerCase() === "active") ?? null;
  const checkins = activeCamp
    ? await get<CrewMedicalCheckinDto[]>("/crewmedicalcheckins", {
        campId: activeCamp.campId,
        crewId,
      })
    : [];
  return { crew, activeCamp, checkin: checkins[0] ?? null };
}

export interface CheckinPayload {
  allergies: string | null;
  hasBroviacPort: boolean;
  hasBloodCount: boolean;
  eyesight: string | null;
  hearing: string | null;
  mobilityAids: string | null;
  currentMedications: string | null;
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
