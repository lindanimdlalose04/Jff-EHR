import { apiClient } from "@/api/client";
import type { CampDto, CamperDto, CampRegistrationDto } from "@/api/types";

export async function fetchCamps(): Promise<CampDto[]> {
  const { data } = await apiClient.get<CampDto[]>("/camps");
  return data;
}

export async function fetchCamp(campId: string): Promise<CampDto> {
  const { data } = await apiClient.get<CampDto>(`/camps/${campId}`);
  return data;
}

export async function fetchCampRegistrations(campId: string): Promise<CampRegistrationDto[]> {
  const { data } = await apiClient.get<CampRegistrationDto[]>("/campregistrations", {
    params: { campId },
  });
  return data;
}

export async function fetchCampers(): Promise<CamperDto[]> {
  const { data } = await apiClient.get<CamperDto[]>("/campers");
  return data;
}
