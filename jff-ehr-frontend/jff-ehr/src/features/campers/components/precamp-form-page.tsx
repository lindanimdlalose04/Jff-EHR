import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartPulse, NotebookPen, Pill, ShieldQuestion } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import {
  createPrecamp,
  fetchPrecampFormContext,
  updatePrecamp,
  type PrecampPayload,
} from "../api/precamp.api";

/**
 * Route "/registrations/:regId/precamp". The caregiver's pre-camp medical half
 * of the intake (spec/forms/01, part 2), captured into the system by staff
 * before camp. One per registration; editable until soft-deleted (no signing
 * lifecycle on this half). Writes require the medical role.
 */

// "yes" | "no" | "" selects map to nullable booleans on the entity.
const yesNo = z.enum(["", "yes", "no"]).default("");
const toBoolOrNull = (v: "" | "yes" | "no") => (v === "" ? null : v === "yes");

const precampSchema = z.object({
  diagnosis: z.string().trim().optional().default(""),
  hospitalFileNumber: z.string().trim().max(40).optional().default(""),
  treatingContact: z.string().trim().optional().default(""),
  vlOver1000: yesNo,
  viralLoad: z.string().trim().max(40).optional().default(""),
  vlTestDate: z.string().optional().default(""),
  vlDateReceived: z.string().optional().default(""),
  clinicalFindings: z.string().trim().optional().default(""),
  tbStatus: z.enum(["", "current", "past", "negative", "on treatment"]).default(""),
  hepatitisB: yesNo,
  tbOisHistory: z.boolean().default(false),
  tbOisHistoryDetail: z.string().trim().optional().default(""),
  med1: z.string().trim().optional().default(""),
  med2: z.string().trim().optional().default(""),
  med3: z.string().trim().optional().default(""),
  med4: z.string().trim().optional().default(""),
  adherenceBarriers: z.boolean().default(false),
  adherenceBarriersDetail: z.string().trim().optional().default(""),
  dietaryRequirements: z.string().trim().max(200).optional().default(""),
  religion: z.string().trim().max(40).optional().default(""),
  additionalInfo: z.string().trim().optional().default(""),
  camperHistoryNotes: z.string().trim().optional().default(""),
});

type PrecampFormValues = z.input<typeof precampSchema>;

const orNull = (v: string) => (v === "" ? null : v);

function toPayload(values: PrecampFormValues): PrecampPayload {
  const parsed = precampSchema.parse(values);
  const meds = [parsed.med1, parsed.med2, parsed.med3, parsed.med4].filter((m) => m !== "");
  return {
    diagnosis: orNull(parsed.diagnosis),
    hospitalFileNumber: orNull(parsed.hospitalFileNumber),
    treatingContact: orNull(parsed.treatingContact),
    vlOver1000: toBoolOrNull(parsed.vlOver1000),
    viralLoad: orNull(parsed.viralLoad),
    vlTestDate: orNull(parsed.vlTestDate),
    vlDateReceived: orNull(parsed.vlDateReceived),
    clinicalFindings: orNull(parsed.clinicalFindings),
    tbStatus: orNull(parsed.tbStatus),
    hepatitisB: toBoolOrNull(parsed.hepatitisB),
    tbOisHistory: parsed.tbOisHistory,
    tbOisHistoryDetail: parsed.tbOisHistory ? orNull(parsed.tbOisHistoryDetail) : null,
    medicationList: meds.length ? JSON.stringify(meds) : null,
    adherenceBarriers: parsed.adherenceBarriers,
    adherenceBarriersDetail: parsed.adherenceBarriers ? orNull(parsed.adherenceBarriersDetail) : null,
    dietaryRequirements: orNull(parsed.dietaryRequirements),
    religion: orNull(parsed.religion),
    additionalInfo: orNull(parsed.additionalInfo),
    camperHistoryNotes: orNull(parsed.camperHistoryNotes),
  };
}

