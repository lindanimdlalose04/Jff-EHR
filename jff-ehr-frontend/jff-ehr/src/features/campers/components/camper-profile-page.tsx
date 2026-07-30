import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, HeartPulse, Pencil, Plus, Tent, TriangleAlert, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { ageYears, formatDate } from "@/lib/display";
import { deriveCampState } from "@/lib/camp-state";
import { useCamperDetail } from "../hooks/use-camper-detail";
import type { CamperDetail } from "../api/camper-detail.api";
import {
  createCaregiver,
  createEmergencyContact,
  deleteCaregiver,
  deleteEmergencyContact,
  updateCaregiver,
  updateEmergencyContact,
  type CaregiverPayload,
} from "../api/campers-crud.api";

/**
 * Route "/campers/:camperId". The camper profile: the persistent record of a
 * child across camps (spec/wireframes/01_camper_profile.md). Header + four
 * tabs: Personal, Caregivers (inline Tier 1 rows), Medical background (from
 * pre-camp medical), Camp history (the longitudinal thread).
 */

const TABS = ["Personal", "Caregivers", "Medical background", "Camp history"] as const;
type Tab = (typeof TABS)[number];

const TAB_PARAMS: Record<string, Tab> = {
  personal: "Personal",
  caregivers: "Caregivers",
  medical: "Medical background",
  history: "Camp history",
};

