import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Accessibility,
  ClipboardPlus,
  FilePenLine,
  Lock,
  Pencil,
  Pill,
  ShieldQuestion,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ArrivalCheckDto } from "@/api/types";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { formatDate, formatDateTime } from "@/lib/display";
import {
  createArrivalCheck,
  fetchArrivalCheckContext,
  signArrivalCheck,
  softDeleteArrivalCheck,
  updateArrivalCheck,
  type ArrivalCheckPayload,
} from "../api/arrival-check.api";

/**
 * Route "/registrations/:regId/arrival-check". The nurse's day-one form
 * (spec/forms/02 + spec/wireframes/02): fully editable while draft (amber
 * pill), locked on "Sign and lock" (green pill, read-only). Corrections after
 * signing go through Amend: the signed row is soft-deleted (a visible
 * amendment) and a new prefilled draft replaces it.
 */

const checkSchema = z.object({
  hasAllergies: z.boolean().default(false),
  allergiesDetail: z.string().trim().optional().default(""),
  eyesight: z.string().trim().optional().default(""),
  hearing: z.string().trim().optional().default(""),
  mobilityAids: z.string().trim().optional().default(""),
  prosthesis: z.string().trim().optional().default(""),
  otherNotes: z.string().trim().optional().default(""),
  adlEnabled: z.boolean().default(false),
  adlShower: z.string().trim().optional().default(""),
  adlDressing: z.string().trim().optional().default(""),
  adlToileting: z.string().trim().optional().default(""),
  adlEating: z.string().trim().optional().default(""),
  tbCough: z.boolean().default(false),
  tbCoughDetail: z.string().trim().optional().default(""),
  tbWeightLoss: z.boolean().default(false),
  tbWeightLossDetail: z.string().trim().optional().default(""),
  tbNightSweats: z.boolean().default(false),
  tbNightSweatsDetail: z.string().trim().optional().default(""),
  hasMedication: z.boolean().default(false),
  medicationHandedIn: z.boolean().default(false),
  medicationHandedInDate: z.string().optional().default(""),
  med1: z.string().trim().optional().default(""),
  med2: z.string().trim().optional().default(""),
  med3: z.string().trim().optional().default(""),
  med4: z.string().trim().optional().default(""),
  med5: z.string().trim().optional().default(""),
  physicalCondition: z.string().trim().optional().default(""),
  additionalNotes: z.string().trim().optional().default(""),
});

type CheckFormValues = z.input<typeof checkSchema>;

const orNull = (v: string) => (v === "" ? null : v);

