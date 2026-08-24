import { useState } from "react";
import { ChevronRight, Search, UserRoundPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { CampRegistrationDto } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { SortControl, type SortDirection } from "@/components/ui/sort-control";
import { initialsOf, statusLabel, statusTone } from "@/lib/display";
import { campFilterLabel } from "@/lib/camp-state";
import { useCampers, useCamps } from "@/features/camps/hooks/use-camps";

function useAllRegistrations() {
  return useQuery({
    queryKey: ["camp-registrations", "all"],
    queryFn: async () =>
      (await apiClient.get<CampRegistrationDto[]>("/campregistrations")).data,
  });
}

type SortKey = "name" | "recent" | "status";

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "recent", label: "Recently registered" },
  { value: "status", label: "Status" },
];

/** Route "/campers". Searchable all-campers list, rows open the camper detail. */
export function CampersListPage() {
  const campers = useCampers();
  const camps = useCamps();
  const registrations = useAllRegistrations();
  const [search, setSearch] = useState("");
  const [campFilter, setCampFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  if (campers.isLoading || registrations.isLoading) {
    return <div className="p-6 text-sm text-muted">Loading campers…</div>;
  }
  if (campers.isError || !campers.data || !registrations.data) {
    return (
      <div className="p-6 text-sm text-danger">
        Couldn&rsquo;t load campers. Refresh to try again.
      </div>
    );
  }

  const now = new Date();
  const sortedRegs = [...registrations.data].sort((a, b) =>
    a.registeredAt.localeCompare(b.registeredAt),
  );

  // Per-camper rollups from their registrations: headline status, most recent
  // registration date, and every camp they belong to (for the camp filter).
  const latestRegStatus = new Map<string, string>();
  const latestRegAt = new Map<string, string>();
  const campsByCamper = new Map<string, Set<string>>();
  for (const reg of sortedRegs) {
    latestRegStatus.set(reg.camperId, reg.status);
    latestRegAt.set(reg.camperId, reg.registeredAt);
    if (!campsByCamper.has(reg.camperId)) campsByCamper.set(reg.camperId, new Set());
    campsByCamper.get(reg.camperId)!.add(reg.campId);
  }

  const needle = search.trim().toLowerCase();
  const dir = sortDir === "asc" ? 1 : -1;
  const visible = campers.data
    .filter(
      (c) =>
        !needle ||
        `${c.firstName} ${c.surname}`.toLowerCase().includes(needle) ||
        c.fileNumber.toLowerCase().includes(needle) ||
        (c.diagnosis ?? "").toLowerCase().includes(needle),
    )
    .filter((c) => !campFilter || campsByCamper.get(c.camperId)?.has(campFilter))
    .sort((a, b) => {
      if (sortKey === "recent") {
        return dir * (latestRegAt.get(a.camperId) ?? "").localeCompare(latestRegAt.get(b.camperId) ?? "");
      }
      if (sortKey === "status") {
        return (
          dir *
          ((latestRegStatus.get(a.camperId) ?? "").localeCompare(latestRegStatus.get(b.camperId) ?? "") ||
            `${a.surname} ${a.firstName}`.localeCompare(`${b.surname} ${b.firstName}`))
        );
      }
      return dir * `${a.surname} ${a.firstName}`.localeCompare(`${b.surname} ${b.firstName}`);
    });

  const campOptions = [...(camps.data ?? [])].sort((a, b) => b.campNumber - a.campNumber);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="text-[17px] font-semibold text-primary">Campers</h1>
        <StatusPill tone="neutral">{visible.length}</StatusPill>
        <Link to="/campers/new" className="ml-auto">
          <Button variant="primary" className="h-9 px-3">
            <UserRoundPlus size={14} /> New camper
          </Button>
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-[280px]">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            className="h-9 pl-8"
            placeholder="Search name, file number, diagnosis…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          aria-label="Filter by camp"
          className="h-9 w-auto text-[12.5px]"
          value={campFilter}
          onChange={(e) => setCampFilter(e.target.value)}
        >
          <option value="">All camps</option>
          {campOptions.map((c) => (
            <option key={c.campId} value={c.campId}>
              {campFilterLabel(c, now)}
            </option>
          ))}
        </Select>
        <SortControl
          className="ml-auto"
          options={SORT_OPTIONS}
          value={sortKey}
          direction={sortDir}
          onChange={(v) => setSortKey(v as SortKey)}
          onToggleDirection={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        />
      </div>

      <div className="overflow-hidden rounded-card border border-card bg-surface">
        {visible.map((camper) => {
          const status = latestRegStatus.get(camper.camperId);
          return (
            <Link
              key={camper.camperId}
              to={`/campers/${camper.camperId}`}
              className="flex items-center gap-3 border-b border-divider px-4 py-3 transition last:border-b-0 hover:bg-field"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-accent-tint text-[12px] font-medium text-accent">
                {initialsOf(camper.firstName, camper.surname)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-primary">
                  {camper.firstName} {camper.surname}
                  <ChevronRight size={14} className="shrink-0 text-muted" />
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-muted">
                  {camper.fileNumber}
                  {camper.diagnosis ? ` · ${camper.diagnosis}` : " · No diagnosis on file"}
                </span>
              </span>
              {status ? (
                <StatusPill tone={statusTone(status)}>{statusLabel(status)}</StatusPill>
              ) : (
                <StatusPill tone="neutral">no registration</StatusPill>
              )}
            </Link>
          );
        })}
        {visible.length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] text-muted">
            No campers match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