export function PrecampFormPage() {
  const { regId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const context = useQuery({
    queryKey: ["precamp-context", regId],
    queryFn: () => fetchPrecampFormContext(regId),
    enabled: Boolean(regId),
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PrecampFormValues>({ resolver: zodResolver(precampSchema) });

  useEffect(() => {
    const existing = context.data?.existing;
    if (!existing) return;
    const meds = existing.medicationList ? (JSON.parse(existing.medicationList) as string[]) : [];
    reset({
      diagnosis: existing.diagnosis ?? "",
      hospitalFileNumber: existing.hospitalFileNumber ?? "",
      treatingContact: existing.treatingContact ?? "",
      vlOver1000: existing.vlOver1000 == null ? "" : existing.vlOver1000 ? "yes" : "no",
      viralLoad: existing.viralLoad ?? "",
      vlTestDate: existing.vlTestDate ?? "",
      vlDateReceived: existing.vlDateReceived ?? "",
      clinicalFindings: existing.clinicalFindings ?? "",
      tbStatus: (existing.tbStatus ?? "") as PrecampFormValues["tbStatus"],
      hepatitisB: existing.hepatitisB == null ? "" : existing.hepatitisB ? "yes" : "no",
      tbOisHistory: existing.tbOisHistory,
      tbOisHistoryDetail: existing.tbOisHistoryDetail ?? "",
      med1: meds[0] ?? "",
      med2: meds[1] ?? "",
      med3: meds[2] ?? "",
      med4: meds[3] ?? "",
      adherenceBarriers: existing.adherenceBarriers,
      adherenceBarriersDetail: existing.adherenceBarriersDetail ?? "",
      dietaryRequirements: existing.dietaryRequirements ?? "",
      religion: existing.religion ?? "",
      additionalInfo: existing.additionalInfo ?? "",
      camperHistoryNotes: existing.camperHistoryNotes ?? "",
    });
  }, [context.data?.existing, reset]);

  const save = useMutation({
    mutationFn: (values: PrecampFormValues) => {
      const payload = toPayload(values);
      const existing = context.data?.existing;
      return existing ? updatePrecamp(existing.precampId, payload) : createPrecamp(regId, payload);
    },
    onSuccess: () => {
      const camperId = context.data?.camper.camperId;
      if (camperId) {
        void queryClient.invalidateQueries({ queryKey: ["camper-detail", camperId] });
      }
      void queryClient.invalidateQueries({ queryKey: ["precamp-context", regId] });
      navigate(camperId ? `/campers/${camperId}?tab=medical` : "/campers");
    },
    onError: (e: Error & { response?: { status?: number } }) => {
      setServerError(
        e.response?.status === 403
          ? "Only the medical team may capture pre-camp medical information."
          : e.response?.status === 409
            ? "This registration already has a pre-camp medical record. Reload and edit it instead."
            : e.message,
      );
    },
  });

  if (context.isLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;
  if (context.isError || !context.data) {
    return <div className="p-6 text-sm text-danger">Couldn&rsquo;t load this registration.</div>;
  }

  const { camper, existing } = context.data;
  const backTo = `/campers/${camper.camperId}?tab=medical`;
  const tbOisHistory = watch("tbOisHistory");
  const adherenceBarriers = watch("adherenceBarriers");

  return (
    <div className="mx-auto max-w-[720px]">
      <Breadcrumb
        items={[
          { label: "Campers", to: "/campers" },
          { label: `${camper.firstName} ${camper.surname}`, to: `/campers/${camper.camperId}` },
          { label: existing ? "Edit pre-camp medical" : "Pre-camp medical" },
        ]}
      />

      <h1 className="text-lg font-medium text-primary">
        {existing ? "Edit pre-camp medical" : "Pre-camp medical"}
      </h1>
      <p className="mb-4 mt-0.5 text-sm text-muted">
        {camper.firstName} {camper.surname} ({camper.fileNumber}) · from the caregiver&rsquo;s
        registration pack, strictly confidential
      </p>

      <form
        onSubmit={handleSubmit((values) => {
          setServerError(null);
          save.mutate(values);
        })}
      >
        <FormSection icon={<HeartPulse size={15} />} title="Treatment context">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Diagnosis" htmlFor="diagnosis" error={errors.diagnosis?.message}>
              <Input id="diagnosis" {...register("diagnosis")} />
            </FormField>
            <FormField
              label="Clinic / hospital file number"
              htmlFor="hospitalFileNumber"
              error={errors.hospitalFileNumber?.message}
            >
              <Input id="hospitalFileNumber" {...register("hospitalFileNumber")} />
            </FormField>
            <FormField
              label="Clinic / hospital / doctor contact details"
              htmlFor="treatingContact"
              error={errors.treatingContact?.message}
              className="col-span-2"
            >
              <Textarea id="treatingContact" {...register("treatingContact")} />
            </FormField>
            <FormField
              label="Clinical findings"
              htmlFor="clinicalFindings"
              error={errors.clinicalFindings?.message}
              className="col-span-2"
            >
              <Textarea id="clinicalFindings" {...register("clinicalFindings")} />
            </FormField>
          </div>
        </FormSection>

        <FormSection icon={<ShieldQuestion size={15} />} title="HIV, TB and hepatitis" tone="danger">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Viral load over 1000 copies/ml" htmlFor="vlOver1000">
              <Select id="vlOver1000" {...register("vlOver1000")}>
                <option value="">Not stated</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </FormField>
            <FormField label="Latest viral load (copies/ml)" htmlFor="viralLoad" error={errors.viralLoad?.message}>
              <Input id="viralLoad" placeholder="e.g. Undetectable (<50)" {...register("viralLoad")} />
            </FormField>
            <FormField label="Date test obtained" htmlFor="vlTestDate">
              <Input id="vlTestDate" type="date" {...register("vlTestDate")} />
            </FormField>
            <FormField label="Date received" htmlFor="vlDateReceived">
              <Input id="vlDateReceived" type="date" {...register("vlDateReceived")} />
            </FormField>
            <FormField label="TB history" htmlFor="tbStatus">
              <Select id="tbStatus" {...register("tbStatus")}>
                <option value="">Not stated</option>
                <option value="current">Current</option>
                <option value="past">Past</option>
                <option value="negative">Negative</option>
                <option value="on treatment">On treatment</option>
              </Select>
            </FormField>
            <FormField label="Hepatitis B" htmlFor="hepatitisB">
              <Select id="hepatitisB" {...register("hepatitisB")}>
                <option value="">Not stated</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </FormField>
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm text-primary">
                <input type="checkbox" className="accent-accent" {...register("tbOisHistory")} />
                History of TB or opportunistic infections
              </label>
              {tbOisHistory && (
                <div className="mt-2">
                  <Textarea
                    placeholder="Dates, diagnosis, treatment"
                    {...register("tbOisHistoryDetail")}
                  />
                </div>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection icon={<Pill size={15} />} title="Medication and adherence">
          <div className="grid grid-cols-2 gap-3">
            {(["med1", "med2", "med3", "med4"] as const).map((name, i) => (
              <FormField key={name} label={`Medication ${i + 1}`} htmlFor={name}>
                <Input id={name} {...register(name)} />
              </FormField>
            ))}
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm text-primary">
                <input type="checkbox" className="accent-accent" {...register("adherenceBarriers")} />
                Adherence barriers
              </label>
              {adherenceBarriers && (
                <div className="mt-2">
                  <Textarea placeholder="Detail" {...register("adherenceBarriersDetail")} />
                </div>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection icon={<NotebookPen size={15} />} title="Care and background">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Special dietary requirements"
              htmlFor="dietaryRequirements"
              error={errors.dietaryRequirements?.message}
            >
              <Input
                id="dietaryRequirements"
                placeholder="Diabetic, kosher, halaal, vegetarian, allergies"
                {...register("dietaryRequirements")}
              />
            </FormField>
            <FormField label="Religious affiliation" htmlFor="religion" error={errors.religion?.message}>
              <Input id="religion" {...register("religion")} />
            </FormField>
            <FormField
              label="Additional information to disclose"
              htmlFor="additionalInfo"
              className="col-span-2"
            >
              <Textarea id="additionalInfo" {...register("additionalInfo")} />
            </FormField>
            <FormField
              label="History, suggestions and limitations"
              htmlFor="camperHistoryNotes"
              className="col-span-2"
            >
              <Textarea
                id="camperHistoryNotes"
                placeholder="Behavioural history, psychosocial needs, self-care needs"
                {...register("camperHistoryNotes")}
              />
            </FormField>
          </div>
        </FormSection>

        {serverError && (
          <div className="mb-4 rounded-control border border-danger-border bg-danger-tint px-3 py-2 text-sm text-danger">
            {serverError}
          </div>
        )}

        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : existing ? "Save changes" : "Save pre-camp medical"}
          </Button>
        </div>
      </form>
    </div>
  );
}