interface TbItem { checked: boolean; detail?: string | null }
interface TbScreening {
  cough_over_2_weeks?: TbItem;
  weight_loss?: TbItem;
  night_sweats?: TbItem;
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function toPayload(values: CheckFormValues): ArrivalCheckPayload {
  const parsed = checkSchema.parse(values);
  const meds = [parsed.med1, parsed.med2, parsed.med3, parsed.med4, parsed.med5].filter(
    (m) => m !== "",
  );
  const tb: TbScreening = {
    cough_over_2_weeks: { checked: parsed.tbCough, detail: orNull(parsed.tbCoughDetail) },
    weight_loss: { checked: parsed.tbWeightLoss, detail: orNull(parsed.tbWeightLossDetail) },
    night_sweats: { checked: parsed.tbNightSweats, detail: orNull(parsed.tbNightSweatsDetail) },
  };
  return {
    hasAllergies: parsed.hasAllergies,
    allergiesDetail: parsed.hasAllergies ? orNull(parsed.allergiesDetail) : null,
    eyesight: orNull(parsed.eyesight),
    hearing: orNull(parsed.hearing),
    mobilityAids: orNull(parsed.mobilityAids),
    prosthesis: orNull(parsed.prosthesis),
    otherNotes: orNull(parsed.otherNotes),
    adlNeeds: parsed.adlEnabled
      ? JSON.stringify({
          shower: parsed.adlShower,
          dressing: parsed.adlDressing,
          toileting: parsed.adlToileting,
          eating: parsed.adlEating,
        })
      : null,
    tbScreening: JSON.stringify(tb),
    hasMedication: parsed.hasMedication,
    medicationHandedIn: parsed.medicationHandedIn,
    medicationHandedInDate: parsed.medicationHandedIn
      ? orNull(parsed.medicationHandedInDate)
      : null,
    medicationList: meds.length ? JSON.stringify(meds) : null,
    physicalCondition: orNull(parsed.physicalCondition),
    additionalNotes: orNull(parsed.additionalNotes),
  };
}

function fromExisting(check: ArrivalCheckDto): CheckFormValues {
  const adl = parseJson<Record<string, string>>(check.adlNeeds);
  const tb = parseJson<TbScreening>(check.tbScreening);
  const meds = parseJson<string[]>(check.medicationList) ?? [];
  return {
    hasAllergies: check.hasAllergies,
    allergiesDetail: check.allergiesDetail ?? "",
    eyesight: check.eyesight ?? "",
    hearing: check.hearing ?? "",
    mobilityAids: check.mobilityAids ?? "",
    prosthesis: check.prosthesis ?? "",
    otherNotes: check.otherNotes ?? "",
    adlEnabled: adl != null,
    adlShower: adl?.shower ?? "",
    adlDressing: adl?.dressing ?? "",
    adlToileting: adl?.toileting ?? "",
    adlEating: adl?.eating ?? "",
    tbCough: tb?.cough_over_2_weeks?.checked ?? false,
    tbCoughDetail: tb?.cough_over_2_weeks?.detail ?? "",
    tbWeightLoss: tb?.weight_loss?.checked ?? false,
    tbWeightLossDetail: tb?.weight_loss?.detail ?? "",
    tbNightSweats: tb?.night_sweats?.checked ?? false,
    tbNightSweatsDetail: tb?.night_sweats?.detail ?? "",
    hasMedication: check.hasMedication,
    medicationHandedIn: check.medicationHandedIn,
    medicationHandedInDate: check.medicationHandedInDate ?? "",
    med1: meds[0] ?? "",
    med2: meds[1] ?? "",
    med3: meds[2] ?? "",
    med4: meds[3] ?? "",
    med5: meds[4] ?? "",
    physicalCondition: check.physicalCondition ?? "",
    additionalNotes: check.additionalNotes ?? "",
  };
}

export function ArrivalCheckPage() {
  const { regId = "" } = useParams();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const context = useQuery({
    queryKey: ["arrival-check-context", regId],
    queryFn: () => fetchArrivalCheckContext(regId),
    enabled: Boolean(regId),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["arrival-check-context", regId] });
    const camperId = context.data?.camper.camperId;
    if (camperId) {
      void queryClient.invalidateQueries({ queryKey: ["camper-detail", camperId] });
    }
  };

  const fail = (e: Error & { response?: { status?: number } }) =>
    setServerError(
      e.response?.status === 403
        ? "Only the medical team may complete arrival checks."
        : e.response?.status === 409
          ? "This check is already signed and locked. Use Amend to correct it."
          : e.message,
    );

  const saveDraft = useMutation({
    mutationFn: async (values: CheckFormValues) => {
      const payload = toPayload(values);
      const existing = context.data?.existing;
      return existing
        ? updateArrivalCheck(existing.arrivalCheckId, payload)
        : createArrivalCheck(regId, payload);
    },
    onSuccess: () => { setServerError(null); refresh(); },
    onError: fail,
  });

  const signAndLock = useMutation({
    mutationFn: async (values: CheckFormValues) => {
      const payload = toPayload(values);
      const existing = context.data?.existing;
      const draft = existing
        ? await updateArrivalCheck(existing.arrivalCheckId, payload)
        : await createArrivalCheck(regId, payload);
      return signArrivalCheck(draft.arrivalCheckId);
    },
    onSuccess: () => { setServerError(null); refresh(); },
    onError: fail,
  });

  const amend = useMutation({
    mutationFn: async (signed: ArrivalCheckDto) => {
      await softDeleteArrivalCheck(signed.arrivalCheckId);
      return createArrivalCheck(regId, toPayload(fromExisting(signed)));
    },
    onSuccess: () => { setServerError(null); refresh(); },
    onError: fail,
  });

