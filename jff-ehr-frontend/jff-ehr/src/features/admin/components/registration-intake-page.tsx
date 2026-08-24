import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, FileUp, Info, ShieldCheck, Upload } from "lucide-react";
import type { ConfirmRegistrationRequest, ImportResultDto, PendingRegistrationDto } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { useMe } from "@/features/auth/use-me";
import {
  confirmRegistration,
  discardRegistration,
  fetchPendingRegistrations,
  importRegistrationsCsv,
} from "../api/intake.api";

const PENDING_KEY = ["intake-pending"];
const TSHIRT_OPTIONS = ["5-6", "7-8", "9-10", "11-12", "13-14", "S", "M", "L", "XL"];

/**
 * Route "/admin/intake", admin-only at both layers (the component refuses to
 * render for non-admins and does not fetch; the API returns 403 without the
 * admin role). Imports the public intake form's CSV export into a staging area,
 * lets the administrator review and correct each row, and promotes confirmed
 * rows into real campers. Medical (Part 2) and the signature (Part 3) are never
 * captured here; see spec/forms/08_public_registration_intake.md.
 */
export function RegistrationIntakePage() {
  const me = useMe();
  const isAdmin = me.data?.role === "admin";
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [lastImport, setLastImport] = useState<ImportResultDto | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const pending = useQuery({
    queryKey: PENDING_KEY,
    queryFn: fetchPendingRegistrations,
    enabled: isAdmin,
  });

  const doImport = useMutation({
    mutationFn: importRegistrationsCsv,
    onSuccess: (result) => {
      setImportError(null);
      setLastImport(result);
      if (fileInput.current) fileInput.current.value = "";
      void queryClient.invalidateQueries({ queryKey: PENDING_KEY });
    },
    onError: (e: Error & { response?: { status?: number; data?: unknown } }) =>
      setImportError(
        typeof e.response?.data === "string" && e.response.data
          ? e.response.data
          : "Could not import that file. Check it is the CSV export of the intake form.",
      ),
  });

  if (me.isLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="rounded-card border border-card bg-surface px-6 py-12 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-admin-tint text-admin">
          <ShieldCheck size={20} />
        </span>
        <h1 className="mt-3 text-[14px] font-medium text-primary">Admin access required</h1>
        <p className="mx-auto mt-1 max-w-[380px] text-[12.5px] text-muted">
          Your account has the medical role. Registration intake is limited to administrators.
        </p>
      </div>
    );
  }

  const rows = pending.data ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-[17px] font-semibold text-primary">Registration intake</h1>
        <StatusPill tone="neutral">{rows.length} to review</StatusPill>
      </div>

      {/* Import control */}
      <div className="rounded-card border border-card bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-control border border-field-border bg-field px-3 text-[12.5px] font-medium text-secondary hover:text-primary">
            <FileUp size={15} />
            Choose CSV file
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) doImport.mutate(file);
              }}
            />
          </label>
          {doImport.isPending && <span className="text-[12.5px] text-muted">Importing…</span>}
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] text-muted">
            <Upload size={13} /> Export the intake form responses as CSV, then import here
          </span>
        </div>

        {importError && (
          <div className="mt-3 rounded-control border border-danger-border bg-danger-tint px-3 py-2 text-[12.5px] text-danger">
            {importError}
          </div>
        )}

        {lastImport && !importError && (
          <div className="mt-3 rounded-control border border-card bg-header-tint px-3 py-2 text-[12.5px] text-secondary">
            Imported <strong className="text-primary">{lastImport.rowsImported}</strong> row
            {lastImport.rowsImported === 1 ? "" : "s"}
            {lastImport.possibleDuplicates > 0 &&
              `, ${lastImport.possibleDuplicates} possible duplicate${lastImport.possibleDuplicates === 1 ? "" : "s"}`}
            {lastImport.rowsWithNotes > 0 &&
              `, ${lastImport.rowsWithNotes} needing a date fix`}
            . Review them below.
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-card border border-card bg-surface p-4 text-[12.5px] text-secondary">
        <Info size={16} className="mt-0.5 shrink-0 text-muted" />
        <div>
          <p className="font-medium text-primary">What this does</p>
          <p className="mt-1 text-muted">
            Each imported row is a draft only. Confirming a row creates the camper, primary
            caregiver and emergency contact. It does not register the child to a camp and captures
            no medical detail or signature; those stay in the clinical screens. A returning child
            is flagged as a possible duplicate so they are not created twice.
          </p>
        </div>
      </div>

      {/* Review queue */}
      <div className="mt-4">
        {pending.isLoading && <div className="p-6 text-sm text-muted">Loading drafts…</div>}
        {pending.isError && (
          <div className="p-6 text-sm text-danger">Couldn&rsquo;t load drafts. Refresh to try again.</div>
        )}
        {!pending.isLoading && !pending.isError && rows.length === 0 && (
          <div className="rounded-card border border-card bg-surface px-6 py-10 text-center text-[12.5px] text-muted">
            No drafts to review. Import a CSV to get started.
          </div>
        )}
        <div className="space-y-3">
          {rows.map((row) => (
            <PendingRow key={row.pendingRegistrationId} row={row} />
          ))}
        </div>
      </div>
    </div>
  );
}

