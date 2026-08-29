import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, HeartPulse, Pencil, Plus, Tent, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { isPdfUrl } from "@/lib/storage-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { RecordBanner, TabStrip, SectionHead, FieldGrid, Field } from "@/components/ui/record-chrome";
import { camperBannerFlags } from "../lib/banner";
import { ageYears, formatDate, formatSex } from "@/lib/display";
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
      <Breadcrumb
        items={[
          { label: "Campers", to: "/campers" },
          { label: `${detail.camper.firstName} ${detail.camper.surname}` },
        ]}
      />

      <div className="border border-card bg-surface">
        <ProfileHeader detail={detail} />
        <TabStrip tabs={TABS} active={tab} onChange={setTab} />
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
  const { camper, siblings } = detail;
  const initials = `${camper.firstName[0] ?? ""}${camper.surname[0] ?? ""}`.toUpperCase();
  const flags = camperBannerFlags(detail);

  const media =
    camper.photoUrl && !isPdfUrl(camper.photoUrl) ? (
      <img
        src={camper.photoUrl}
        alt={`${camper.firstName} ${camper.surname}`}
        className="h-12 w-12 shrink-0 object-cover"
      />
    ) : camper.photoUrl ? (
      <a
        href={camper.photoUrl}
        target="_blank"
        rel="noreferrer"
        title="View scanned document"
        className="flex h-12 w-12 shrink-0 items-center justify-center border border-card bg-accent-tint text-accent"
      >
        <FileText size={18} />
      </a>
    ) : (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-card bg-accent-tint text-md font-bold text-accent">
        {initials}
      </span>
    );

  return (
    <RecordBanner
      title={`${camper.surname.toUpperCase()}, ${camper.firstName}`}
      media={media}
      flags={flags}
      meta={
        <>
          <span className="mono">{camper.fileNumber}</span> &middot; {formatSex(camper.sex)} &middot; DOB{" "}
          <span className="mono">{camper.dob}</span> ({ageYears(camper.dob)}y) &middot;{" "}
          {camper.diagnosis ?? "no diagnosis on file"}
          {siblings.map((s) => (
            <span key={s.camperId}>
              {" · "}
              <Link to={`/campers/${s.camperId}`} className="text-accent underline">
                sibling {s.fileNumber}
              </Link>
            </span>
          ))}
        </>
      }
    />
  );
}

function PersonalTab({ detail }: { detail: CamperDetail }) {
  const { camper } = detail;
  return (
    <div className="border border-card bg-surface">
      <SectionHead title="Demographics" hint="From the registration form" />
      <FieldGrid>
        <Field label="Surname" value={camper.surname} />
        <Field label="First name" value={camper.firstName} />
        <Field label="Date of birth" value={formatDate(camper.dob)} mono />
        <Field label="Sex" value={formatSex(camper.sex)} />
        <Field label="Race" value={camper.race} />
        <Field label="Language" value={camper.language} />
        <Field label="T-shirt size" value={camper.tShirtSize} />
        <Field label="Cell number" value={camper.cellNumber} mono />
        <Field label="File number" value={camper.fileNumber} mono />
        <Field label="Treating clinic" value={camper.treatingClinic} />
        <Field label="Address" value={camper.address} full />
      </FieldGrid>
      <div className="flex justify-end border-t border-card bg-page px-4 py-2.5">
        <Link to={`/campers/${camper.camperId}/edit`}>
          <Button variant="secondary" className="h-8 px-3">
            <Pencil size={13} /> Edit personal details
          </Button>
        </Link>
      </div>
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
          <label className="flex items-center gap-1.5 text-sm text-primary">
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
        <div className="rounded-control border border-danger-border bg-danger-tint px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="rounded-card border border-card bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">Caregivers</h2>
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
                <span className="min-w-0 flex-1 text-sm">
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
            <li className="text-sm text-muted">No caregivers on file.</li>
          )}
        </ul>
      </div>

      <div className="rounded-card border border-card bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-primary">Emergency contacts</h2>
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
                <span className="min-w-0 flex-1 text-sm">
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
            <li className="text-sm text-muted">No emergency contacts on file.</li>
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
      <div className="border border-card bg-surface p-6 text-center text-base text-muted">
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
    <div className="border border-card bg-surface">
      <SectionHead
        title="Pre-camp medical"
        hint={
          <>
            {camp ? `${camp.venue}, camp ${camp.campNumber} · ` : ""}
            captured by {latest.capturedByName ?? "-"} on {formatDate(latest.capturedAt)}
          </>
        }
      />
      <FieldGrid>
        <Field label="Diagnosis" value={latest.diagnosis} />
        <Field label="Hospital file no." value={latest.hospitalFileNumber} mono />
        <Field label="Treating contact" value={latest.treatingContact} full />
        <Field
          label="Viral load"
          value={
            latest.viralLoad
              ? `${latest.viralLoad}${latest.vlTestDate ? `, tested ${formatDate(latest.vlTestDate)}` : ""}${latest.vlDateReceived ? `, received ${formatDate(latest.vlDateReceived)}` : ""}`
              : null
          }
        />
        <Field label="TB status" value={latest.tbStatus} />
        <Field
          label="Hepatitis B"
          value={latest.hepatitisB == null ? null : latest.hepatitisB ? "Yes" : "No"}
        />
        <Field
          label="Adherence barriers"
          value={latest.adherenceBarriers ? (latest.adherenceBarriersDetail ?? "Yes") : "None reported"}
        />
        <Field label="Dietary requirements" value={latest.dietaryRequirements} />
        <Field label="Religion" value={latest.religion} />
        <Field label="Current medication" value={meds.length ? meds.join(", ") : null} full />
        <Field label="Clinical findings" value={latest.clinicalFindings} full />
        <Field label="Disclosures" value={latest.additionalInfo} full />
        <Field label="Behavioural history" value={latest.camperHistoryNotes} full />
      </FieldGrid>
      <div className="flex justify-end border-t border-card bg-page px-4 py-2.5">{maintainButton}</div>
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
      <div className="rounded-card border border-card bg-surface p-6 text-center text-base text-muted">
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
              <span className="flex h-9 w-9 items-center justify-center rounded-none bg-accent-tint text-accent">
                <Tent size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium text-primary">
                  {camp ? `Camp ${camp.campNumber}: ${camp.venue}` : "Camp"}
                </span>
                <span className="text-sm text-muted">
                  {camp ? format(parseISO(camp.startDate), "MMMM yyyy") : ""}
                  {reg.cabin ? ` · Cabin ${reg.cabin}` : ""}
                </span>
              </span>
            </Link>
            <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
            <Link
              to={`/registrations/${reg.registrationId}/arrival-check`}
              className="shrink-0 text-sm font-medium text-accent hover:underline"
            >
              {checkLabel}
            </Link>
            <Link
              to={`/registrations/${reg.registrationId}/medications`}
              className="shrink-0 text-sm font-medium text-accent hover:underline"
            >
              Medications
            </Link>
            <Link
              to={`/registrations/${reg.registrationId}/consent`}
              className={
                hasConsent
                  ? "shrink-0 text-sm font-medium text-accent hover:underline"
                  : "shrink-0 text-sm font-medium text-danger hover:underline"
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
