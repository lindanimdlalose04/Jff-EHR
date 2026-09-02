import { useState, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { Toolbar, DataTable, thClass, tdClass, Pagination } from "@/components/ui/record-chrome";
import { SortControl, type SortDirection } from "@/components/ui/sort-control";
import { formatDate, statusLabel, statusTone } from "@/lib/display";
import { deriveCampState } from "@/lib/camp-state";
import { useCamps } from "../hooks/use-camps";

type SortKey = "number" | "start" | "status" | "venue";

const SORT_OPTIONS = [
  { value: "number", label: "Camp number" },
  { value: "start", label: "Start date" },
  { value: "status", label: "Status" },
  { value: "venue", label: "Venue" },
];

const STATE_FILTERS = ["planned", "active", "completed", "cancelled"];

/** Route "/camps". Camps list with search; camps are Tier 1, fully maintainable. */
export function CampsListPage() {
  const { data: camps, isLoading, isError } = useCamps();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [stateFilter, setStateFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("number");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading camps…</div>;
  if (isError || !camps) {
  
  // A filter change can leave you on a page that no longer exists.
  useEffect(() => { setPage(0); }, [search, stateFilter, sortKey, sortDir]);

  return (
      <div className="p-6 text-sm text-danger">
        Couldn&rsquo;t load camps. Check that the API is running, then refresh.
      </div>
    );
  }

  const now = new Date();
  const needle = search.trim().toLowerCase();
  const dir = sortDir === "asc" ? 1 : -1;
  const visible = camps
    .filter(
      (c) =>
        !needle ||
        `camp ${c.campNumber}`.includes(needle) ||
        c.venue.toLowerCase().includes(needle) ||
        c.province.toLowerCase().includes(needle),
    )
    .filter((c) => !stateFilter || deriveCampState(c, now) === stateFilter)
    .sort((a, b) => {
      if (sortKey === "start") return dir * a.startDate.localeCompare(b.startDate);
      if (sortKey === "venue") return dir * a.venue.localeCompare(b.venue);
      if (sortKey === "status") {
        return dir * deriveCampState(a, now).localeCompare(deriveCampState(b, now));
      }
      return dir * (a.campNumber - b.campNumber);
    });

  const PAGE_SIZE = 30;
  const pageRows = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="border border-card bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-card bg-page px-4 py-3">
        <h1 className="text-lg font-bold text-primary">Camps</h1>
        <span className="text-sm text-muted">{visible.length} camps</span>
        <Link to="/camps/new" className="ml-auto">
          <Button variant="primary" className="h-9 px-3">
            <Plus size={14} /> New camp
          </Button>
        </Link>
      </div>

      <Toolbar>
        <div className="relative w-full max-w-[260px]">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            className="h-9 pl-8"
            placeholder="Search venue, number, province…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          aria-label="Filter by status"
          className="h-9 w-auto text-sm capitalize"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATE_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s}
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
          No camps match the current filters.
        </div>
      ) : (
        <DataTable
          head={
            <>
              <th className={thClass}>Camp</th>
              <th className={thClass}>Dates</th>
              <th className={thClass}>Province</th>
              <th className={thClass}>Type</th>
              <th className={thClass}>Status</th>
            </>
          }
        >
          {pageRows.map((camp) => {
            const state = deriveCampState(camp, now);
            return (
              <tr key={camp.campId} className="even:bg-page/60">
                <td className={tdClass}>
                  <Link
                    to={`/camps/${camp.campId}`}
                    className="font-semibold text-accent-strong underline"
                  >
                    Camp {camp.campNumber}, {camp.venue}
                  </Link>
                </td>
                <td className={`${tdClass} mono whitespace-nowrap text-secondary`}>
                  {formatDate(camp.startDate)} to {formatDate(camp.endDate)}
                </td>
                <td className={`${tdClass} text-secondary`}>{camp.province}</td>
                <td className={`${tdClass} capitalize text-secondary`}>{camp.campType}</td>
                <td className={tdClass}>
                  <StatusPill tone={statusTone(state)}>{statusLabel(state)}</StatusPill>
                </td>
              </tr>
            );
          })}
        </DataTable>
      )}
      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={visible.length}
        onPage={setPage}
        noun="camps"
      />
    </div>
  );
}