export function CamperProfilePage() {
  const { camperId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const { data: detail, isLoading, isError } = useCamperDetail(camperId);
  const [tab, setTab] = useState<Tab>(
    TAB_PARAMS[searchParams.get("tab") ?? ""] ?? "Personal",
  );

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading camper…</div>;
  if (isError || !detail) {
    return (
      <div className="p-6 text-sm text-danger">
        Couldn&rsquo;t load this camper. Refresh to try again.
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/campers"
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-secondary hover:text-primary"
      >
        <ArrowLeft size={14} /> Campers
      </Link>

      <ProfileHeader detail={detail} />

      <div className="mt-4 flex gap-1 border-b border-card">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "border-b-2 border-accent px-3 py-2 text-[13px] font-medium text-accent"
                : "border-b-2 border-transparent px-3 py-2 text-[13px] font-medium text-secondary hover:text-primary"
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {tab === "Personal" && <PersonalTab detail={detail} />}
        {tab === "Caregivers" && <CaregiversTab detail={detail} />}
        {tab === "Medical background" && <MedicalTab detail={detail} />}
        {tab === "Camp history" && <CampHistoryTab detail={detail} />}
      </div>
    </div>
  );
}

function ProfileHeader({ detail }: { detail: CamperDetail }) {
  const { camper, siblings, consents } = detail;
  const initials = `${camper.firstName[0] ?? ""}${camper.surname[0] ?? ""}`.toUpperCase();
  const hasConsent = consents.length > 0;

  return (
    <div className="flex items-start gap-4 rounded-card border border-card bg-surface p-5">
      {camper.photoUrl ? (
        <img
          src={camper.photoUrl}
          alt={`${camper.firstName} ${camper.surname}`}
          className="h-14 w-14 rounded-[12px] object-cover"
        />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] bg-accent-tint text-[17px] font-semibold text-accent">
          {initials}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[17px] font-semibold text-primary">
            {camper.firstName} {camper.surname}
          </h1>
          <StatusPill tone="neutral">{camper.fileNumber}</StatusPill>
        </div>
        <p className="mt-0.5 text-[12.5px] text-secondary">
          {camper.diagnosis ?? "No diagnosis on file"} · {ageYears(camper.dob)} years
          {siblings.map((s) => (
            <span key={s.camperId}>
              {" · "}
              <Link to={`/campers/${s.camperId}`} className="text-accent hover:underline">
                linked to {s.fileNumber} (sibling)
              </Link>
            </span>
          ))}
        </p>
      </div>

      {hasConsent ? (
        <StatusPill tone="neutral">consent on file</StatusPill>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-danger-tint px-2.5 py-1 text-[11.5px] font-medium text-danger">
          <TriangleAlert size={12} /> consent missing
        </span>
      )}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3 border-b border-divider py-2 text-[12.5px] last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-primary">{value || "-"}</dd>
    </div>
  );
}

function PersonalTab({ detail }: { detail: CamperDetail }) {
  const { camper } = detail;
  return (
    <div className="rounded-card border border-card bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12px] text-muted">Personal information, from registration form</p>
        <Link to={`/campers/${camper.camperId}/edit`}>
          <Button variant="secondary" className="h-8 px-3">
            <Pencil size={13} /> Edit
          </Button>
        </Link>
      </div>
      <dl>
        <FieldRow label="Date of birth" value={formatDate(camper.dob)} />
        <FieldRow label="Sex" value={camper.sex === "M" ? "Male" : "Female"} />
        <FieldRow label="Race" value={camper.race} />
        <FieldRow label="Language" value={camper.language} />
        <FieldRow label="T-shirt size" value={camper.tShirtSize} />
        <FieldRow label="Address" value={camper.address} />
        <FieldRow label="Cell number" value={camper.cellNumber} />
        <FieldRow label="Treating clinic" value={camper.treatingClinic} />
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Caregivers tab: inline Tier 1 rows for caregivers and emergency contacts.
// ---------------------------------------------------------------------------

interface ContactDraft {
  name: string;
  cellNo: string;
  workNo: string;
  relationship: string;
  isPrimary: boolean;
}

const emptyDraft: ContactDraft = { name: "", cellNo: "", workNo: "", relationship: "", isPrimary: false };

function ContactRowForm({
  initial,
  withPrimary,
  saving,
  onSave,
  onCancel,
}: {
  initial: ContactDraft;
  withPrimary: boolean;
  saving: boolean;
  onSave: (draft: ContactDraft) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const set = (patch: Partial<ContactDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const valid = draft.name.trim() && draft.cellNo.trim() && draft.relationship.trim();

  return (
    <div className="rounded-control border border-accent-border bg-accent-tint/40 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input placeholder="Full name" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        <Input placeholder="Relationship (e.g. Mother)" value={draft.relationship} onChange={(e) => set({ relationship: e.target.value })} />
        <Input placeholder="Cell number" value={draft.cellNo} onChange={(e) => set({ cellNo: e.target.value })} />
        <Input placeholder="Work number (optional)" value={draft.workNo} onChange={(e) => set({ workNo: e.target.value })} />
      </div>
      <div className="mt-2 flex items-center justify-between">
        {withPrimary ? (
          <label className="flex items-center gap-1.5 text-[12.5px] text-primary">
            <input
              type="checkbox"
              className="accent-accent"
              checked={draft.isPrimary}
              onChange={(e) => set({ isPrimary: e.target.checked })}
            />
            Primary caregiver
          </label>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="secondary" className="h-8 px-3" onClick={onCancel} disabled={saving}>
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

function CaregiversTab({ detail }: { detail: CamperDetail }) {
  const camperId = detail.camper.camperId;
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["camper-detail", camperId] });

  const [editing, setEditing] = useState<string | null>(null); // row id or "new-caregiver" / "new-contact"
  const [error, setError] = useState<string | null>(null);

  const fail = (e: unknown) =>
    setError(e instanceof Error ? e.message : "The change could not be saved.");

  const saveCaregiver = useMutation({
    mutationFn: ({ id, draft }: { id: string | null; draft: ContactDraft }) => {
      const payload: CaregiverPayload = {
        name: draft.name.trim(),
        cellNo: draft.cellNo.trim(),
        workNo: draft.workNo.trim() || null,
        relationship: draft.relationship.trim(),
        isPrimary: draft.isPrimary,
      };
      return id ? updateCaregiver(id, payload) : createCaregiver(camperId, payload);
    },
    onSuccess: () => { setEditing(null); setError(null); void refresh(); },
    onError: fail,
  });

  const removeCaregiver = useMutation({
    mutationFn: deleteCaregiver,
    onSuccess: () => { setError(null); void refresh(); },
    onError: fail,
  });

  const saveContact = useMutation({
    mutationFn: ({ id, draft }: { id: string | null; draft: ContactDraft }) => {
      const payload = {
        name: draft.name.trim(),
        cellNo: draft.cellNo.trim(),
        workNo: draft.workNo.trim() || null,
        relationship: draft.relationship.trim(),
      };
      return id ? updateEmergencyContact(id, payload) : createEmergencyContact(camperId, payload);
    },
    onSuccess: () => { setEditing(null); setError(null); void refresh(); },
    onError: fail,
  });

  const removeContact = useMutation({
    mutationFn: deleteEmergencyContact,
    onSuccess: () => { setError(null); void refresh(); },
    onError: fail,
  });

  const busy =
    saveCaregiver.isPending || removeCaregiver.isPending ||
    saveContact.isPending || removeContact.isPending;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-control border border-danger-border bg-danger-tint px-3 py-2 text-[12.5px] text-danger">
          {error}
        </div>
      )}

      <div className="rounded-card border border-card bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-primary">Caregivers</h2>
          <Button
            variant="secondary"
            className="h-8 px-3"
            onClick={() => { setEditing("new-caregiver"); setError(null); }}
            disabled={busy}
          >
            <Plus size={13} /> Add caregiver
          </Button>
        </div>
        <ul className="space-y-2">
          {detail.caregivers.map((cg) =>
            editing === cg.caregiverId ? (
              <li key={cg.caregiverId}>
                <ContactRowForm
                  initial={{
                    name: cg.name, cellNo: cg.cellNo, workNo: cg.workNo ?? "",
                    relationship: cg.relationship, isPrimary: cg.isPrimary,
                  }}
                  withPrimary
                  saving={saveCaregiver.isPending}
                  onSave={(draft) => saveCaregiver.mutate({ id: cg.caregiverId, draft })}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={cg.caregiverId} className="flex items-center gap-2 rounded-control border border-divider px-3 py-2">
                <span className="min-w-0 flex-1 text-[12.5px]">
                  <span className="flex items-center gap-1.5 font-medium text-primary">
                    {cg.name}
                    {cg.isPrimary && <StatusPill tone="success">primary</StatusPill>}
                  </span>
                  <span className="text-muted">
                    {cg.relationship} · {cg.cellNo}
                    {cg.workNo ? ` · work ${cg.workNo}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Edit ${cg.name}`}
                  className="rounded p-1.5 text-secondary hover:bg-field hover:text-primary"
                  onClick={() => { setEditing(cg.caregiverId); setError(null); }}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${cg.name}`}
                  className="rounded p-1.5 text-secondary hover:bg-danger-tint hover:text-danger"
                  onClick={() => removeCaregiver.mutate(cg.caregiverId)}
                  disabled={busy}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ),
          )}
          {editing === "new-caregiver" && (
            <li>
              <ContactRowForm
                initial={emptyDraft}
                withPrimary
                saving={saveCaregiver.isPending}
                onSave={(draft) => saveCaregiver.mutate({ id: null, draft })}
                onCancel={() => setEditing(null)}
              />
            </li>
          )}
          {detail.caregivers.length === 0 && editing !== "new-caregiver" && (
            <li className="text-[12.5px] text-muted">No caregivers on file.</li>
          )}
        </ul>
      </div>

      <div className="rounded-card border border-card bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold text-primary">Emergency contacts</h2>
          <Button
            variant="secondary"
            className="h-8 px-3"
            onClick={() => { setEditing("new-contact"); setError(null); }}
            disabled={busy}
          >
            <Plus size={13} /> Add contact
          </Button>
        </div>
        <ul className="space-y-2">
          {detail.emergencyContacts.map((ec) =>
            editing === ec.contactId ? (
              <li key={ec.contactId}>
                <ContactRowForm
                  initial={{
                    name: ec.name, cellNo: ec.cellNo, workNo: ec.workNo ?? "",
                    relationship: ec.relationship, isPrimary: false,
                  }}
                  withPrimary={false}
                  saving={saveContact.isPending}
                  onSave={(draft) => saveContact.mutate({ id: ec.contactId, draft })}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={ec.contactId} className="flex items-center gap-2 rounded-control border border-divider px-3 py-2">
                <span className="min-w-0 flex-1 text-[12.5px]">
                  <span className="block font-medium text-primary">{ec.name}</span>
                  <span className="text-muted">
                    {ec.relationship} · {ec.cellNo}
                    {ec.workNo ? ` · work ${ec.workNo}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Edit ${ec.name}`}
                  className="rounded p-1.5 text-secondary hover:bg-field hover:text-primary"
                  onClick={() => { setEditing(ec.contactId); setError(null); }}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${ec.name}`}
                  className="rounded p-1.5 text-secondary hover:bg-danger-tint hover:text-danger"
                  onClick={() => removeContact.mutate(ec.contactId)}
                  disabled={busy}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ),
          )}
          {editing === "new-contact" && (
            <li>
              <ContactRowForm
                initial={emptyDraft}
                withPrimary={false}
                saving={saveContact.isPending}
                onSave={(draft) => saveContact.mutate({ id: null, draft })}
                onCancel={() => setEditing(null)}
              />
            </li>
          )}
          {detail.emergencyContacts.length === 0 && editing !== "new-contact" && (
            <li className="text-[12.5px] text-muted">No emergency contacts on file.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function MedicalTab({ detail }: { detail: CamperDetail }) {
  const latest = [...detail.precampMedicals].sort((a, b) =>
    b.capturedAt.localeCompare(a.capturedAt),
  )[0];

  // The maintain action targets the camper's most recent registration
  // (by camp start date): that is the cycle Gail is preparing for.
  const latestReg = [...detail.registrations].sort((a, b) => {
    const campA = detail.camps.find((c) => c.campId === a.campId);
    const campB = detail.camps.find((c) => c.campId === b.campId);
    return (campB?.startDate ?? "").localeCompare(campA?.startDate ?? "");
  })[0];
  const latestRegPrecamp = latestReg
    ? detail.precampMedicals.find((p) => p.registrationId === latestReg.registrationId)
    : undefined;

  const maintainButton = latestReg && (
    <Link to={`/registrations/${latestReg.registrationId}/precamp`}>
      <Button variant="secondary" className="h-8 px-3">
        {latestRegPrecamp ? (
          <>
            <Pencil size={13} /> Edit
          </>
        ) : (
          <>
            <HeartPulse size={13} /> Capture pre-camp medical
          </>
        )}
      </Button>
    </Link>
  );

  if (!latest) {
    return (
      <div className="rounded-card border border-card bg-surface p-6 text-center text-[13px] text-muted">
        <p>
          No pre-camp medical information on file yet. It is captured from the
          caregiver&rsquo;s registration pack before each camp.
        </p>
        {latestReg && <div className="mt-3 flex justify-center">{maintainButton}</div>}
      </div>
    );
  }

  const reg = detail.registrations.find((r) => r.registrationId === latest.registrationId);
  const camp = reg ? detail.camps.find((c) => c.campId === reg.campId) : undefined;
  const meds = latest.medicationList ? (JSON.parse(latest.medicationList) as string[]) : [];

  return (
    <div className="rounded-card border border-card bg-surface p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-[12px] text-muted">
          From the caregiver&rsquo;s pre-camp medical form
          {camp ? `, ${camp.venue} (Camp ${camp.campNumber})` : ""}. Captured by{" "}
          {latest.capturedByName ?? "-"} on {formatDate(latest.capturedAt)}.
        </p>
        {maintainButton}
      </div>
      <dl>
        <FieldRow label="Diagnosis (this cycle)" value={latest.diagnosis} />
        <FieldRow label="Treating clinic / contact" value={latest.treatingContact} />
        <FieldRow label="Hospital file number" value={latest.hospitalFileNumber} />
        <FieldRow
          label="Viral load"
          value={
            latest.viralLoad
              ? `${latest.viralLoad}${latest.vlTestDate ? `, tested ${formatDate(latest.vlTestDate)}` : ""}${latest.vlDateReceived ? `, received ${formatDate(latest.vlDateReceived)}` : ""}`
              : null
          }
        />
        <FieldRow label="TB status" value={latest.tbStatus} />
        <FieldRow
          label="Hepatitis B"
          value={latest.hepatitisB == null ? null : latest.hepatitisB ? "Yes" : "No"}
        />
        <FieldRow
          label="Adherence barriers"
          value={latest.adherenceBarriers ? (latest.adherenceBarriersDetail ?? "Yes") : "None reported"}
        />
        <FieldRow label="Current medication" value={meds.length ? meds.join(", ") : null} />
        <FieldRow label="Dietary requirements" value={latest.dietaryRequirements} />
        <FieldRow label="Religion" value={latest.religion} />
        <FieldRow label="Disclosures" value={latest.additionalInfo} />
        <FieldRow label="Behavioural / psychosocial history" value={latest.camperHistoryNotes} />
        <FieldRow label="Clinical findings" value={latest.clinicalFindings} />
      </dl>
    </div>
  );
}

function CampHistoryTab({ detail }: { detail: CamperDetail }) {
  const now = new Date();
  const rows = [...detail.registrations]
    .map((reg) => {
      const camp = detail.camps.find((c) => c.campId === reg.campId);
      const check = detail.arrivalChecks.find((a) => a.registrationId === reg.registrationId);
      const hasConsent = detail.consents.some((c) => c.registrationId === reg.registrationId);
      return { reg, camp, check, hasConsent };
    })
    .sort((a, b) => (b.camp?.startDate ?? "").localeCompare(a.camp?.startDate ?? ""));

  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-card bg-surface p-6 text-center text-[13px] text-muted">
        Not registered on any camp yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-card bg-surface">
      {rows.map(({ reg, camp, check, hasConsent }) => {
        const pill = check
          ? check.status === "signed"
            ? { tone: "success" as const, label: "assessed" }
            : { tone: "warning" as const, label: "draft" }
          : camp && deriveCampState(camp, now) === "completed"
            ? { tone: "neutral" as const, label: "completed" }
            : { tone: "warning" as const, label: "not assessed" };
        const checkLabel = check
          ? check.status === "signed"
            ? "View arrival check"
            : "Continue arrival check"
          : "Start arrival check";
        return (
          <div
            key={reg.registrationId}
            className="flex items-center gap-3 border-b border-divider px-4 py-3 last:border-b-0"
          >
            <Link
              to={camp ? `/camps/${camp.campId}` : "#"}
              className="flex min-w-0 flex-1 items-center gap-3 transition hover:opacity-80"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-accent-tint text-accent">
                <Tent size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-primary">
                  {camp ? `Camp ${camp.campNumber}: ${camp.venue}` : "Camp"}
                </span>
                <span className="text-[12px] text-muted">
                  {camp ? format(parseISO(camp.startDate), "MMMM yyyy") : ""}
                  {reg.cabin ? ` · Cabin ${reg.cabin}` : ""}
                </span>
              </span>
            </Link>
            <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
            <Link
              to={`/registrations/${reg.registrationId}/arrival-check`}
              className="shrink-0 text-[12px] font-medium text-accent hover:underline"
            >
              {checkLabel}
            </Link>
            <Link
              to={`/registrations/${reg.registrationId}/medications`}
              className="shrink-0 text-[12px] font-medium text-accent hover:underline"
            >
              Medications
            </Link>
            <Link
              to={`/registrations/${reg.registrationId}/consent`}
              className={
                hasConsent
                  ? "shrink-0 text-[12px] font-medium text-accent hover:underline"
                  : "shrink-0 text-[12px] font-medium text-danger hover:underline"
              }
            >
              {hasConsent ? "Consent" : "No consent"}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
