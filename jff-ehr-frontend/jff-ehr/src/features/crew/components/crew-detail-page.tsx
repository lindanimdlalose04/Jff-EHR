import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, HeartPulse, Pencil, ShieldCheck, Tent } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDate, formatDateTime, initialsOf, statusLabel, statusTone } from "@/lib/display";
import { deriveCampState } from "@/lib/camp-state";
import { isPdfUrl } from "@/lib/storage-upload";
import { useMe } from "@/features/auth/use-me";
import { fetchCrewDetail } from "../api/crew.api";

/**
 * Route "/crew/:crewId". A crew member's own record: personal details, the camps
 * they are registered to (B3), and their medical check-in for the active camp
 * with its free-text comments and the indemnity gate.
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

  const { crew, activeCamp, checkin, camps } = data;
  const now = new Date();

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Crew", to: "/crew" },
          { label: `${crew.name} ${crew.surname}` },
        ]}
      />

      <div className="flex items-start gap-4 rounded-card border border-card bg-surface p-5">
        {crew.photoUrl && !isPdfUrl(crew.photoUrl) ? (
          <img
            src={crew.photoUrl}
            alt={`${crew.name} ${crew.surname}`}
            className="h-14 w-14 rounded-[12px] object-cover"
          />
        ) : crew.photoUrl ? (
          <a
            href={crew.photoUrl}
            target="_blank"
            rel="noreferrer"
            title="View scanned document"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] bg-accent-tint text-accent"
          >
            <FileText size={20} />
          </a>
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
            </div>
            <dl>
              <Row label="Allergies" value={checkin.allergies} />
              <Row label="Eyesight" value={checkin.eyesight} />
              <Row label="Hearing" value={checkin.hearing} />
              <Row label="Current medications" value={checkin.currentMedications} />
              <Row label="Comments" value={checkin.comments} />
            </dl>
            <p className="mt-2 text-[11.5px] text-muted">
              Checked in by {checkin.checkedInByName ?? "-"} on {formatDateTime(checkin.checkedInAt)}.
            </p>
          </>
        )}
      </div>

      <div className="mt-4 rounded-card border border-card bg-surface p-5">
        <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-primary">
          <Tent size={14} className="text-muted" /> Camps attended
        </h2>
        {camps.length === 0 ? (
          <p className="text-[12.5px] text-muted">
            Not registered to any camp yet. Add this crew member from a camp&rsquo;s Crew tab.
          </p>
        ) : (
          <ul className="divide-y divide-divider">
            {camps.map(({ registration, camp }) => (
              <li key={registration.crewRegistrationId} className="flex items-center gap-3 py-2">
                <Link
                  to={camp ? `/camps/${camp.campId}` : "#"}
                  className="min-w-0 flex-1"
                >
                  <span className="text-[12.5px] font-medium text-primary hover:underline">
                    {camp ? `Camp ${camp.campNumber}, ${camp.venue}` : "Camp"}
                  </span>
                  {camp && (
                    <span className="block text-[11px] text-muted">
                      {formatDate(camp.startDate)} · {deriveCampState(camp, now)}
                      {registration.role ? ` · ${registration.role}` : ""}
                    </span>
                  )}
                </Link>
                <StatusPill tone={statusTone(registration.status)}>
                  {statusLabel(registration.status)}
                </StatusPill>
              </li>
            ))}
          </ul>
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