  if (context.isLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;
  if (context.isError || !context.data) {
    return <div className="p-6 text-sm text-danger">Couldn&rsquo;t load this registration.</div>;
  }

  const { camper, camp, precamp, existing } = context.data;
  const signed = existing?.status === "signed";

  return (
    <div className="mx-auto max-w-[760px]">
      <Breadcrumb
        items={[
          { label: "Campers", to: "/campers" },
          { label: `${camper.firstName} ${camper.surname}`, to: `/campers/${camper.camperId}` },
          { label: "Arrival check" },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-medium text-primary">
            Arrival check and medication check-in
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {camper.firstName} {camper.surname} ({camper.fileNumber})
            {camp ? ` · Camp ${camp.campNumber}, ${camp.venue}` : ""} · nurse-signed on day one
          </p>
        </div>
        {signed ? (
          <span className="inline-flex items-center gap-1 border border-success bg-success-tint px-2.5 py-1 text-[11.5px] font-semibold text-success-text">
            <Lock size={12} /> signed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 border border-warning bg-warning-tint px-2.5 py-1 text-[11.5px] font-semibold text-warning-text">
            <Pencil size={12} /> draft, editable
          </span>
        )}
      </div>

      {serverError && (
        <div className="mb-4 rounded-control border border-danger-border bg-danger-tint px-3 py-2 text-[12.5px] text-danger">
          {serverError}
        </div>
      )}

      {signed && existing ? (
        <SignedView
          check={existing}
          dietary={precamp?.dietaryRequirements ?? null}
          religion={precamp?.religion ?? null}
          amending={amend.isPending}
          onAmend={() => amend.mutate(existing)}
        />
      ) : (
        <CheckForm
          key={existing?.arrivalCheckId ?? "new"}
          existing={existing}
          dietary={precamp?.dietaryRequirements ?? null}
          religion={precamp?.religion ?? null}
          saving={saveDraft.isPending}
          signing={signAndLock.isPending}
          onSaveDraft={(v) => saveDraft.mutate(v)}
          onSign={(v) => signAndLock.mutate(v)}
        />
      )}
    </div>
  );
}

function ReadOnlyOverlapFields({ dietary, religion }: { dietary: string | null; religion: string | null }) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-control bg-header-tint px-3 py-2.5">
      <div>
        <div className="text-[11.5px] font-medium uppercase tracking-wide text-muted">
          Special dietary requirements
        </div>
        <div className="mt-0.5 text-[12.5px] text-secondary">
          {dietary ?? "Not captured on pre-camp medical"}
        </div>
      </div>
      <div>
        <div className="text-[11.5px] font-medium uppercase tracking-wide text-muted">Religion</div>
        <div className="mt-0.5 text-[12.5px] text-secondary">
          {religion ?? "Not captured on pre-camp medical"}
        </div>
      </div>
      <p className="col-span-2 text-[11px] text-muted">
        Read-only, owned by the pre-camp medical record.
      </p>
    </div>
  );
}

function CheckboxWithDetail({
  label,
  checked,
  detailName,
  register,
  showDetail,
}: {
  label: string;
  checked: object;
  detailName: string;
  register: ReturnType<typeof useForm<CheckFormValues>>["register"];
  showDetail: boolean;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-[12.5px] text-primary">
        <input type="checkbox" className="accent-accent" {...checked} />
        {label}
      </label>
      {showDetail && (
        <div className="mt-1.5">
          <Input placeholder="Detail" {...register(detailName as keyof CheckFormValues)} />
        </div>
      )}
    </div>
  );
}

function CheckForm({
  existing,
  dietary,
  religion,
  saving,
  signing,
  onSaveDraft,
  onSign,
}: {
  existing: ArrivalCheckDto | null;
  dietary: string | null;
  religion: string | null;
  saving: boolean;
  signing: boolean;
  onSaveDraft: (values: CheckFormValues) => void;
  onSign: (values: CheckFormValues) => void;
}) {
  const { register, handleSubmit, watch, reset } = useForm<CheckFormValues>({
    resolver: zodResolver(checkSchema),
    defaultValues: existing ? fromExisting(existing) : undefined,
  });

  useEffect(() => {
    if (existing) reset(fromExisting(existing));
  }, [existing, reset]);

  const hasAllergies = watch("hasAllergies");
  const adlEnabled = watch("adlEnabled");
  const hasMedication = watch("hasMedication");
  const medicationHandedIn = watch("medicationHandedIn");
  const tbCough = watch("tbCough");
  const tbWeightLoss = watch("tbWeightLoss");
  const tbNightSweats = watch("tbNightSweats");
  const busy = saving || signing;

  return (
    <form onSubmit={handleSubmit(onSign)}>
      <FormSection icon={<ClipboardPlus size={15} />} title="Assessment">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="flex items-center gap-2 text-[12.5px] text-primary">
              <input type="checkbox" className="accent-accent" {...register("hasAllergies")} />
              Allergies
            </label>
            {hasAllergies && (
              <div className="mt-1.5">
                <Input placeholder="Detail" {...register("allergiesDetail")} />
              </div>
            )}
          </div>
          <FormField label="Eyesight" htmlFor="eyesight">
            <Input id="eyesight" {...register("eyesight")} />
          </FormField>
          <FormField label="Hearing" htmlFor="hearing">
            <Input id="hearing" {...register("hearing")} />
          </FormField>
          <FormField label="Mobility aids" htmlFor="mobilityAids">
            <Input id="mobilityAids" {...register("mobilityAids")} />
          </FormField>
          <FormField label="Prosthesis" htmlFor="prosthesis">
            <Input id="prosthesis" {...register("prosthesis")} />
          </FormField>
          <FormField label="Other" htmlFor="otherNotes" className="col-span-2">
            <Input id="otherNotes" {...register("otherNotes")} />
          </FormField>
        </div>
      </FormSection>

      <FormSection icon={<Accessibility size={15} />} title="Assistance with daily living">
        <label className="flex items-center gap-2 text-[12.5px] text-primary">
          <input type="checkbox" className="accent-accent" {...register("adlEnabled")} />
          Needs assistance with daily living
        </label>
        {adlEnabled && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <FormField label="Shower / bath" htmlFor="adlShower">
              <Input id="adlShower" {...register("adlShower")} />
            </FormField>
            <FormField label="Dressing" htmlFor="adlDressing">
              <Input id="adlDressing" {...register("adlDressing")} />
            </FormField>
            <FormField label="Toileting" htmlFor="adlToileting">
              <Input id="adlToileting" {...register("adlToileting")} />
            </FormField>
            <FormField label="Eating" htmlFor="adlEating">
              <Input id="adlEating" {...register("adlEating")} />
            </FormField>
          </div>
        )}
      </FormSection>

      <FormSection icon={<ShieldQuestion size={15} />} title="TB screening" tone="danger">
        <div className="grid gap-3 sm:grid-cols-3">
          <CheckboxWithDetail
            label="Cough longer than 2 weeks"
            checked={register("tbCough")}
            detailName="tbCoughDetail"
            register={register}
            showDetail={tbCough ?? false}
          />
          <CheckboxWithDetail
            label="Unexplained weight loss"
            checked={register("tbWeightLoss")}
            detailName="tbWeightLossDetail"
            register={register}
            showDetail={tbWeightLoss ?? false}
          />
          <CheckboxWithDetail
            label="Night sweats or unexplained fevers"
            checked={register("tbNightSweats")}
            detailName="tbNightSweatsDetail"
            register={register}
            showDetail={tbNightSweats ?? false}
          />
        </div>
      </FormSection>

      <FormSection icon={<Pill size={15} />} title="Medication">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-[12.5px] text-primary">
            <input type="checkbox" className="accent-accent" {...register("hasMedication")} />
            Medication
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[12.5px] text-primary">
              <input type="checkbox" className="accent-accent" {...register("medicationHandedIn")} />
              Medication handed in
            </label>
            {medicationHandedIn && (
              <Input type="date" className="w-auto" {...register("medicationHandedInDate")} />
            )}
          </div>
          {hasMedication &&
            (["med1", "med2", "med3", "med4", "med5"] as const).map((name, i) => (
              <FormField key={name} label={`Medication ${i + 1}`} htmlFor={name}>
                <Input id={name} {...register(name)} />
              </FormField>
            ))}
        </div>
      </FormSection>

      <FormSection icon={<FilePenLine size={15} />} title="Narrative">
        <div className="grid gap-3">
          <FormField label="Current physical condition" htmlFor="physicalCondition">
            <Textarea id="physicalCondition" {...register("physicalCondition")} />
          </FormField>
          <ReadOnlyOverlapFields dietary={dietary} religion={religion} />
          <FormField
            label="Additional camper information, history, suggestions and limitations"
            htmlFor="additionalNotes"
          >
            <Textarea id="additionalNotes" {...register("additionalNotes")} />
          </FormField>
        </div>
      </FormSection>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[340px] text-[11.5px] text-muted">
          Signing locks this record. Later corrections show as amendments, never silent edits.
        </p>
        <div className="flex gap-2.5">
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={handleSubmit(onSaveDraft)}
          >
            {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            <FilePenLine size={14} />
            {signing ? "Signing…" : "Sign and lock"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function SignedRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3 border-b border-divider py-2 text-[12.5px] last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-primary">{value || "-"}</dd>
    </div>
  );
}

function SignedView({
  check,
  dietary,
  religion,
  amending,
  onAmend,
}: {
  check: ArrivalCheckDto;
  dietary: string | null;
  religion: string | null;
  amending: boolean;
  onAmend: () => void;
}) {
  const adl = parseJson<Record<string, string>>(check.adlNeeds);
  const tb = parseJson<TbScreening>(check.tbScreening);
  const meds = parseJson<string[]>(check.medicationList) ?? [];
  const tbSummary = tb
    ? [
        tb.cough_over_2_weeks?.checked ? "cough over 2 weeks" : null,
        tb.weight_loss?.checked ? "weight loss" : null,
        tb.night_sweats?.checked ? "night sweats" : null,
      ].filter(Boolean)
    : [];

  return (
    <div>
      <div className="rounded-card border border-card bg-surface p-5">
        <dl>
          <SignedRow
            label="Allergies"
            value={check.hasAllergies ? (check.allergiesDetail ?? "Yes") : "None declared"}
          />
          <SignedRow label="Eyesight" value={check.eyesight} />
          <SignedRow label="Hearing" value={check.hearing} />
          <SignedRow label="Mobility aids" value={check.mobilityAids} />
          <SignedRow label="Prosthesis" value={check.prosthesis} />
          <SignedRow label="Other" value={check.otherNotes} />
          <SignedRow
            label="Assistance with daily living"
            value={
              adl
                ? Object.entries(adl)
                    .filter(([, v]) => v)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("; ") || "Assistance needed"
                : "Independent"
            }
          />
          <SignedRow
            label="TB screening"
            value={tbSummary.length ? tbSummary.join(", ") : "All clear"}
          />
          <SignedRow label="Medication" value={check.hasMedication ? "Yes" : "No"} />
          <SignedRow
            label="Medication handed in"
            value={
              check.medicationHandedIn
                ? `Yes${check.medicationHandedInDate ? `, ${formatDate(check.medicationHandedInDate)}` : ""}`
                : "No"
            }
          />
          <SignedRow label="Current medication" value={meds.length ? meds.join(", ") : null} />
          <SignedRow label="Physical condition" value={check.physicalCondition} />
          <SignedRow label="Special dietary requirements (pre-camp)" value={dietary} />
          <SignedRow label="Religion (pre-camp)" value={religion} />
          <SignedRow label="Additional information" value={check.additionalNotes} />
        </dl>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-1.5 text-[12.5px] text-secondary">
          <Lock size={13} className="text-accent" />
          Signed by {check.signedByName ?? "-"}
          {check.signedAt ? ` on ${formatDateTime(check.signedAt)}` : ""}. This record is locked.
        </p>
        <Button variant="secondary" disabled={amending} onClick={onAmend}>
          <FilePenLine size={14} />
          {amending ? "Amending…" : "Amend"}
        </Button>
      </div>
      <p className="mt-1.5 text-right text-[11px] text-muted">
        Amending retires this signed record as a visible amendment and opens a new
        prefilled draft. Nothing is overwritten.
      </p>
    </div>
  );
}
