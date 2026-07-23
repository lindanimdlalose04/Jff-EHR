import { useQuery } from "@tanstack/react-query";
import { fetchCamperDetail } from "../api/camper-detail.api";

export function useCamperDetail(camperId: string) {
  return useQuery({
    queryKey: ["camper-detail", camperId],
    queryFn: () => fetchCamperDetail(camperId),
  });
}
