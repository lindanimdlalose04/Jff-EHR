import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { initialsOf } from "@/lib/display";
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
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h1 className="text-[17px] font-semibold text-primary">Crew</h1>
        <StatusPill tone="neutral">{visible.length}</StatusPill>
        <div className="relative ml-auto w-full max-w-[260px]">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            className="pl-8"
            placeholder="Search name, role, ID number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {canMaintain && (
          <Link to="/crew/new">
            <Button variant="primary" className="h-9 px-3">
              <UserPlus size={14} /> New crew member
            </Button>
          </Link>
        )}
      </div>
      <p className="mb-4 text-[12.5px] text-muted">
        {data.activeCamp
          ? `Check-in status is for Camp ${data.activeCamp.campNumber}, ${data.activeCamp.venue}.`
          : "No camp is currently active, so there is no check-in status to show."}
      </p>

      <div className="overflow-hidden rounded-card border border-card bg-surface">
        {visible.map(({ crew, checkin }) => {
          const pill = !checkin
            ? { tone: "warning" as const, label: "not checked in" }
            : checkin.medicalReleaseSigned
              ? { tone: "success" as const, label: "checked in" }
              : { tone: "danger" as const, label: "indemnity outstanding" };
          return (
            <Link
              key={crew.crewId}
              to={`/crew/${crew.crewId}`}
              className="flex items-center gap-3 border-b border-divider px-4 py-3 transition last:border-b-0 hover:bg-field"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-accent-tint text-[12px] font-medium text-accent">
                {initialsOf(crew.name, crew.surname)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-primary">
                  {crew.name} {crew.surname}
                  <ChevronRight size={14} className="shrink-0 text-muted" />
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-muted">
                  {crew.role} · ID {crew.idNumber}
                </span>
              </span>
              {data.activeCamp && <StatusPill tone={pill.tone}>{pill.label}</StatusPill>}
            </Link>
          );
        })}
        {visible.length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] text-muted">
            No crew match &ldquo;{search}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
