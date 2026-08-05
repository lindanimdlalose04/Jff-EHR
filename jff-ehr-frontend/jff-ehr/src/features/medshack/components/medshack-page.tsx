import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { SortControl, type SortDirection } from "@/components/ui/sort-control";
import { formatDateTime, initialsOf } from "@/lib/display";
import { useMe } from "@/features/auth/use-me";
import { useActiveCamp } from "@/app/active-camp-context";
import { campFilterLabel } from "@/lib/camp-state";
import { useCamps } from "@/features/camps/hooks/use-camps";
import { appendTreatment, fetchVisits, type VisitRow } from "../api/medshack.api";

type SortKey = "date" | "camper";

const SORT_OPTIONS = [
  { value: "date", label: "Visit date" },
  { value: "camper", label: "Camper name" },
];

/**
 * Route "/medshack". The visit list. Visits themselves are append and correct
 * only, but treatments are append-only rows, so a further treatment can be
 * added to an existing visit from here without touching the visit record.
 *
 * The camp filter defaults to the active camp (the day-to-day view) but can be
 * switched to any past or planned camp, or to every camp at once.
 */
export function MedShackPage() {
  const me = useMe();
  const canRecord = me.data?.role === "medical";
  const { selectedCampId } = useActiveCamp();
  const camps = useCamps();
  const [campOverride, setCampOverride] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  // Default to the active camp until the user picks; "" means every camp.
  const campFilter = campOverride === null ? (selectedCampId ?? "") : campOverride;

  const { data: visits, isLoading, isError } = useQuery({
    queryKey: ["medshack-visits", campFilter],
    queryFn: () => fetchVisits(campFilter || null),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading visits…</div>;
  if (isError || !visits) {
    return (
      <div className="p-6 text-sm text-danger">
        Couldn&rsquo;t load MedShack visits. Refresh to try again.
      </div>
    );
  }

  const now = new Date();
  const dir = sortDir === "asc" ? 1 : -1;
  const rows = [...visits].sort((a, b) => {
    if (sortKey === "camper") {
      const an = a.camper ? `${a.camper.surname} ${a.camper.firstName}` : "";
      const bn = b.camper ? `${b.camper.surname} ${b.camper.firstName}` : "";
      return dir * (an.localeCompare(bn) || a.visitAt.localeCompare(b.visitAt));
    }
    return dir * a.visitAt.localeCompare(b.visitAt);
  });
  const campOptions = [...(camps.data ?? [])].sort((a, b) => b.campNumber - a.campNumber);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="text-[17px] font-semibold text-primary">MedShack</h1>
        <StatusPill tone="neutral">{rows.length} visits</StatusPill>
        {canRecord && (
          <Link to="/medshack/new" className="ml-auto">
            <Button variant="primary">
              <Plus size={15} />
              New visit
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          aria-label="Filter by camp"
          className="h-9 w-auto text-[12.5px]"
          value={campFilter}
          onChange={(e) => setCampOverride(e.target.value)}
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

      <div className="space-y-3">
        {rows.map((visit) => (
          <VisitCard key={visit.visitId} visit={visit} canRecord={canRecord} />
        ))}
        {rows.length === 0 && (
          <div className="rounded-card border border-card bg-surface px-4 py-8 text-center text-[13px] text-muted">
            No MedShack visits match the current filter.
          </div>
        )}
      </div>
    </div>
  );
}

function VisitCard({ visit, canRecord }: { visit: VisitRow; canRecord: boolean }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [description, setDescription] = useState("");
  const [outcome, setOutcome] = useState("");
  const [error, setError] = useState<string | null>(null);

  const append = useMutation({
    mutationFn: () =>
      appendTreatment(visit.visitId, {
        treatmentTime: new Date().toISOString(),
        treatmentDescription: description.trim(),
        outcome: outcome.trim() || null,
      }),
    onSuccess: () => {
      setAdding(false);
      setDescription("");
      setOutcome("");
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["medshack-visits"] });
    },
    onError: (e: Error & { response?: { status?: number } }) =>
      setError(
        e.response?.status === 403
          ? "Only the medical team may add treatments."
          : e.message,
      ),
  });

  return (
    <div className="rounded-card border border-card bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-danger-tint text-danger">
          <Stethoscope size={15} />
        </span>
        {visit.camper ? (
          <Link
            to={`/campers/${visit.camper.camperId}`}
            className="text-[13.5px] font-medium text-primary hover:underline"
          >
            {visit.camper.firstName} {visit.camper.surname}
          </Link>
        ) : (
          <span className="text-[13.5px] font-medium text-primary">Unknown camper</span>
        )}
        {visit.camper && (
          <span className="text-[11px] text-muted">
            {initialsOf(visit.camper.firstName, visit.camper.surname)} · {visit.camper.fileNumber}
          </span>
        )}
        <span className="ml-auto text-[11.5px] text-muted">{formatDateTime(visit.visitAt)}</span>
      </div>

      <p className="mt-2 text-[13px] font-medium text-primary">{visit.reason}</p>
      <p className="mt-0.5 text-[11.5px] text-muted">
        {visit.campLabel}
        {visit.accompaniedBy ? ` · accompanied by ${visit.accompaniedBy}` : ""}
      </p>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-secondary">
        {visit.temperature != null && <span>{visit.temperature}°C</span>}
        {visit.pulse != null && <span>Pulse {visit.pulse}</span>}
        {visit.bloodPressure && <span>BP {visit.bloodPressure}</span>}
        {visit.oxygenSaturation != null && <span>SpO2 {visit.oxygenSaturation}%</span>}
      </div>

      {visit.signsSymptoms && (
        <p className="mt-1.5 text-[12.5px] text-secondary">{visit.signsSymptoms}</p>
      )}
      {visit.findings && <p className="mt-1 text-[12.5px] text-secondary">{visit.findings}</p>}

      {visit.treatments.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-l-2 border-accent-border pl-3 text-[12.5px] text-secondary">
          {visit.treatments.map((t) => (
            <li key={t.treatmentId}>
              {t.sequenceNo}. {t.treatmentDescription}
              {t.outcome ? `, ${t.outcome}` : ""}
              {t.administeredByName ? (
                <span className="text-muted"> ({t.administeredByName})</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {visit.adviceGiven && (
        <p className="mt-2 text-[12.5px] text-secondary">
          <span className="text-muted">Advice: </span>
          {visit.adviceGiven}
        </p>
      )}
      {visit.nursingReport && (
        <p className="mt-1 text-[12.5px] text-secondary">
          <span className="text-muted">Report: </span>
          {visit.nursingReport}
        </p>
      )}

      {error && (
        <div className="mt-2 rounded-control border border-danger-border bg-danger-tint px-3 py-2 text-[12px] text-danger">
          {error}
        </div>
      )}

      {adding && (
        <div className="mt-2.5 grid gap-2 rounded-control border border-accent-border bg-accent-tint/30 p-3 sm:grid-cols-2">
          <Input
            aria-label="Treatment"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Treatment given"
          />
          <Input
            aria-label="Outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="Outcome (optional)"
          />
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button
              variant="secondary"
              className="h-8 px-3"
              disabled={append.isPending}
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="h-8 px-3"
              disabled={!description.trim() || append.isPending}
              onClick={() => append.mutate()}
            >
              {append.isPending ? "Adding…" : "Add treatment"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11.5px] text-muted">
          Nurse: {visit.nurseName ?? "-"}
          {visit.doctorName ? ` · Doctor: ${visit.doctorName}` : ""}
        </p>
        {canRecord && !adding && (
          <Button
            variant="secondary"
            className="h-8 px-3"
            onClick={() => {
              setAdding(true);
              setError(null);
            }}
          >
            <Plus size={13} /> Add treatment
          </Button>
        )}
      </div>
    </div>
  );
}
