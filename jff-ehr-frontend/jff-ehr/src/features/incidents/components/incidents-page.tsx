import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { SortControl, type SortDirection } from "@/components/ui/sort-control";
import { formatDateTime } from "@/lib/display";
import { useMe } from "@/features/auth/use-me";
import { useActiveCamp } from "@/app/active-camp-context";
import { campFilterLabel } from "@/lib/camp-state";
import { useCamps } from "@/features/camps/hooks/use-camps";
import { fetchIncidents, reviewIncident, type IncidentRow } from "../api/incidents.api";

type SortKey = "eventAt" | "discoveryAt";

const SORT_OPTIONS = [
  { value: "eventAt", label: "Event date" },
  { value: "discoveryAt", label: "Discovery date" },
];

/**
 * Route "/incidents". Filed medication / treatment events. A filed report is
 * never edited: a medical person adds the investigation and corrective action
 * plan once, and the DB trigger allows that review exactly one time.
 */
export function IncidentsPage() {
  const me = useMe();
  const canReview = me.data?.role === "medical";
  const { selectedCampId } = useActiveCamp();
  const camps = useCamps();
  const [campOverride, setCampOverride] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("eventAt");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  // Default to the active camp until the user picks; "" means every camp.
  const campFilter = campOverride === null ? (selectedCampId ?? "") : campOverride;

  const { data: events, isLoading, isError } = useQuery({
    queryKey: ["incidents", campFilter],
    queryFn: () => fetchIncidents(campFilter || null),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading incidents…</div>;
  if (isError || !events) {
    return (
      <div className="p-6 text-sm text-danger">
        Couldn&rsquo;t load incidents. Refresh to try again.
      </div>
    );
  }

  const awaiting = events.filter((e) => !e.isReviewed).length;
  const dir = sortDir === "asc" ? 1 : -1;
  const rows = events
    .filter(
      (e) =>
        !reviewFilter ||
        (reviewFilter === "reviewed" ? e.isReviewed : !e.isReviewed),
    )
    .sort((a, b) =>
      sortKey === "discoveryAt"
        ? dir * a.discoveryAt.localeCompare(b.discoveryAt)
        : dir * a.eventAt.localeCompare(b.eventAt),
    );
  const campOptions = [...(camps.data ?? [])].sort((a, b) => b.campNumber - a.campNumber);
  const now = new Date();

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-primary">Incidents and near misses</h1>
        <StatusPill tone="neutral">{rows.length}</StatusPill>
        {awaiting > 0 && <StatusPill tone="warning">{awaiting} awaiting review</StatusPill>}
        {canReview && (
          <Link to="/incidents/new" className="ml-auto">
            <Button variant="primary">
              <Plus size={15} />
              Report an event
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          aria-label="Filter by camp"
          className="h-9 w-auto text-sm"
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
        <Select
          aria-label="Filter by review status"
          className="h-9 w-auto text-sm"
          value={reviewFilter}
          onChange={(e) => setReviewFilter(e.target.value)}
        >
          <option value="">All events</option>
          <option value="awaiting">Awaiting review</option>
          <option value="reviewed">Reviewed</option>
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

      {rows.length === 0 ? (
        <div className="rounded-card border border-card bg-surface px-4 py-10 text-center">
          <TriangleAlert size={22} className="mx-auto text-muted" />
          <p className="mt-2 text-base font-medium text-primary">No events to show</p>
          <p className="mt-1 text-sm text-muted">
            Nothing matches the current filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((event) => (
            <IncidentCard key={event.eventId} event={event} canReview={canReview} />
          ))}
        </div>
      )}
    </div>
  );
}

function IncidentCard({ event, canReview }: { event: IncidentRow; canReview: boolean }) {
  const queryClient = useQueryClient();
  const [reviewing, setReviewing] = useState(false);
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [error, setError] = useState<string | null>(null);

  const review = useMutation({
    mutationFn: () => reviewIncident(event.eventId, correctiveAction.trim()),
    onSuccess: () => {
      setReviewing(false);
      setCorrectiveAction("");
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (e: Error & { response?: { status?: number } }) =>
      setError(
        e.response?.status === 403
          ? "Only the medical team may review events."
          : e.response?.status === 409
            ? "This event has already been reviewed; the review cannot be changed."
            : e.message,
      ),
  });

  return (
    <div className="rounded-card border border-card bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-none bg-danger-tint text-danger">
          <TriangleAlert size={15} />
        </span>
        {event.camper ? (
          <Link
            to={`/campers/${event.camper.camperId}`}
            className="text-base font-medium text-primary hover:underline"
          >
            {event.camper.firstName} {event.camper.surname}
          </Link>
        ) : (
          <span className="text-base font-medium text-primary">Unknown camper</span>
        )}
        {event.camper && (
          <span className="text-xs text-muted">{event.camper.fileNumber}</span>
        )}
        {event.isReviewed ? (
          <StatusPill tone="success">reviewed</StatusPill>
        ) : (
          <StatusPill tone="warning">awaiting review</StatusPill>
        )}
        <span className="ml-auto text-xs text-muted">{formatDateTime(event.eventAt)}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {event.types.map((t) => (
          <span
            key={t}
            className="rounded-none bg-danger-tint px-2 py-0.5 text-xs font-medium text-danger"
          >
            {t}
          </span>
        ))}
        {event.otherEventType && (
          <span className="rounded-none bg-danger-tint px-2 py-0.5 text-xs font-medium text-danger">
            Other: {event.otherEventType}
          </span>
        )}
        {event.factors.map((f) => (
          <span
            key={f}
            className="rounded-none bg-neutral-tint px-2 py-0.5 text-xs font-medium text-neutral"
          >
            {f}
          </span>
        ))}
        {event.otherContributingFactor && (
          <span className="rounded-none bg-neutral-tint px-2 py-0.5 text-xs font-medium text-neutral">
            Other: {event.otherContributingFactor}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-secondary">{event.description}</p>
      <p className="mt-1 text-xs text-muted">
        {event.campLabel} · discovered {formatDateTime(event.discoveryAt)}
      </p>

      <dl className="mt-2 space-y-1 text-sm">
        <div>
          <dt className="inline text-muted">Immediate action: </dt>
          <dd className="inline text-secondary">{event.immediateAction}</dd>
        </div>
        {event.doctorNotified && (
          <div>
            <dt className="inline text-muted">Doctor notified: </dt>
            <dd className="inline text-secondary">{event.doctorNotified}</dd>
          </div>
        )}
        <div>
          <dt className="inline text-muted">Treatment ordered: </dt>
          <dd className="inline text-secondary">
            {event.noTreatmentOrdered ? "None ordered" : (event.treatmentOrdered ?? "Not stated")}
          </dd>
        </div>
      </dl>

      {event.isReviewed && (
        <div className="mt-2.5 rounded-control border border-accent-border bg-accent-tint/40 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            Investigation and corrective action
          </p>
          <p className="mt-1 text-sm text-secondary">{event.correctiveAction}</p>
          <p className="mt-1 text-xs text-muted">
            Reviewed by {event.reviewerName ?? "-"}
            {event.reviewedAt ? ` on ${formatDateTime(event.reviewedAt)}` : ""}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-2 rounded-control border border-danger-border bg-danger-tint px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {reviewing && (
        <div className="mt-2.5 rounded-control border border-accent-border bg-accent-tint/30 p-3">
          <label className="mb-1 block text-sm font-medium text-secondary">
            Event investigation and corrective action plan
          </label>
          <Textarea
            value={correctiveAction}
            onChange={(e) => setCorrectiveAction(e.target.value)}
            placeholder="What was found, and what will change"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              className="h-8 px-3"
              disabled={review.isPending}
              onClick={() => {
                setReviewing(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="h-8 px-3"
              disabled={!correctiveAction.trim() || review.isPending}
              onClick={() => review.mutate()}
            >
              {review.isPending ? "Signing off…" : "Sign off review"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          Reported by {event.reporterName ?? "-"}
          {event.isReviewed ? "" : " · not yet reviewed"}
        </p>
        {canReview && !event.isReviewed && !reviewing && (
          <Button
            variant="secondary"
            className="h-8 px-3"
            onClick={() => {
              setReviewing(true);
              setError(null);
            }}
          >
            <ShieldCheck size={13} /> Add review
          </Button>
        )}
      </div>
    </div>
  );
}
