import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";

/** GET /api/auth/me — the caller's app identity (role, crew link, name). */
export interface MeDto {
  userId: string;
  crewId: string;
  role: string | null;
  name: string | null;
  surname: string | null;
  email: string | null;
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await apiClient.get<MeDto>("/auth/me")).data,
    staleTime: 5 * 60_000,
  });
}
