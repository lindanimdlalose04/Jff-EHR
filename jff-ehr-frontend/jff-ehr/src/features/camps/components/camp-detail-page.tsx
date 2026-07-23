import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Pill,
  Stethoscope,
  TriangleAlert,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  formatDate,
  formatDateTime,
  initialsOf,
  statusLabel,
  statusTone,
} from "@/lib/display";
import { fetchCampHub, pillTone, type CampHub } from "../api/camp-hub.api";

/**
 * Route "/camps/:campId". The camp hub (spec/wireframes/05): the operational
 * half of the architecture, everything clinical for THIS camp episode in one
 * place. The camper profile is the persistent half.
 *
 * Status pills reuse the shared vocabulary. Consent is the acceptance gate, so
 * a missing consent record shows red ahead of any assessment state.
 */

const TABS = ["Roster", "Medication grid", "MedShack", "Incidents"] as const;
type Tab = (typeof TABS)[number];

export function CampDetailPage() {
  const { campId = "" } = useParams();
  const [tab, setTab] = useState<Tab>("Roster");
  const [dayOffset, setDayOffset] = useState(0);
  const [now] = useState(() => new Date());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["camp-hub", campId, dayOffset],
    queryFn: () => fetchCampHub(campId, dayOffset, now),
    enabled: Boolean(campId),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading camp…</div>;
  if (isError || !data) {
    return (
      <div className="p-6 text-sm text-danger">
        Couldn&rsquo;t load this camp. Refresh to try again.
      </div>
    );
  }

  const { camp, roster, doses, visits } = data;
  const assessed = roster.filter((r) => r.pill === "assessed").length;
  const dosesGiven = doses.filter((d) => d.slot.state === "given").length;

  return (
    <div>
      <Link
        to="/camps"
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-secondary hover:text-primary"
      >
        <ArrowLeft size={14} /> Camps
      </Link>

      <div className="rounded-card border border-card bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[17px] font-semibold text-primary">
                Camp {camp.campNumber}: {camp.venue}
              </h1>
              <StatusPill tone={statusTone(camp.status)}>{statusLabel(camp.status)}</StatusPill>
            </div>
            <p className="mt-1 text-[12.5px] text-secondary">
              {camp.province} · {formatDate(camp.startDate)} to {formatDate(camp.endDate)} ·{" "}
              <span className="capitalize">{camp.campType}</span> · {roster.length} campers
            </p>
          </div>
          <Link to={`/camps/${camp.campId}/edit`}>
            <Button variant="secondary" className="h-8 px-3">
              <Pencil size={13} /> Edit camp
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={<Users size={14} />} label="Roster" value={roster.length} />
        <StatTile
          icon={<Check size={14} />}
          label="Assessed"
          value={`${assessed} of ${roster.length}`}
        />
        <StatTile
          icon={<Pill size={14} />}
          label={data.isToday ? "Doses today" : "Doses that day"}
          value={`${dosesGiven} of ${doses.length}`}
        />
        <StatTile icon={<Stethoscope size={14} />} label="Visits" value={visits.length} />
      </div>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-card">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "shrink-0 border-b-2 border-accent px-3 py-2 text-[13px] font-medium text-accent"
                : "shrink-0 border-b-2 border-transparent px-3 py-2 text-[13px] font-medium text-secondary hover:text-primary"
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {tab === "Roster" && <RosterTab hub={data} />}
        {tab === "Medication grid" && (
          <MedicationTab
            hub={data}
            onPrevDay={() => setDayOffset((d) => d - 1)}
            onNextDay={() => setDayOffset((d) => d + 1)}
          />
        )}
        {tab === "MedShack" && <MedShackTab hub={data} />}
        {tab === "Incidents" && <IncidentsTab hub={data} />}
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-card border border-card bg-surface p-3.5">
      <div className="flex items-center gap-1.5 text-[12px] text-secondary">
        <span className="text-accent">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-primary">{value}</div>
    </div>
  );
}

function RosterTab({ hub }: { hub: CampHub }) {
  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-muted">Campers registered to this camp</p>
        <Link to={`/camps/${hub.camp.campId}/register`}>
          <Button variant="secondary" className="h-8 px-3">
            <UserPlus size={13} /> Register camper
          </Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-card border border-card bg-surface">
        {hub.roster.map(({ registration, camper, pill }) => (
          <div
            key={registration.registrationId}
            className="flex items-center gap-3 border-b border-divider px-4 py-3 last:border-b-0"
          >
            <Link
              to={`/campers/${camper.camperId}?tab=history`}
              className="flex min-w-0 flex-1 items-center gap-3 transition hover:opacity-80"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-accent-tint text-[12px] font-medium text-accent">
                {initialsOf(camper.firstName, camper.surname)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-primary">
                  {camper.firstName} {camper.surname}
                </span>
                <span className="text-[12px] text-muted">
                  {camper.fileNumber}
                  {registration.cabin ? ` · cabin ${registration.cabin}` : ""}
                  {registration.groupName ? ` · ${registration.groupName}` : ""}
                </span>
              </span>
            </Link>
            {pill === "no consent" ? (
              <Link to={`/registrations/${registration.registrationId}/consent`}>
                <StatusPill tone={pillTone(pill)}>{pill}</StatusPill>
              </Link>
            ) : (
              <StatusPill tone={pillTone(pill)}>{pill}</StatusPill>
            )}
          </div>
        ))}
        {hub.roster.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px] text-muted">
            No campers registered to this camp yet.
          </div>
        )}
      </div>
    </div>
  );
}

