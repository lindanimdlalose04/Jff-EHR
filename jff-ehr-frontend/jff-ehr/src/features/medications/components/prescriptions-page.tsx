import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Lock, Pencil, Pill, Plus } from "lucide-react";
import type { PrescriptionDto } from "@/api/types";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { RecordBanner, SectionHead, thClass, tdClass } from "@/components/ui/record-chrome";
import { Input, Select, Textarea } from "@/components/ui/field";
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
  const [bulk, setBulk] = useState(false);
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

  // Created one at a time rather than in a single request: there is no bulk
  // endpoint, and doing them in sequence means a failure half way through
  // still leaves the successful ones in place and reports what happened.
  const saveBulk = useMutation({
    mutationFn: async (drafts: Draft[]) => {
      let created = 0;
      for (const draft of drafts) {
        await createPrescription(regId, toPayload(draft));
        created += 1;
      }
      return created;
    },
    onSuccess: () => {
      setBulk(false);
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
  const busy = save.isPending || withdraw.isPending || saveBulk.isPending;

  // Medications the caregiver declared that are not prescribed yet.
  const declaredMeds: string[] = (() => {
    if (!data.precamp?.medicationList) return [];
    let names: string[] = [];
    try {
      const parsed: unknown = JSON.parse(data.precamp.medicationList);
      if (Array.isArray(parsed)) names = parsed.map(String);
    } catch {
      return [];
    }
    const already = new Set(
      prescriptions.map((p) => (p.medicationName ?? "").trim().toLowerCase()),
    );
    return names
      .map((n) => n.trim())
      .filter((n) => n && !already.has(n.toLowerCase()));
  })();

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

      {bulk && declaredMeds.length > 0 && (
        <BulkSetup
          declared={declaredMeds}
          defaultStart={defaultStart}
          saving={saveBulk.isPending}
          onSave={(drafts) => saveBulk.mutate(drafts)}
          onCancel={() => setBulk(false)}
        />
      )}

      {/* The caregiver declared medications that are not on the grid yet. */}
      {!bulk && declaredMeds.length > 0 && canPrescribe && editing === null && (
        <div className="mb-3 flex flex-wrap items-center gap-3 border border-warning bg-warning-tint px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-warning-text">
              {declaredMeds.length} declared medication
              {declaredMeds.length === 1 ? "" : "s"} not prescribed yet
            </p>
            <p className="mt-0.5 text-sm text-secondary">
              The caregiver&rsquo;s pre-camp form lists {declaredMeds.join(", ")}. Set{" "}
              {declaredMeds.length === 1 ? "it" : "them"} up in one pass instead of adding each
              one separately.
            </p>
          </div>
          <Button variant="primary" className="h-9 px-3" onClick={() => setBulk(true)}>
            <Plus size={14} /> Set up from pre-camp list
          </Button>
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

/**
 * Frequency presets and the times they imply. The caregiver's form gives the
 * medication names only (form 01 part 2, "current medication list, numbered,
 * up to 4"); dose and schedule are the nurse's to set. Choosing a frequency
 * fills the times so the common cases need no typing at all.
 */
const FREQUENCY_PRESETS: { label: string; frequency: string; times: string }[] = [
  { label: "Once daily", frequency: "Once daily", times: "08:00" },
  { label: "Twice daily", frequency: "Twice daily", times: "08:00, 20:00" },
  { label: "Three times daily", frequency: "Three times daily", times: "08:00, 14:00, 20:00" },
  { label: "Four times daily", frequency: "Four times daily", times: "06:00, 12:00, 18:00, 22:00" },
  { label: "At night", frequency: "At night", times: "20:00" },
];

interface BulkRow extends Draft {
  include: boolean;
  /** True when the name came from the caregiver's declared list. */
  fromPrecamp: boolean;
}

/**
 * Sets up the whole medication grid from the pre-camp list in one pass.
 *
 * Without this the declared medications are captured and then thrown away: the
 * nurse reads the names off the pre-camp record and retypes each one as a
 * separate prescription. Here every declared medication arrives pre-named, and
 * only dose and frequency are left to enter. Names already prescribed are
 * dropped so nothing is created twice, and a blank row covers anything the
 * caregiver did not declare.
 */
function BulkSetup({
  declared,
  defaultStart,
  saving,
  onSave,
  onCancel,
}: {
  declared: string[];
  defaultStart: string;
  saving: boolean;
  onSave: (drafts: Draft[]) => void;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<BulkRow[]>(() =>
    declared.map((name) => ({
      ...emptyDraft(defaultStart),
      medicationName: name,
      include: true,
      fromPrecamp: true,
    })),
  );

  const setRow = (i: number, patch: Partial<BulkRow>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const applyPreset = (i: number, label: string) => {
    const preset = FREQUENCY_PRESETS.find((p) => p.label === label);
    if (preset) setRow(i, { frequency: preset.frequency, times: preset.times });
  };

  const chosen = rows.filter((r) => r.include && r.medicationName.trim());
  const incomplete = chosen.filter((r) => !r.dose.trim() || !r.times.trim());
  const canSave = chosen.length > 0 && incomplete.length === 0;

  return (
    <div className="mb-3 border border-card bg-surface">
      <SectionHead
        title="Set up from the pre-camp list"
        hint={`${declared.length} medication${declared.length === 1 ? "" : "s"} declared by the caregiver`}
      />

      <div className="border-b border-divider bg-header-tint px-4 py-2 text-sm text-secondary">
        Each medication the caregiver declared is listed below with its name already filled in.
        Add the dose and pick a frequency, and the times fill themselves. Everything you tick is
        created at once.
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-base">
          <thead>
            <tr>
              <th className={`${thClass} w-[42px]`} />
              <th className={thClass}>Medication</th>
              <th className={thClass}>Dose</th>
              <th className={thClass}>Frequency</th>
              <th className={thClass}>Times</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={row.include ? "" : "opacity-45"}>
                <td className={`${tdClass} text-center`}>
                  <input
                    type="checkbox"
                    aria-label={`Include ${row.medicationName || "this row"}`}
                    checked={row.include}
                    onChange={(e) => setRow(i, { include: e.target.checked })}
                    className="h-4 w-4 accent-[hsl(var(--accent))]"
                  />
                </td>
                <td className={tdClass}>
                  <Input
                    aria-label="Medication name"
                    className="h-9"
                    value={row.medicationName}
                    onChange={(e) => setRow(i, { medicationName: e.target.value })}
                    placeholder="Medication"
                  />
                  {row.fromPrecamp && (
                    <span className="mt-0.5 block text-xs text-muted">from the pre-camp list</span>
                  )}
                </td>
                <td className={tdClass}>
                  <Input
                    aria-label="Dose"
                    className="h-9 min-w-[110px]"
                    value={row.dose}
                    onChange={(e) => setRow(i, { dose: e.target.value })}
                    placeholder="e.g. 50 mg"
                  />
                </td>
                <td className={tdClass}>
                  <Select
                    aria-label="Frequency"
                    className="h-9 min-w-[150px]"
                    value={FREQUENCY_PRESETS.find((p) => p.frequency === row.frequency)?.label ?? ""}
                    onChange={(e) => applyPreset(i, e.target.value)}
                  >
                    <option value="">Choose…</option>
                    {FREQUENCY_PRESETS.map((p) => (
                      <option key={p.label} value={p.label}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className={tdClass}>
                  <Input
                    aria-label="Times"
                    className="mono h-9 min-w-[140px]"
                    value={row.times}
                    onChange={(e) => setRow(i, { times: e.target.value })}
                    placeholder="08:00, 20:00"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-divider px-4 py-2.5">
        <Button
          variant="secondary"
          className="h-8 px-3"
          disabled={saving}
          onClick={() =>
            setRows((rs) => [
              ...rs,
              { ...emptyDraft(defaultStart), include: true, fromPrecamp: false },
            ])
          }
        >
          <Plus size={13} /> Add another medication
        </Button>
        <span className="flex-1" />
        {incomplete.length > 0 && (
          <span className="text-sm text-warning-text">
            {incomplete.length} row{incomplete.length === 1 ? "" : "s"} still need a dose and times
          </span>
        )}
        <Button variant="secondary" className="h-8 px-3" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          className="h-8 px-3"
          disabled={!canSave || saving}
          onClick={() => onSave(chosen.map(({ include, fromPrecamp, ...d }) => d))}
        >
          {saving
            ? "Creating…"
            : `Create ${chosen.length} prescription${chosen.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}
