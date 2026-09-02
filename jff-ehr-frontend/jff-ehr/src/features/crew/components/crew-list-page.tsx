import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { Toolbar, DataTable, thClass, tdClass } from "@/components/ui/record-chrome";
import { useMe } from "@/features/auth/use-me";
import { fetchCrewList } from "../api/crew.api";

/**
 * Route "/crew". The crew roster: staff and volunteers, parallel to the camper
 * list but their own world. Each row shows the crew member's medical check-in
 * status for the active camp (checked in with the indemnity signed, checked in
 * but indemnity outstanding, or not yet checked in).
 */
export function CrewListPage() {
  const me = useMe();
  const canMaintain = me.data?.role === "medical" || me.data?.role === "admin";
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["crew-list"],
    queryFn: fetchCrewList,
  });

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading crew…</div>;
  if (isError || !data) {
    return (
      <div className="p-6 text-sm text-danger">Couldn&rsquo;t load the crew. Refresh to try again.</div>
    );
  }

  const needle = search.trim().toLowerCase();
  const visible = data.entries.filter(
    ({ crew }) =>
      !needle ||
      `${crew.name} ${crew.surname}`.toLowerCase().includes(needle) ||
      crew.role.toLowerCase().includes(needle) ||
      crew.idNumber.toLowerCase().includes(needle),
  );

  return (
    <div className="border border-card bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-card bg-page px-4 py-3">
        <h1 className="text-lg font-bold text-primary">Crew</h1>
        <span className="text-sm text-muted">{visible.length} shown</span>
        {canMaintain && (
          <Link to="/crew/new" className="ml-auto">
            <Button variant="primary" className="h-9 px-3">
              <UserPlus size={14} /> New crew member
            </Button>
          </Link>
        )}
      </div>

      <Toolbar>
        <div className="relative w-full max-w-[280px]">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            className="h-9 pl-8"
            placeholder="Search name, role, ID number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="ml-auto text-sm text-muted">
          {data.activeCamp
            ? `Check-in status is for camp ${data.activeCamp.campNumber}, ${data.activeCamp.venue}.`
            : "No camp is currently active, so there is no check-in status to show."}
        </span>
      </Toolbar>

      {visible.length === 0 ? (
        <div className="px-4 py-8 text-center text-base text-muted">
          No crew match &ldquo;{search}&rdquo;.
        </div>
      ) : (
        <DataTable
          head={
            <>
              <th className={thClass}>Crew member</th>
              <th className={thClass}>Role</th>
              <th className={thClass}>ID number</th>
              {data.activeCamp && <th className={thClass}>Check-in</th>}
            </>
          }
        >
          {visible.map(({ crew, checkin }) => {
            const pill = !checkin
              ? { tone: "warning" as const, label: "not checked in" }
              : checkin.medicalReleaseSigned
                ? { tone: "success" as const, label: "checked in" }
                : { tone: "danger" as const, label: "indemnity outstanding" };
            return (
              <tr key={crew.crewId} className="even:bg-page/60">
                <td className={tdClass}>
                  <Link
                    to={`/crew/${crew.crewId}`}
                    className="font-semibold text-accent-strong underline"
                  >
                    {crew.surname}, {crew.name}
                  </Link>
                </td>
                <td className={`${tdClass} text-secondary`}>{crew.role}</td>
                <td className={`${tdClass} mono`}>{crew.idNumber}</td>
                {data.activeCamp && (
                  <td className={tdClass}>
                    <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                  </td>
                )}
              </tr>
            );
          })}
        </DataTable>
      )}
    </div>
  );
}
