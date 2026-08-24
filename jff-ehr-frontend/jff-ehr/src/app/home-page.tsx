import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ArrowRight, Check, CircleDashed, Stethoscope, TriangleAlert } from "lucide-react";
import { formatDate } from "@/lib/display";
import { useMe } from "@/features/auth/use-me";
import { useActiveCamp } from "@/app/active-camp-context";
import { CampScopePicker } from "@/components/layout/camp-scope-picker";
import { fetchDashboard, type Dashboard, type RoundTileEntry } from "./dashboard.api";

/**
 * Route "/". The home dashboard (spec/wireframes/04). Four tiles, each tracing
 * to a stated client pain point: today's round with the one confirmed
 * auto-flag (missed dose), assessment progress against the six-hour day-one
 * bottleneck, recent MedShack activity, and the active camp anchor. No
 * hospital widgets: this stays a camp health record.
 */
export function HomePage() {
  const me = useMe();
  const { selectedCampId } = useActiveCamp();
  const [now] = useState(() => new Date());
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", selectedCampId],
    queryFn: () => fetchDashboard(selectedCampId, now),
  });

  const firstName = me.data?.name ?? "";

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading your day…</div>;
  if (isError || !data) {
    return (
      <div className="p-6 text-sm text-danger">
        Couldn&rsquo;t load the dashboard. Refresh to try again.
      </div>
    );
  }

  const { camp } = data;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-[18px] font-semibold text-primary">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {camp
              ? `Camp ${camp.campNumber}, ${camp.venue}` +
                (data.dayNumber
                  ? ` · day ${data.dayNumber} of ${data.totalDays}`
                  : " · starts soon")
              : "No camp is currently active."}
          </p>
        </div>
        <CampScopePicker className="mt-0.5" />
      </div>

      {!camp ? (
        <div className="mt-5 rounded-card border border-card bg-surface px-4 py-10 text-center text-[13px] text-muted">
          There is no active camp right now. Open Camps to plan or activate one.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <RoundsTile data={data} />
            <CheckedInTile data={data} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <RecentMedShackTile data={data} />
            <ActiveCampTile data={data} />
          </div>
        </>
      )}
    </div>
  );
}

function TileShell({
  title,
  aside,
  children,
  className = "",
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-card border border-card bg-surface p-4 ${className}`}>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-primary">{title}</h2>
        {aside}
      </div>
      {children}
    </div>
  );
}

function RoundStateBadge({ slot }: { slot: RoundTileEntry["slot"] }) {
  if (slot.state === "given") {
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-accent">
        <Check size={13} />
        given{" "}
        {slot.givenDose?.administeredAt
          ? format(parseISO(slot.givenDose.administeredAt), "HH:mm")
          : ""}
      </span>
    );
  }
  if (slot.state === "missed") {
    return (
      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-warning">
        <TriangleAlert size={13} />
        missed, overdue
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-muted">
      <CircleDashed size={13} />
      pending
    </span>
  );
}

function RoundsTile({ data }: { data: Dashboard }) {
  const nextTime = data.round.find((e) => e.slot.state !== "given")?.slot.time;
  return (
    <TileShell
      title="Today's rounds"
      aside={
        <Link to="/medications" className="text-[12px] font-medium text-accent hover:underline">
          Open rounds
        </Link>
      }
      className="lg:col-span-2"
    >
      {data.round.length === 0 ? (
        <p className="py-4 text-center text-[12.5px] text-muted">
          No doses scheduled {data.isToday ? "today" : "that day"}.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-divider">
            {data.round.slice(0, 6).map((entry) => (
              <li
                key={`${entry.registrationId}-${entry.slot.time}-${entry.medicationName}`}
                className="flex items-center gap-3 py-2"
              >
                <span className="w-11 shrink-0 text-[11.5px] font-medium text-secondary">
                  {entry.slot.time}
                </span>
                <span className="min-w-0 flex-1">
                  <Link
                    to={`/campers/${entry.camperId}`}
                    className="text-[12.5px] font-medium text-primary hover:underline"
                  >
                    {entry.camperName}
                  </Link>
                  <span className="block truncate text-[11.5px] text-muted">
                    {entry.medicationName}
                  </span>
                </span>
                <RoundStateBadge slot={entry.slot} />
              </li>
            ))}
          </ul>
          {data.round.length > 6 && (
            <p className="mt-1 text-[11.5px] text-muted">
              and {data.round.length - 6} more{nextTime ? "" : ""}
            </p>
          )}
        </>
      )}
      <p className="mt-2.5 border-t border-divider pt-2 text-[11px] text-muted">
        Missed-dose flag = the one auto-alert Gail confirmed.
      </p>
    </TileShell>
  );
}

function CheckedInTile({ data }: { data: Dashboard }) {
  const pct = data.rosterCount ? Math.round((data.assessedCount / data.rosterCount) * 100) : 0;
  return (
    <TileShell title="Checked in">
      <div className="text-[30px] font-semibold leading-none text-primary">
        {data.assessedCount}{" "}
        <span className="text-[18px] font-medium text-muted">/ {data.rosterCount}</span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-field">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2.5 text-[11.5px] text-muted">
        Fixes the six-hour day-one bottleneck, shows what is pre-loaded.
      </p>
    </TileShell>
  );
}

function RecentMedShackTile({ data }: { data: Dashboard }) {
  return (
    <TileShell
      title="Recent MedShack"
      aside={
        <Link to="/medshack" className="text-[12px] font-medium text-accent hover:underline">
          Open MedShack
        </Link>
      }
    >
      {data.recentVisits.length === 0 ? (
        <p className="py-4 text-center text-[12.5px] text-muted">No visits yet.</p>
      ) : (
        <ul className="divide-y divide-divider">
          {data.recentVisits.map((visit) => (
            <li key={visit.visitId} className="flex items-center gap-2.5 py-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-none bg-danger-tint text-danger">
                <Stethoscope size={13} />
              </span>
              <span className="min-w-0 flex-1">
                {visit.camperId ? (
                  <Link
                    to={`/campers/${visit.camperId}`}
                    className="text-[12.5px] font-medium text-primary hover:underline"
                  >
                    {visit.camperName}
                  </Link>
                ) : (
                  <span className="text-[12.5px] font-medium text-primary">{visit.camperName}</span>
                )}
                <span className="block truncate text-[11.5px] text-muted">{visit.reason}</span>
              </span>
              <span className="shrink-0 text-[11px] text-muted">
                {formatDate(visit.visitAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2.5 border-t border-divider pt-2 text-[11px] text-muted">
        &ldquo;Open their profile and see what is happening&rdquo; (Gail).
      </p>
    </TileShell>
  );
}

function ActiveCampTile({ data }: { data: Dashboard }) {
  const camp = data.camp!;
  return (
    <TileShell title="Active camp">
      <div className="text-[14px] font-medium text-primary">
        Camp {camp.campNumber}: {camp.venue}
      </div>
      <dl className="mt-2 space-y-1 text-[12.5px]">
        <Row label="Province" value={camp.province} />
        <Row label="Dates" value={`${formatDate(camp.startDate)} to ${formatDate(camp.endDate)}`} />
        <Row label="Campers" value={String(data.rosterCount)} />
        <Row label="Type" value={camp.campType} capitalize />
      </dl>
      <Link
        to={`/camps/${camp.campId}`}
        className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent hover:underline"
      >
        Open camp roster <ArrowRight size={14} />
      </Link>
    </TileShell>
  );
}

function Row({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-right text-primary${capitalize ? " capitalize" : ""}`}>{value}</dd>
    </div>
  );
}
