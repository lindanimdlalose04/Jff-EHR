import { useState } from "react";
import { Search, UserRoundPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { CampRegistrationDto } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { SortControl, type SortDirection } from "@/components/ui/sort-control";
import { statusLabel, statusTone, formatSex, ageYears } from "@/lib/display";
import { Toolbar, DataTable, thClass, tdClass } from "@/components/ui/record-chrome";
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
    <div className="border border-card bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-card bg-page px-4 py-3">
        <h1 className="text-lg font-bold text-primary">Campers</h1>
        <span className="text-sm text-muted">
          {visible.length} of {campers.data.length} shown
        </span>
        <Link to="/campers/new" className="ml-auto">
          <Button variant="primary" className="h-9 px-3">
            <UserRoundPlus size={14} /> New camper
          </Button>
        </Link>
      </div>

      <Toolbar>
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
          className="h-9 w-auto text-sm"
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
      </Toolbar>

      {visible.length === 0 ? (
        <div className="px-4 py-8 text-center text-base text-muted">
          No campers match the current filters.
        </div>
      ) : (
        <DataTable
          head={
            <>
              <th className={thClass}>Camper</th>
              <th className={thClass}>File</th>
              <th className={thClass}>Age / sex</th>
              <th className={thClass}>Diagnosis</th>
              <th className={thClass}>Latest registration</th>
            </>
          }
        >
          {visible.map((camper) => {
            const status = latestRegStatus.get(camper.camperId);
            return (
              <tr key={camper.camperId} className="even:bg-page/60">
                <td className={tdClass}>
                  <Link
                    to={`/campers/${camper.camperId}`}
                    className="font-semibold text-accent-strong underline"
                  >
                    {camper.surname}, {camper.firstName}
                  </Link>
                </td>
                <td className={`${tdClass} mono`}>{camper.fileNumber}</td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  <span className="mono">{ageYears(camper.dob)}y</span> · {formatSex(camper.sex)}
                </td>
                <td className={`${tdClass} text-secondary`}>
                  {camper.diagnosis || <span className="text-muted">No diagnosis on file</span>}
                </td>
                <td className={tdClass}>
                  {status ? (
                    <StatusPill tone={statusTone(status)}>{statusLabel(status)}</StatusPill>
                  ) : (
                    <StatusPill tone="neutral">no registration</StatusPill>
                  )}
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
