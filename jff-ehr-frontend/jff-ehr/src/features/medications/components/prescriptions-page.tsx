import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Lock, Pencil, Pill, Plus } from "lucide-react";
import type { PrescriptionDto } from "@/api/types";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { RecordBanner } from "@/components/ui/record-chrome";
import { Input, Textarea } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDate } from "@/lib/display";
import { useMe } from "@/features/auth/use-me";
import {
  createPrescription,
  fetchPrescriptionsContext,
  timesToInput,
  timesToJson,
  updatePrescription,
  withdrawPrescription,
  type PrescriptionPayload,
} from "../api/prescriptions.api";

/**
 * Route "/registrations/:regId/prescriptions". The prescriptions maintain
 * screen. Full CRUD while a prescription has no administered dose; once one is
 * given the row locks and the only remaining action is withdraw, which is a
 * soft delete, so corrections become withdraw plus re-prescribe rather than a
 * silent edit of something a camper has already been given.
 */

interface Draft {
  medicationName: string;
  dose: string;
  route: string;
  frequency: string;
  times: string;
  startDate: string;
  endDate: string;
  notes: string;
}

const emptyDraft = (defaultStart: string): Draft => ({
  medicationName: "",
  dose: "",
  route: "Oral",
  frequency: "",
  times: "",
  startDate: defaultStart,
  endDate: "",
  notes: "",
});

const fromPrescription = (p: PrescriptionDto): Draft => ({
  medicationName: p.medicationName ?? "",
  dose: p.dose ?? "",
  route: p.route ?? "",
  frequency: p.frequency ?? "",
  times: timesToInput(p.scheduledTimes),
  startDate: p.startDate,
  endDate: p.endDate ?? "",
  notes: p.notes ?? "",
});

const toPayload = (d: Draft): PrescriptionPayload => ({
  medicationName: d.medicationName.trim(),
  dose: d.dose.trim(),
  route: d.route.trim() || null,
  frequency: d.frequency.trim(),
  scheduledTimes: timesToJson(d.times),
  startDate: d.startDate,
  endDate: d.endDate || null,
  notes: d.notes.trim() || null,
});

