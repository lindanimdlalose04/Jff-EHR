import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Droplet, HeartPulse, Pencil, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDate, formatDateTime, initialsOf } from "@/lib/display";
import { useMe } from "@/features/auth/use-me";
import { fetchCrewDetail } from "../api/crew.api";

/**
 * Route "/crew/:crewId". A crew member's own record: personal details and their
 * medical check-in for the active camp, with the crew-specific broviac/port and
 * blood-count flags and the indemnity gate.
 */
export function CrewDetailPage() {
  const { crewId = "" } = useParams();
  const me = useMe();
  const canMaintain = me.data?.role === "medical" || me.data?.role === "admin";
  const { data, isLoading, isError } = useQuery({
    queryKey: ["crew-detail", crewId],
    queryFn: () => fetchCrewDetail(crewId),
    enabled: Boolean(crewId),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading crew member…</div>;
  if (isError || !data) {
    return <div className="p-6 text-sm text-danger">Couldn&rsquo;t load this crew member.</div>;
  }

  const { crew, activeCamp, checkin } = data;

  return (
    <div>
      <Link
        to="/crew"
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-secondary hover:text-primary"
      >
        <ArrowLeft size={14} /> Crew
      </Link>

      <div className="flex items-start gap-4 rounded-card border border-card bg-surface p-5">
        {crew.photoUrl ? (
          <img
            src={crew.photoUrl}
            alt={`${crew.name} ${crew.surname}`}
            className="h-14 w-14 rounded-[12px] object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] bg-accent-tint text-[17px] font-semibold text-accent">
            {initialsOf(crew.name, crew.surname)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-[17px] font-semibold text-primary">
            {crew.name} {crew.surname}
          </h1>
          <p className="mt-0.5 text-[12.5px] text-secondary">
            {crew.role} · ID {crew.idNumber}
            {crew.dob ? ` · born ${formatDate(crew.dob)}` : ""}
          </p>
        </div>
        {canMaintain && (
          <Link to={`/crew/${crew.crewId}/edit`}>
            <Button variant="secondary" className="h-8 px-3">
              <Pencil size={13} /> Edit
            </Button>
          </Link>
        )}
      </div>

      <div className="mt-4 rounded-card border border-card bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-semibold text-primary">Medical check-in</h2>
            <p className="mt-0.5 text-[12px] text-muted">
              {activeCamp
                ? `Camp ${activeCamp.campNumber}, ${activeCamp.venue}`
                : "No active camp"}
            </p>
          </div>
          {activeCamp && canMaintain && (
            <Link to={`/crew/${crew.crewId}/checkin`}>
              <Button variant={checkin ? "secondary" : "primary"} className="h-8 px-3">
                <HeartPulse size={13} /> {checkin ? "Edit check-in" : "Check in"}
              </Button>
            </Link>
          )}
        </div>

        {!activeCamp ? (
          <p className="text-[12.5px] text-muted">
            There is no active camp, so there is no check-in to show.
          </p>
        ) : !checkin ? (
          <p className="text-[12.5px] text-muted">Not checked in for this camp yet.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {checkin.medicalReleaseSigned ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-tint px-2.5 py-0.5 text-[11.5px] font-medium text-accent">
                  <ShieldCheck size={12} /> indemnity signed
                </span>
              ) : (
                <StatusPill tone="danger">indemnity outstanding</StatusPill>
              )}
              {checkin.hasBroviacPort && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning-tint px-2.5 py-0.5 text-[11.5px] font-medium text-warning">
                  broviac / port
                </span>
              )}
              {checkin.hasBloodCount && (
                <span className="inline-flex items-center gap-1 rounded-full bg-warning-tint px-2.5 py-0.5 text-[11.5px] font-medium text-warning">
                  <Droplet size={11} /> blood count
                </span>
              )}
            </div>
            <dl>
              <Row label="Allergies" value={checkin.allergies} />
              <Row label="Eyesight" value={checkin.eyesight} />
              <Row label="Hearing" value={checkin.hearing} />
              <Row label="Mobility aids" value={checkin.mobilityAids} />
              <Row label="Current medications" value={checkin.currentMedications} />
            </dl>
            <p className="mt-2 text-[11.5px] text-muted">
              Checked in by {checkin.checkedInByName ?? "-"} on {formatDateTime(checkin.checkedInAt)}.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3 border-b border-divider py-2 text-[12.5px] last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-primary">{value || "-"}</dd>
    </div>
  );
}
