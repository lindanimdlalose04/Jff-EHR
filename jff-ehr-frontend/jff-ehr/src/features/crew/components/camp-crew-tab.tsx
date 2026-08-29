import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { StatusPill } from "@/components/ui/status-pill";
import { initialsOf } from "@/lib/display";
import { useMe } from "@/features/auth/use-me";
import {
  addCrewToCamp,
  fetchCampCrew,
  fetchCrewNotInCamp,
  removeCrewFromCamp,
  updateCrewRegistration,
} from "../api/crew.api";

const STATUSES = ["registered", "attended", "cancelled"];

/**
 * The camp hub's Crew tab (B3). Crew are registered to a camp the way campers
 * are, so this shows who is attending THIS camp and, separately, whether each
 * has done their medical check-in. A crew member attending but not yet checked
 * in shows "not checked in", which the old assume-everyone model could not say.
 */
export function CampCrewTab({ campId }: { campId: string }) {
  const me = useMe();
  const canMaintain = me.data?.role === "medical" || me.data?.role === "admin";
  const queryClient = useQueryClient();
  const [addCrewId, setAddCrewId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const crew = useQuery({ queryKey: ["camp-crew", campId], queryFn: () => fetchCampCrew(campId) });
  const available = useQuery({
    queryKey: ["crew-not-in-camp", campId],
    queryFn: () => fetchCrewNotInCamp(campId),
    enabled: canMaintain,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["camp-crew", campId] });
    void queryClient.invalidateQueries({ queryKey: ["crew-not-in-camp", campId] });
  };
  const onError = (e: Error & { response?: { status?: number } }) =>
    setError(e.response?.status === 403 ? "Only medical or admin may change crew." : e.message);

  const add = useMutation({
    mutationFn: () => addCrewToCamp(addCrewId, campId, null),
    onSuccess: () => {
      setAddCrewId("");
      setError(null);
      invalidate();
    },
    onError,
  });
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: string; role: string | null }) =>
      updateCrewRegistration(v.id, v.status, v.role),
    onSuccess: invalidate,
    onError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeCrewFromCamp(id),
    onSuccess: invalidate,
    onError,
  });

  if (crew.isLoading) return <div className="p-4 text-sm text-muted">Loading crew…</div>;
  if (crew.isError || !crew.data) {
    return <div className="p-4 text-sm text-danger">Couldn&rsquo;t load the camp crew.</div>;
  }

  return (
    <div>
      {canMaintain && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="min-w-[240px] flex-1">
            <SearchSelect
              value={addCrewId}
              onChange={setAddCrewId}
              placeholder="Search crew to add to this camp…"
              emptyText="No crew match"
              options={(available.data ?? []).map((c) => ({
                value: c.crewId,
                label: `${c.name} ${c.surname}`,
                hint: c.role,
              }))}
            />
          </div>
          <Button
            variant="primary"
            className="h-9 px-3"
            disabled={!addCrewId || add.isPending}
            onClick={() => add.mutate()}
          >
            <Plus size={14} /> Add to camp
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-2 rounded-control border border-danger-border bg-danger-tint px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {crew.data.length === 0 ? (
        <div className="rounded-card border border-card bg-surface px-4 py-8 text-center text-base text-muted">
          No crew registered to this camp yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-card bg-surface">
          {crew.data.map((entry) => (
            <div
              key={entry.registration.crewRegistrationId}
              className="flex flex-wrap items-center gap-3 border-b border-divider px-4 py-3 last:border-b-0"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-accent-tint text-xs font-medium text-accent">
                {entry.crew ? initialsOf(entry.crew.name, entry.crew.surname) : "?"}
              </span>
              <Link
                to={`/crew/${entry.registration.crewId}`}
                className="text-base font-medium text-primary hover:underline"
              >
                {entry.crew ? `${entry.crew.name} ${entry.crew.surname}` : "Unknown crew member"}
              </Link>
              <span className="text-xs text-muted">
                {entry.registration.role ?? entry.crew?.role ?? ""}
              </span>
              {entry.checkin ? (
                <StatusPill tone="success">checked in</StatusPill>
              ) : (
                <StatusPill tone="warning">not checked in</StatusPill>
              )}
              <div className="ml-auto flex items-center gap-2">
                {canMaintain ? (
                  <Select
                    aria-label="Attendance status"
                    className="h-8 w-auto text-sm capitalize"
                    value={entry.registration.status}
                    onChange={(e) =>
                      setStatus.mutate({
                        id: entry.registration.crewRegistrationId,
                        status: e.target.value,
                        role: entry.registration.role,
                      })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <StatusPill tone="neutral">{entry.registration.status}</StatusPill>
                )}
                {canMaintain && (
                  <button
                    type="button"
                    aria-label="Remove from camp"
                    className="rounded p-1.5 text-secondary hover:bg-danger-tint hover:text-danger"
                    onClick={() => remove.mutate(entry.registration.crewRegistrationId)}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