function MedicationTab({
  hub,
  onPrevDay,
  onNextDay,
}: {
  hub: CampHub;
  onPrevDay: () => void;
  onNextDay: () => void;
}) {
  const bySlot = new Map<string, CampHub["doses"]>();
  for (const row of hub.doses) {
    if (!bySlot.has(row.slot.time)) bySlot.set(row.slot.time, []);
    bySlot.get(row.slot.time)!.push(row);
  }

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-muted">
          {formatDate(hub.day)}
          {hub.isToday ? " (today)" : ""} · the round for this camp
        </p>
        <div className="flex gap-1.5">
          <Button variant="secondary" className="h-8 px-2" aria-label="Previous day" onClick={onPrevDay}>
            <ChevronLeft size={15} />
          </Button>
          <Button variant="secondary" className="h-8 px-2" aria-label="Next day" onClick={onNextDay}>
            <ChevronRight size={15} />
          </Button>
          <Link to="/medications">
            <Button variant="secondary" className="h-8 px-3">
              Open rounds
            </Button>
          </Link>
        </div>
      </div>

      {hub.doses.length === 0 ? (
        <div className="rounded-card border border-card bg-surface px-4 py-8 text-center text-[13px] text-muted">
          No doses scheduled on this day.
        </div>
      ) : (
        [...bySlot.entries()].map(([time, rows]) => (
          <div key={time} className="mb-3 overflow-hidden rounded-card border border-card bg-surface">
            <div className="flex items-center justify-between border-b border-divider bg-header-tint px-4 py-1.5">
              <span className="text-[11.5px] font-semibold tracking-wide text-secondary">{time}</span>
              <span className="text-[11.5px] text-muted">
                {rows.filter((r) => r.slot.state === "given").length} of {rows.length} given
              </span>
            </div>
            {rows.map((row) => (
              <div
                key={`${row.prescription.prescriptionId}-${row.slot.time}`}
                className="flex items-center gap-3 border-b border-divider px-4 py-2.5 last:border-b-0"
              >
                <span className="min-w-0 flex-1">
                  <Link
                    to={`/registrations/${row.registration.registrationId}/medications`}
                    className="text-[13px] font-medium text-primary hover:underline"
                  >
                    {row.camper.firstName} {row.camper.surname}
                  </Link>
                  <span className="block truncate text-[12px] text-muted">
                    {row.prescription.medicationName} · {row.prescription.dose}
                  </span>
                </span>
                {row.slot.state === "given" ? (
                  <StatusPill tone="success">given</StatusPill>
                ) : row.slot.state === "missed" ? (
                  <StatusPill tone="warning">missed</StatusPill>
                ) : (
                  <StatusPill tone="neutral">pending</StatusPill>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function MedShackTab({ hub }: { hub: CampHub }) {
  if (hub.visits.length === 0) {
    return (
      <div className="rounded-card border border-card bg-surface px-4 py-8 text-center text-[13px] text-muted">
        No MedShack visits recorded for this camp.
      </div>
    );
  }
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-[12px] text-muted">MedShack visits for this camp</p>
        <Link to="/medshack">
          <Button variant="secondary" className="h-8 px-3">
            Open MedShack
          </Button>
        </Link>
      </div>
      <div className="overflow-hidden rounded-card border border-card bg-surface">
        {hub.visits.map((visit) => (
          <div
            key={visit.visitId}
            className="flex items-start gap-3 border-b border-divider px-4 py-3 last:border-b-0"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-danger-tint text-danger">
              <Stethoscope size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-primary">{visit.reason}</span>
              <span className="text-[12px] text-muted">
                {formatDateTime(visit.visitAt)} · nurse {visit.nurseName ?? "-"}
                {visit.doctorName ? ` · doctor ${visit.doctorName}` : ""}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IncidentsTab({ hub }: { hub: CampHub }) {
  if (hub.incidents.length === 0) {
    return (
      <div className="rounded-card border border-card bg-surface px-4 py-8 text-center text-[13px] text-muted">
        No medication or treatment events reported for this camp.
      </div>
    );
  }
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-[12px] text-muted">Events and near misses for this camp</p>
        <Link to="/incidents">
          <Button variant="secondary" className="h-8 px-3">
            Open incidents
          </Button>
        </Link>
      </div>
      <div className="overflow-hidden rounded-card border border-card bg-surface">
        {hub.incidents.map((event) => (
          <div
            key={event.eventId}
            className="flex items-start gap-3 border-b border-divider px-4 py-3 last:border-b-0"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-danger-tint text-danger">
              <TriangleAlert size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-primary">
                {event.description}
              </span>
              <span className="text-[12px] text-muted">
                {formatDateTime(event.eventAt)} · reported by {event.reporterName ?? "-"}
              </span>
            </span>
            <StatusPill tone={event.isReviewed ? "success" : "warning"}>
              {event.isReviewed ? "reviewed" : "awaiting review"}
            </StatusPill>
          </div>
        ))}
      </div>
    </div>
  );
}
