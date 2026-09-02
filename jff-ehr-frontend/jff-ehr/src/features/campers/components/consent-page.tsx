import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, FileCheck, FileText, Plus, ShieldCheck, Upload } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDate } from "@/lib/display";
import { supabase } from "@/lib/supabase";
import { useMe } from "@/features/auth/use-me";
import {
  CONSENT_TYPES,
  consentTypeLabel,
  createConsent,
  fetchConsentContext,
  withdrawConsent,
  type ConsentPayload,
} from "../api/consent.api";

/**
 * Route "/registrations/:regId/consent". Consent capture per registration
 * (spec/forms/01 part 3, brief item 12). The paper form's hard rule is that no
 * child is accepted to camp without a signed indemnity, so this is the
 * acceptance gate the profile and roster surface. Records are append-only:
 * a mistake is withdrawn and re-captured, never edited.
 */

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ConsentPage() {
  const { regId = "" } = useParams();
  const queryClient = useQueryClient();
  const me = useMe();
  const canCapture = me.data?.role === "medical";
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["consent-context", regId],
    queryFn: () => fetchConsentContext(regId),
    enabled: Boolean(regId),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["consent-context", regId] });
    const camperId = data?.camper.camperId;
    if (camperId) {
      void queryClient.invalidateQueries({ queryKey: ["camper-detail", camperId] });
    }
    void queryClient.invalidateQueries({ queryKey: ["camp-hub"] });
  };

  const fail = (e: Error & { response?: { status?: number } }) =>
    setError(
      e.response?.status === 403
        ? "Only the medical team may capture consent."
        : e.response?.status === 409
          ? "The specified registration does not exist."
          : e.message,
    );

  const create = useMutation({
    mutationFn: (payload: ConsentPayload) => createConsent(regId, payload),
    onSuccess: () => {
      setAdding(false);
      setError(null);
      refresh();
    },
    onError: fail,
  });

  const withdraw = useMutation({
    mutationFn: withdrawConsent,
    onSuccess: () => {
      setError(null);
      refresh();
    },
    onError: fail,
  });

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading consent…</div>;
  if (isError || !data) {
    return <div className="p-6 text-sm text-danger">Couldn&rsquo;t load this registration.</div>;
  }

  const { camper, camp, consents } = data;
  const busy = create.isPending || withdraw.isPending;
  const existingTypes = new Set(consents.map((c) => c.consentType));

  return (
    <div className="mx-auto max-w-[760px]">
      <Breadcrumb
        items={[
          { label: "Campers", to: "/campers" },
          { label: `${camper.firstName} ${camper.surname}`, to: `/campers/${camper.camperId}` },
          { label: "Consent and indemnity" },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-medium text-primary">Consent and indemnity</h1>
          <p className="mt-0.5 text-sm text-muted">
            {camper.firstName} {camper.surname} ({camper.fileNumber})
            {camp ? ` · Camp ${camp.campNumber}, ${camp.venue}` : ""}
          </p>
        </div>
        {consents.length > 0 ? (
          <StatusPill tone="success">consent on file</StatusPill>
        ) : (
          <StatusPill tone="danger">no consent</StatusPill>
        )}
      </div>

      {consents.length === 0 && (
        <div className="mb-4 rounded-control border border-danger-border bg-danger-tint px-3 py-2 text-sm text-danger">
          No child is accepted to camp without a signed indemnity. Capture the caregiver&rsquo;s
          consent to clear the acceptance gate.
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-control border border-danger-border bg-danger-tint px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mb-3 space-y-2.5">
        {consents.map((consent) => (
          <div key={consent.consentId} className="border border-card bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center bg-accent-tint text-accent">
                    <FileCheck size={14} />
                  </span>
                  <span className="text-base font-medium text-primary">
                    {consentTypeLabel(consent.consentType)}
                  </span>
                  {consent.popiaAcknowledged && (
                    <span className="inline-flex items-center gap-1 border border-success bg-success-tint px-2 py-0.5 text-xs font-semibold text-success-text">
                      <ShieldCheck size={11} /> POPIA acknowledged
                    </span>
                  )}
                </div>
                <div className="mt-1.5 text-sm text-secondary">
                  Signed by {consent.signedBy}
                  {consent.witnessName ? `, witnessed by ${consent.witnessName}` : ""}
                </div>
                <div className="mt-0.5 text-xs text-muted">
                  {formatDate(consent.signedAt)}
                  {consent.signedLocation ? ` · ${consent.signedLocation}` : ""}
                </div>
                {consent.documentUrl && (
                  <a
                    href={consent.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                  >
                    <FileText size={13} /> Scanned document
                  </a>
                )}
              </div>
              {canCapture && (
                <Button
                  variant="secondary"
                  className="h-8 px-3"
                  disabled={busy}
                  onClick={() => withdraw.mutate(consent.consentId)}
                >
                  <Ban size={13} /> Withdraw
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {canCapture &&
        (adding ? (
          <ConsentForm
            existingTypes={existingTypes}
            saving={create.isPending}
            onSave={(payload) => create.mutate(payload)}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => {
              setAdding(true);
              setError(null);
            }}
          >
            <Plus size={14} /> Capture consent
          </Button>
        ))}

      {!canCapture && (
        <p className="text-xs text-muted">
          Consent is captured by the medical team. You have view access.
        </p>
      )}
    </div>
  );
}

function ConsentForm({
  existingTypes,
  saving,
  onSave,
  onCancel,
}: {
  existingTypes: Set<string | null>;
  saving: boolean;
  onSave: (payload: ConsentPayload) => void;
  onCancel: () => void;
}) {
  const firstUnused = CONSENT_TYPES.find((t) => !existingTypes.has(t.value)) ?? CONSENT_TYPES[0];
  const [consentType, setConsentType] = useState<string>(firstUnused.value);
  const [signedBy, setSignedBy] = useState("");
  const [witnessName, setWitnessName] = useState("");
  const [signedLocation, setSignedLocation] = useState("");
  const [signedAt, setSignedAt] = useState(today);
  const [documentUrl, setDocumentUrl] = useState("");
  const [popiaAcknowledged, setPopiaAcknowledged] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const valid = consentType && signedBy.trim() && signedAt && popiaAcknowledged;

  // Upload a signed PDF (or scanned image) to Supabase Storage and use its URL,
  // so a document can come from the computer, not only a pasted link (C2).
  const uploadDocument = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
      const path = `consent/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("consent-documents")
        .upload(path, file, { contentType: file.type || "application/pdf", upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("consent-documents").getPublicUrl(path);
      setDocumentUrl(data.publicUrl);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <FormSection icon={<FileCheck size={15} />} title="Capture consent">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Consent type" htmlFor="consentType" className="col-span-2">
          <Select
            id="consentType"
            value={consentType}
            onChange={(e) => setConsentType(e.target.value)}
          >
            {CONSENT_TYPES.map((t) => (
              <option key={t.value} value={t.value} disabled={existingTypes.has(t.value)}>
                {t.label}
                {existingTypes.has(t.value) ? " (already on file)" : ""}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Signed by (parent or guardian)" htmlFor="signedBy">
          <Input
            id="signedBy"
            value={signedBy}
            onChange={(e) => setSignedBy(e.target.value)}
            placeholder="Full name"
          />
        </FormField>
        <FormField label="Witness name" htmlFor="witnessName">
          <Input
            id="witnessName"
            value={witnessName}
            onChange={(e) => setWitnessName(e.target.value)}
          />
        </FormField>
        <FormField label="Signed at (location)" htmlFor="signedLocation">
          <Input
            id="signedLocation"
            value={signedLocation}
            onChange={(e) => setSignedLocation(e.target.value)}
            placeholder="e.g. Registration desk"
          />
        </FormField>
        <FormField label="Date signed" htmlFor="signedAt">
          <Input
            id="signedAt"
            type="date"
            value={signedAt}
            onChange={(e) => setSignedAt(e.target.value)}
          />
        </FormField>
        <FormField
          label="Signed document (optional): paste a URL or upload a PDF"
          htmlFor="documentUrl"
          className="col-span-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="documentUrl"
              className="min-w-[200px] flex-1"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="https://… or upload a PDF"
            />
            <label className="inline-flex h-[38px] cursor-pointer items-center gap-1.5 rounded-control border border-field-border bg-field px-3 text-sm font-medium text-secondary transition hover:text-primary">
              <Upload size={14} />
              {uploading ? "Uploading…" : "Upload PDF"}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadDocument(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {uploadError && (
            <p className="mt-1 text-xs text-danger">{uploadError}</p>
          )}
          {documentUrl && !uploadError && (
            <a
              href={documentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs text-accent hover:underline"
            >
              View attached document
            </a>
          )}
        </FormField>
      </div>

      <label className="mt-3 flex items-start gap-2 text-sm text-primary">
        <input
          type="checkbox"
          className="mt-0.5 accent-accent"
          checked={popiaAcknowledged}
          onChange={(e) => setPopiaAcknowledged(e.target.checked)}
        />
        <span>
          POPIA acknowledged: the caregiver consents to JFF storing and processing this
          child&rsquo;s personal and medical information for camp care.
        </span>
      </label>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Consent is filed once and never edited. Corrections are a withdrawal and a fresh
          record.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="h-8 px-3" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="h-8 px-3"
            disabled={!valid || saving}
            onClick={() =>
              onSave({
                consentType,
                signedBy: signedBy.trim(),
                witnessName: witnessName.trim() || null,
                signedAt: new Date(`${signedAt}T12:00:00`).toISOString(),
                signedLocation: signedLocation.trim() || null,
                documentUrl: documentUrl.trim() || null,
                popiaAcknowledged,
              })
            }
          >
            {saving ? "Filing…" : "File consent"}
          </Button>
        </div>
      </div>
    </FormSection>
  );
}
