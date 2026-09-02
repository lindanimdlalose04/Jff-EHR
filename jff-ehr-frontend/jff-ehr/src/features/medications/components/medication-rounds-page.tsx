import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { RecordBanner, Toolbar } from "@/components/ui/record-chrome";
import { initialsOf } from "@/lib/display";
import { useMe } from "@/features/auth/use-me";
import { useActiveCamp } from "@/app/active-camp-context";
import { CampScopePicker } from "@/components/layout/camp-scope-picker";
import { fetchRounds, recordDose, type DoseSlot, type RoundEntry } from "../api/medications.api";

/**
 * Route "/medications". Today's rounds for the active camp: the flat
 * operational list the nurse works down while doing the round (spec/forms/05,
 * "two views of the same data"). Grouped by time slot. Recording a dose writes
 * an append-only medication_doses row stamped with who and when.
 */
export function MedicationRoundsPage() {
  const queryClient = useQueryClient();
  const me = useMe();
  const canRecord = me.data?.role === "medical";
  const { selectedCampId } = useActiveCamp();
  const [dayOffset, setDayOffset] = useState(0);
  const [stateFilter, setStateFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["medication-rounds", selectedCampId, dayOffset],
    queryFn: () => fetchRounds(selectedCampId, dayOffset, now),
  });

  const record = useMutation({
    mutationFn: (slot: DoseSlot) =>
      recordDose({ prescriptionId: slot.prescriptionId, scheduledAt: slot.scheduledAt }),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["medication-rounds"] });
      void queryClient.invalidateQueries({ queryKey: ["medication-grid"] });
    },
    onError: (e: Error & { response?: { status?: number } }) =>
      setError(
        e.response?.status === 403 ? "Only the medical team may record doses." : e.message,
      ),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading rounds…</div>;
  if (isError || !data) {
    return <div className="p-6 text-sm text-danger">Couldn&rsquo;t load the medication rounds.</div>;
  }

  if (!data.camp) {
    return (
      <div className="border border-card bg-surface px-4 py-8 text-center text-base text-muted">
        No camp is currently active, so there are no rounds to run.
      </div>
    );
  }

  const missedCount = data.entries.filter((e) => e.slot.state === "missed").length;
  const givenCount = data.entries.filter((e) => e.slot.state === "given").length;

  // The status filter narrows the visible rows; the pills above stay day
  // totals so the summary of the whole round is always in view.
  const filteredEntries = stateFilter
    ? data.entries.filter((e) => e.slot.state === stateFilter)
    : data.entries;

  // Group by time slot: that is how the round is actually walked.
  const bySlot = new Map<string, RoundEntry[]>();
  for (const entry of filteredEntries) {
    if (!bySlot.has(entry.slot.time)) bySlot.set(entry.slot.time, []);
    bySlot.get(entry.slot.time)!.push(entry);
  }

  return (
    <div>
      <div className="border border-card bg-surface">
      <RecordBanner
        title="Medication rounds"
        actions={<CampScopePicker />}
        flags={[
          { label: `${givenCount} given`, tone: "success" },
          ...(missedCount > 0
            ? [{ label: `${missedCount} missed`, tone: "danger" as const }]
            : []),
        ]}
        meta={
          <>
            Camp {data.camp.campNumber}, {data.camp.venue} &middot;{" "}
            <span className="mono">
              {format(new Date(`${data.day}T00:00:00`), "EEEE d MMMM yyyy")}
            </span>
            {data.isToday ? " (today)" : ""}
          </>
        }
      />
      <Toolbar>
        <div className="flex flex-wrap items-center gap-1.5">
          <Select
            aria-label="Filter by dose status"
            className="h-8 w-auto text-sm"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="">All doses</option>
            <option value="given">Given</option>
            <option value="missed">Missed</option>
            <option value="pending">Pending</option>
          </Select>
          <Button
            variant="secondary"
            className="h-8 px-2"
            aria-label="Previous day"
            onClick={() => setDayOffset((d) => d - 1)}
          >
            <ChevronLeft size={15} />
          </Button>
          <Button
            variant="secondary"
            className="h-8 px-2"
            aria-label="Next day"
            onClick={() => setDayOffset((d) => d + 1)}
          >
            <ChevronRight size={15} />
          </Button>
        </div>
      </Toolbar>
      </div>

      {error && (
        <div className="mb-3 border border-danger bg-danger-tint px-3 py-2 text-sm font-semibold text-danger-text">
          {error}
        </div>
      )}

      {filteredEntries.length === 0 ? (
        <div className="border border-card bg-surface px-4 py-8 text-center text-base text-muted">
          {data.entries.length === 0
            ? "No doses scheduled on this day."
            : "No doses match the current filter."}
        </div>
      ) : (
        [...bySlot.entries()].map(([time, entries]) => (
          <div key={time} className="mb-3 overflow-hidden border border-card bg-surface">
            <div className="flex items-center justify-between border-b border-divider bg-header-tint px-4 py-1.5">
              <span className="text-xs font-semibold tracking-wide text-secondary">{time}</span>
              <span className="text-xs text-muted">
                {entries.filter((e) => e.slot.state === "given").length} of {entries.length} given
              </span>
            </div>
            {entries.map((entry) => (
              <RoundRow
                key={`${entry.prescription.prescriptionId}-${entry.slot.day}-${entry.slot.time}`}
                entry={entry}
                canRecord={canRecord}
                busy={record.isPending}
                onRecord={() => record.mutate(entry.slot)}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function RoundRow({
  entry,
  canRecord,
  busy,
  onRecord,
}: {
  entry: RoundEntry;
  canRecord: boolean;
  busy: boolean;
  onRecord: () => void;
}) {
  const { slot, prescription, camper, registration } = entry;
  return (
    <div className="flex items-center gap-3 border-b border-divider px-4 py-2.5 last:border-b-0">
      <Link
        to={`/campers/${camper.camperId}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center bg-accent-tint text-xs font-medium text-accent"
      >
        {initialsOf(camper.firstName, camper.surname)}
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          to={`/registrations/${registration.registrationId}/medications`}
          className="text-base font-medium text-primary hover:underline"
        >
          {camper.firstName} {camper.surname}
        </Link>
        <div className="truncate text-sm text-muted">
          <Link
            to={`/registrations/${registration.registrationId}/prescriptions`}
            className="text-secondary hover:text-primary hover:underline"
          >
            {prescription.medicationName}
          </Link>
          {" · "}
          {prescription.dose}
          {prescription.route ? ` · ${prescription.route}` : ""}
          {registration.cabin ? ` · cabin ${registration.cabin}` : ""}
        </div>
      </div>

      {slot.state === "given" ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          {slot.givenDose?.administeredAt
            ? format(new Date(slot.givenDose.administeredAt), "HH:mm")
            : ""}
          {slot.givenDose?.administeredByName ? ` by ${slot.givenDose.administeredByName}` : ""}
          <StatusPill tone="success">
            <Check size={11} /> given
          </StatusPill>
        </span>
      ) : slot.state === "missed" ? (
        <div className="flex items-center gap-2">
          <StatusPill tone="warning">
            <TriangleAlert size={11} /> missed
          </StatusPill>
          {canRecord && (
            <Button variant="secondary" className="h-8 px-3" disabled={busy} onClick={onRecord}>
              Record
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <StatusPill tone="neutral">pending</StatusPill>
          {canRecord && (
            <Button variant="primary" className="h-8 px-3" disabled={busy} onClick={onRecord}>
              Record
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
