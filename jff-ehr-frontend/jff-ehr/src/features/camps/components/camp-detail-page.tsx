import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Stethoscope,
  TriangleAlert,
  UserPlus,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  formatDate,
  formatDateTime,
  statusLabel,
  statusTone,
} from "@/lib/display";
import { deriveCampState } from "@/lib/camp-state";
import { CampCrewTab } from "@/features/crew/components/camp-crew-tab";
import {
  RecordBanner, TabStrip, StatStrip, Stat, Toolbar, DataTable, thClass, tdClass,
  type BannerFlag,
} from "@/components/ui/record-chrome";
import { fetchCampHub, pillTone, type CampHub } from "../api/camp-hub.api";

/**
 * Route "/camps/:campId". The camp hub (spec/wireframes/05): the operational
 * half of the architecture, everything clinical for THIS camp episode in one
 * place. The camper profile is the persistent half.
 *
 * Status pills reuse the shared vocabulary. Consent is the acceptance gate, so
 * a missing consent record shows red ahead of any assessment state.
 */

const TABS = ["Roster", "Crew", "Medication grid", "MedShack", "Incidents"] as const;
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
      <Breadcrumb
        items={[
          { label: "Camps", to: "/camps" },
          { label: `Camp ${camp.campNumber}, ${camp.venue}` },
        ]}
      />

      <div className="border border-card bg-surface">
        {(() => {
          const state = deriveCampState(camp, now);
          const noConsent = roster.filter((r) => r.pill === "no consent").length;
          const flags: BannerFlag[] = [
            { label: statusLabel(state), tone: statusTone(state) === "success" ? "success" : "neutral" },
          ];
          if (noConsent > 0) {
            flags.push({ label: `${noConsent} consent missing`, tone: "danger" });
          }
          return (
            <RecordBanner
              title={`Camp ${camp.campNumber}, ${camp.venue}`}
              flags={flags}
              actions={
                <Link to={`/camps/${camp.campId}/edit`}>
                  <Button variant="secondary" className="h-8 px-3">
                    <Pencil size={13} /> Edit camp
                  </Button>
                </Link>
              }
              meta={
                <>
                  {camp.province} &middot; <span className="mono">{formatDate(camp.startDate)}</span> to{" "}
                  <span className="mono">{formatDate(camp.endDate)}</span> &middot;{" "}
                  <span className="capitalize">{camp.campType}</span>
                </>
              }
            />
          );
        })()}

        <StatStrip>
          <Stat label="Campers registered" value={roster.length} />
          <Stat label="Assessed" value={`${assessed} of ${roster.length}`} />
          <Stat
            label={data.isToday ? "Doses given today" : "Doses given that day"}
            value={`${dosesGiven} of ${doses.length}`}
          />
          <Stat
            label="MedShack visits"
            value={visits.length}
            tone={visits.length > 0 ? "warning" : "plain"}
          />
        </StatStrip>

        <TabStrip tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="pt-4">
        {tab === "Roster" && <RosterTab hub={data} />}
        {tab === "Crew" && <CampCrewTab campId={camp.campId} />}
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

function RosterTab({ hub }: { hub: CampHub }) {
  return (
    <div className="border border-card bg-surface">
      <Toolbar>
        <span className="text-sm text-muted">
          {hub.roster.length} camper{hub.roster.length === 1 ? "" : "s"} registered to this camp
        </span>
        <span className="flex-1" />
        <Link to={`/camps/${hub.camp.campId}/register`}>
          <Button variant="secondary" className="h-8 px-3">
            <UserPlus size={13} /> Register camper
          </Button>
        </Link>
      </Toolbar>

      {hub.roster.length === 0 ? (
        <div className="px-4 py-8 text-center text-base text-muted">
          No campers registered to this camp yet.
        </div>
      ) : (
        <DataTable
          head={
            <>
              <th className={thClass}>Camper</th>
              <th className={thClass}>File</th>
              <th className={thClass}>Cabin / group</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Records</th>
            </>
          }
        >
          {hub.roster.map(({ registration, camper, pill }) => (
            <tr key={registration.registrationId} className="even:bg-page/60">
              <td className={tdClass}>
                <Link
                  to={`/campers/${camper.camperId}?tab=history`}
                  className="font-semibold text-accent-strong underline"
                >
                  {camper.surname}, {camper.firstName}
                </Link>
              </td>
              <td className={`${tdClass} mono`}>{camper.fileNumber}</td>
              <td className={tdClass}>
                {registration.cabin ? `Cabin ${registration.cabin}` : "-"}
                {registration.groupName ? ` · ${registration.groupName}` : ""}
              </td>
              <td className={tdClass}>
                {pill === "no consent" ? (
                  <Link to={`/registrations/${registration.registrationId}/consent`}>
                    <StatusPill tone={pillTone(pill)}>{pill}</StatusPill>
                  </Link>
                ) : (
                  <StatusPill tone={pillTone(pill)}>{pill}</StatusPill>
                )}
              </td>
              <td className={tdClass}>
                <span className="flex gap-3">
                  <Link
                    to={`/registrations/${registration.registrationId}/precamp`}
                    className="text-sm font-semibold text-accent-strong hover:underline"
                  >
                    Pre-camp
                  </Link>
                  <Link
                    to={`/registrations/${registration.registrationId}/arrival-check`}
                    className="text-sm font-semibold text-accent-strong hover:underline"
                  >
                    Arrival
                  </Link>
                </span>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
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
        <p className="text-sm text-muted">
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
        <div className="rounded-card border border-card bg-surface px-4 py-8 text-center text-base text-muted">
          No doses scheduled on this day.
        </div>
      ) : (
        [...bySlot.entries()].map(([time, rows]) => (
          <div key={time} className="mb-3 overflow-hidden rounded-card border border-card bg-surface">
            <div className="flex items-center justify-between border-b border-divider bg-header-tint px-4 py-1.5">
              <span className="text-xs font-semibold tracking-wide text-secondary">{time}</span>
              <span className="text-xs text-muted">
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
                    className="text-base font-medium text-primary hover:underline"
                  >
                    {row.camper.firstName} {row.camper.surname}
                  </Link>
                  <span className="block truncate text-sm text-muted">
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
      <div className="rounded-card border border-card bg-surface px-4 py-8 text-center text-base text-muted">
        No MedShack visits recorded for this camp.
      </div>
    );
  }
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-sm text-muted">MedShack visits for this camp</p>
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
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-danger-tint text-danger">
              <Stethoscope size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-medium text-primary">{visit.reason}</span>
              <span className="text-sm text-muted">
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
      <div className="rounded-card border border-card bg-surface px-4 py-8 text-center text-base text-muted">
        No medication or treatment events reported for this camp.
      </div>
    );
  }
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-sm text-muted">Events and near misses for this camp</p>
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
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-danger-tint text-danger">
              <TriangleAlert size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-medium text-primary">
                {event.description}
              </span>
              <span className="text-sm text-muted">
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