export function PrescriptionsPage() {
  const { regId = "" } = useParams();
  const queryClient = useQueryClient();
  const me = useMe();
  const canPrescribe = me.data?.role === "medical";
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["prescriptions-context", regId],
    queryFn: () => fetchPrescriptionsContext(regId),
    enabled: Boolean(regId),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["prescriptions-context", regId] });
    void queryClient.invalidateQueries({ queryKey: ["medication-grid", regId] });
    void queryClient.invalidateQueries({ queryKey: ["medication-rounds"] });
  };

  const fail = (e: Error & { response?: { status?: number } }) =>
    setError(
      e.response?.status === 403
        ? "Only the medical team may maintain prescriptions."
        : e.response?.status === 409
          ? "This prescription is locked: a dose has already been administered. Withdraw it and prescribe a correction instead."
          : e.message,
    );

  const save = useMutation({
    mutationFn: ({ id, draft }: { id: string | null; draft: Draft }) =>
      id ? updatePrescription(id, toPayload(draft)) : createPrescription(regId, toPayload(draft)),
    onSuccess: () => {
      setEditing(null);
      setError(null);
      refresh();
    },
    onError: fail,
  });

  const withdraw = useMutation({
    mutationFn: withdrawPrescription,
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: fail,
  });

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading prescriptions…</div>;
  if (isError || !data) {
    return <div className="p-6 text-sm text-danger">Couldn&rsquo;t load prescriptions.</div>;
  }

  const { camper, camp, registration, prescriptions } = data;
  const defaultStart = camp?.startDate ?? new Date().toISOString().slice(0, 10);
  const busy = save.isPending || withdraw.isPending;

  return (
    <div className="mx-auto max-w-[820px]">
      <Breadcrumb
        items={[
          { label: "Campers", to: "/campers" },
          { label: `${camper.firstName} ${camper.surname}`, to: `/campers/${camper.camperId}` },
          { label: "Medication grid", to: `/registrations/${regId}/medications` },
          { label: "Prescriptions" },
        ]}
      />

      <div className="mb-3 border border-card bg-surface">
        <RecordBanner
          title={`${camper.surname.toUpperCase()}, ${camper.firstName}`}
          meta={
            <>
              <span className="mono">{camper.fileNumber}</span>
              {camp ? ` · Camp ${camp.campNumber}, ${camp.venue}` : ""}
              {registration.cabin ? ` · cabin ${registration.cabin}` : ""} &middot; prescriptions
              for this camp
            </>
          }
          actions={
            canPrescribe && editing !== "new" ? (
              <Button
                variant="primary"
                className="h-9 px-3"
                disabled={busy}
                onClick={() => {
                  setEditing("new");
                  setError(null);
                }}
              >
                <Plus size={14} /> New prescription
              </Button>
            ) : undefined
          }
        />
      </div>

      {error && (
        <div className="mb-3 border border-danger bg-danger-tint px-3 py-2 text-sm font-semibold text-danger-text" role="alert">
          {error}
        </div>
      )}

      {editing === "new" && (
        <div className="mb-3">
          <PrescriptionForm
            initial={emptyDraft(defaultStart)}
            saving={save.isPending}
            onSave={(draft) => save.mutate({ id: null, draft })}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {prescriptions.length === 0 && editing !== "new" ? (
        <div className="border border-card bg-surface p-6 text-center text-base text-muted">
          No prescriptions for this camp yet.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {prescriptions.map((p) =>
            editing === p.prescriptionId ? (
              <li key={p.prescriptionId}>
                <PrescriptionForm
                  initial={fromPrescription(p)}
                  saving={save.isPending}
                  onSave={(draft) => save.mutate({ id: p.prescriptionId, draft })}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li
                key={p.prescriptionId}
                className="border border-card bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center bg-accent-tint text-accent">
                        <Pill size={14} />
                      </span>
                      <span className="text-base font-medium text-primary">
                        {p.medicationName}
                      </span>
                      {p.isLocked ? (
                        <span className="inline-flex items-center gap-1 bg-neutral-tint px-2 py-0.5 text-xs font-medium text-neutral">
                          <Lock size={11} /> locked, {p.administeredDoseCount} dose
                          {p.administeredDoseCount === 1 ? "" : "s"} given
                        </span>
                      ) : (
                        <StatusPill tone="warning">editable, no dose given yet</StatusPill>
                      )}
                    </div>
                    <div className="mt-1.5 text-sm text-secondary">
                      {p.dose}
                      {p.route ? `, ${p.route}` : ""} · {p.frequency} ·{" "}
                      {timesToInput(p.scheduledTimes) || "no times set"}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      From {formatDate(p.startDate)}
                      {p.endDate ? ` to ${formatDate(p.endDate)}` : ""} · prescribed by{" "}
                      {p.prescribedByName ?? "-"}
                    </div>
                    {p.notes && (
                      <div className="mt-1 text-sm text-secondary">{p.notes}</div>
                    )}
                  </div>

                  {canPrescribe && (
                    <div className="flex shrink-0 gap-2">
                      {!p.isLocked && (
                        <Button
                          variant="secondary"
                          className="h-8 px-3"
                          disabled={busy}
                          onClick={() => {
                            setEditing(p.prescriptionId);
                            setError(null);
                          }}
                        >
                          <Pencil size={13} /> Edit
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        className="h-8 px-3"
                        disabled={busy}
                        onClick={() => withdraw.mutate(p.prescriptionId)}
                      >
                        <Ban size={13} /> Withdraw
                      </Button>
                    </div>
                  )}
                </div>

                {p.isLocked && (
                  <p className="mt-2.5 border-t border-divider pt-2 text-xs text-muted">
                    A dose has been administered, so this prescription can no longer be
                    edited. Withdraw it and prescribe a correction if it is wrong.
                  </p>
                )}
              </li>
            ),
          )}
        </ul>
      )}

      {!canPrescribe && (
        <p className="mt-3 text-xs text-muted">
          Prescriptions are maintained by the medical team. You have view access.
        </p>
      )}
    </div>
  );
}

function PrescriptionForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: Draft;
  saving: boolean;
  onSave: (draft: Draft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const valid =
    draft.medicationName.trim() &&
    draft.dose.trim() &&
    draft.frequency.trim() &&
    draft.times.trim() &&
    draft.startDate;

  return (
    <div className="border border-accent-border bg-accent-tint/30 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-secondary">
            Medication name
          </span>
          <Input
            value={draft.medicationName}
            onChange={(e) => set({ medicationName: e.target.value })}
            placeholder="e.g. Abacavir/Lamivudine/Dolutegravir (paed)"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-secondary">Dose</span>
          <Input
            value={draft.dose}
            onChange={(e) => set({ dose: e.target.value })}
            placeholder="e.g. 1 tablet"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-secondary">Route</span>
          <Input
            value={draft.route}
            onChange={(e) => set({ route: e.target.value })}
            placeholder="e.g. Oral"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-secondary">Frequency</span>
          <Input
            value={draft.frequency}
            onChange={(e) => set({ frequency: e.target.value })}
            placeholder="e.g. Once daily"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-secondary">
            Times of day
          </span>
          <Input
            value={draft.times}
            onChange={(e) => set({ times: e.target.value })}
            placeholder="07:00, 19:00"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-secondary">Start date</span>
          <Input
            type="date"
            value={draft.startDate}
            onChange={(e) => set({ startDate: e.target.value })}
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-secondary">
            End date (optional)
          </span>
          <Input
            type="date"
            value={draft.endDate}
            onChange={(e) => set({ endDate: e.target.value })}
          />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm font-medium text-secondary">Notes</span>
          <Textarea value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
        </label>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Times of day drive the medication grid. Separate multiple times with commas.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="h-8 px-3" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="h-8 px-3"
            disabled={!valid || saving}
            onClick={() => onSave(draft)}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
