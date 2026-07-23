import { useQuery } from "@tanstack/react-query";
import {
  fetchCamp,
  fetchCampers,
  fetchCampRegistrations,
  fetchCamps,
} from "../api/camps.api";

export function useCamps() {
  return useQuery({ queryKey: ["camps"], queryFn: fetchCamps });
}

export function useCamp(campId: string) {
  return useQuery({ queryKey: ["camps", campId], queryFn: () => fetchCamp(campId) });
}

export function useCampRegistrations(campId: string) {
  return useQuery({
    queryKey: ["camp-registrations", campId],
    queryFn: () => fetchCampRegistrations(campId),
  });
}

export function useCampers() {
  return useQuery({ queryKey: ["campers"], queryFn: fetchCampers });
}