function toForm(row: PendingRegistrationDto): ConfirmRegistrationRequest {
  return {
    firstName: row.firstName,
    surname: row.surname,
    dob: row.dob ?? "",
    sex: row.sex ?? "",
    race: row.race,
    address: row.address,
    cellNumber: row.cellNumber,
    language: row.language,
    tShirtSize: row.tShirtSize,
    fileNumber: null,
    caregiverName: row.caregiverName ?? "",
    caregiverCellNo: row.caregiverCellNo ?? "",
    caregiverWorkNo: row.caregiverWorkNo,
    caregiverRelationship: "Parent / caregiver",
    emergencyName: row.emergencyName ?? "",
    emergencyCellNo: row.emergencyCellNo ?? "",
    emergencyWorkNo: row.emergencyWorkNo,
    emergencyRelationship: row.emergencyRelationship ?? "",
    confirmDespiteDuplicate: false,
  };
}

function PendingRow({ row }: { row: PendingRegistrationDto }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ConfirmRegistrationRequest>(() => toForm(row));
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof ConfirmRegistrationRequest>(key: K, value: ConfirmRegistrationRequest[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: PENDING_KEY });

  const confirm = useMutation({
    mutationFn: () => confirmRegistration(row.pendingRegistrationId, form),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (e: Error & { response?: { status?: number; data?: unknown } }) => {
      if (e.response?.status === 409 && !form.confirmDespiteDuplicate) {
        setError(
          typeof e.response.data === "string"
            ? e.response.data
            : "This looks like an existing camper. Tick confirm anyway to override.",
        );
      } else {
        setError(typeof e.response?.data === "string" && e.response.data ? e.response.data : e.message);
      }
    },
  });

  const discard = useMutation({
    mutationFn: () => discardRegistration(row.pendingRegistrationId),
    onSuccess: invalidate,
    onError: (e: Error) => setError(e.message),
  });

  const required = [
    form.firstName,
    form.surname,
    form.dob,
    form.sex,
    form.caregiverName,
    form.caregiverCellNo,
    form.emergencyName,
    form.emergencyCellNo,
    form.emergencyRelationship,
  ];
  const canConfirm = required.every((v) => v.trim() !== "");

  return (
    <div className="overflow-hidden rounded-card border border-card bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-accent-tint text-[11px] font-medium text-accent">
          {row.sourceRow}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-primary">
            {row.firstName || "(no name)"} {row.surname}
          </span>
          <span className="block truncate text-[11.5px] text-muted">
            {row.dob ?? "date needs fixing"}
            {row.tShirtSize ? ` · shirt ${row.tShirtSize}` : ""}
          </span>
        </span>
        {row.possibleDuplicate && (
          <StatusPill tone="warning">
            <AlertTriangle size={11} className="mr-1 inline" />
            possible duplicate
          </StatusPill>
        )}
        {row.importNote && !row.possibleDuplicate && <StatusPill tone="warning">check date</StatusPill>}
        <span className="text-[11.5px] text-muted">{open ? "Close" : "Review"}</span>
      </button>

      {open && (
        <div className="border-t border-divider px-4 py-4">
          {row.importNote && (
            <div className="mb-3 rounded-control border border-card bg-header-tint px-3 py-2 text-[12px] text-secondary">
              {row.importNote}
              {row.rawDob && <span className="text-muted"> Original value: “{row.rawDob}”.</span>}
            </div>
          )}

          <FieldGrid>
            <F label="First name" required>
              <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
            </F>
            <F label="Surname" required>
              <Input value={form.surname} onChange={(e) => set("surname", e.target.value)} />
            </F>
            <F label="Date of birth" required>
              <Input type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
            </F>
            <F label="Sex" required>
              <Select value={form.sex} onChange={(e) => set("sex", e.target.value)}>
                <option value="">Select…</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>
            </F>
            <F label="T-shirt size">
              <Select value={form.tShirtSize ?? ""} onChange={(e) => set("tShirtSize", e.target.value || null)}>
                <option value="">Select…</option>
                {TSHIRT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </F>
            <F label="Race">
              <Input value={form.race ?? ""} onChange={(e) => set("race", e.target.value || null)} />
            </F>
            <F label="Cell number">
              <Input value={form.cellNumber ?? ""} onChange={(e) => set("cellNumber", e.target.value || null)} />
            </F>
            <F label="Language">
              <Input value={form.language ?? ""} onChange={(e) => set("language", e.target.value || null)} />
            </F>
            <F label="Address" full>
              <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value || null)} />
            </F>
          </FieldGrid>

          <p className="mb-2 mt-4 text-[11.5px] font-medium uppercase tracking-wide text-muted">
            Primary caregiver
          </p>
          <FieldGrid>
            <F label="Name" required>
              <Input value={form.caregiverName} onChange={(e) => set("caregiverName", e.target.value)} />
            </F>
            <F label="Cell number" required>
              <Input value={form.caregiverCellNo} onChange={(e) => set("caregiverCellNo", e.target.value)} />
            </F>
            <F label="Work number">
              <Input
                value={form.caregiverWorkNo ?? ""}
                onChange={(e) => set("caregiverWorkNo", e.target.value || null)}
              />
            </F>
            <F label="Relationship">
              <Input
                value={form.caregiverRelationship}
                onChange={(e) => set("caregiverRelationship", e.target.value)}
              />
            </F>
          </FieldGrid>

          <p className="mb-2 mt-4 text-[11.5px] font-medium uppercase tracking-wide text-muted">
            Emergency contact
          </p>
          <FieldGrid>
            <F label="Name" required>
              <Input value={form.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} />
            </F>
            <F label="Cell number" required>
              <Input value={form.emergencyCellNo} onChange={(e) => set("emergencyCellNo", e.target.value)} />
            </F>
            <F label="Work number">
              <Input
                value={form.emergencyWorkNo ?? ""}
                onChange={(e) => set("emergencyWorkNo", e.target.value || null)}
              />
            </F>
            <F label="Relationship" required>
              <Input
                value={form.emergencyRelationship}
                onChange={(e) => set("emergencyRelationship", e.target.value)}
              />
            </F>
          </FieldGrid>

          {row.possibleDuplicate && (
            <label className="mt-4 flex items-center gap-2 text-[12.5px] text-secondary">
              <input
                type="checkbox"
                checked={form.confirmDespiteDuplicate}
                onChange={(e) => set("confirmDespiteDuplicate", e.target.checked)}
              />
              This is a different child, create anyway (a returning child should be re-registered,
              not re-created)
            </label>
          )}

          {error && (
            <div className="mt-3 rounded-control border border-danger-border bg-danger-tint px-3 py-2 text-[12px] text-danger">
              {error}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="primary"
              disabled={
                !canConfirm ||
                confirm.isPending ||
                (row.possibleDuplicate && !form.confirmDespiteDuplicate)
              }
              onClick={() => confirm.mutate()}
            >
              {confirm.isPending ? "Confirming…" : "Confirm and create camper"}
            </Button>
            <Button
              variant="secondary"
              disabled={discard.isPending || confirm.isPending}
              onClick={() => discard.mutate()}
            >
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function F({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <span className="text-[11.5px] font-medium text-secondary">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </span>
      {children}
    </label>
  );
}
