import { normaliseSex } from "@/lib/display";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, UserRoundPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/api/client";
import type { CamperDto } from "@/api/types";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { uploadDocument } from "@/lib/storage-upload";
import { createCamper, updateCamper, type CamperPayload } from "../api/campers-crud.api";

/**
 * Routes "/campers/new" and "/campers/:camperId/edit". Tier 1 full CRUD for
 * the camper record itself; fields from the registration form's personal
 * section (spec/forms/01, part 1) plus the longitudinal fields the camper
 * record carries (JFF file number, diagnosis, treating clinic).
 */

const camperSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name").max(80),
  surname: z.string().trim().min(1, "Enter a surname").max(80),
  dob: z.string().min(1, "Enter a date of birth"),
  sex: z.enum(["M", "F"], { required_error: "Select a sex" }),
  race: z.string().trim().max(30).optional().default(""),
  tShirtSize: z.string().trim().max(8).optional().default(""),
  address: z.string().trim().optional().default(""),
  cellNumber: z.string().trim().max(20).optional().default(""),
  language: z.string().trim().max(40).optional().default(""),
  fileNumber: z.string().trim().min(1, "Enter the JFF file number").max(20),
  diagnosis: z.string().trim().optional().default(""),
  treatingClinic: z.string().trim().optional().default(""),
  photoUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")).default(""),
});

type CamperFormValues = z.input<typeof camperSchema>;

const orNull = (v: string) => (v === "" ? null : v);

export function CamperFormPage() {
  const { camperId } = useParams();
  const isEdit = Boolean(camperId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const existing = useQuery({
    queryKey: ["campers", camperId],
    queryFn: async () => (await apiClient.get<CamperDto>(`/campers/${camperId}`)).data,
    enabled: isEdit,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CamperFormValues>({
    resolver: zodResolver(camperSchema),
    defaultValues: { sex: "M" },
  });
  const [uploading, setUploading] = useState(false);

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      setValue("photoUrl", await uploadDocument("camper-photos", file), {
        shouldValidate: true,
      });
    } catch {
      // Leave the field untouched; the caregiver can paste a URL instead.
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (existing.data) {
      const c = existing.data;
      reset({
        firstName: c.firstName,
        surname: c.surname,
        dob: c.dob,
        sex: normaliseSex(c.sex) ?? "M",
        race: c.race ?? "",
        tShirtSize: c.tShirtSize ?? "",
        address: c.address ?? "",
        cellNumber: c.cellNumber ?? "",
        language: c.language ?? "",
        fileNumber: c.fileNumber,
        diagnosis: c.diagnosis ?? "",
        treatingClinic: c.treatingClinic ?? "",
        photoUrl: c.photoUrl ?? "",
      });
    }
  }, [existing.data, reset]);

  const save = useMutation({
    mutationFn: (values: CamperFormValues) => {
      const parsed = camperSchema.parse(values);
      const payload: CamperPayload = {
        firstName: parsed.firstName,
        surname: parsed.surname,
        dob: parsed.dob,
        sex: parsed.sex,
        race: orNull(parsed.race),
        address: orNull(parsed.address),
        cellNumber: orNull(parsed.cellNumber),
        language: orNull(parsed.language),
        tShirtSize: orNull(parsed.tShirtSize),
        photoUrl: orNull(parsed.photoUrl),
        diagnosis: orNull(parsed.diagnosis),
        treatingClinic: orNull(parsed.treatingClinic),
        fileNumber: parsed.fileNumber,
        familyGroupId: existing.data?.familyGroupId ?? null,
      };
      return isEdit ? updateCamper(camperId!, payload) : createCamper(payload);
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["campers"] });
      void queryClient.invalidateQueries({ queryKey: ["camper-detail", saved.camperId] });
      navigate(`/campers/${saved.camperId}`);
    },
    onError: (e: Error & { response?: { status?: number } }) => {
      setServerError(
        e.response?.status === 409
          ? "That file number is already in use by another camper."
          : e.response?.status === 403
            ? "You do not have permission to maintain camper records."
            : e.message,
      );
    },
  });

  if (isEdit && existing.isLoading) {
    return <div className="p-6 text-sm text-muted">Loading camper…</div>;
  }
  if (isEdit && (existing.isError || !existing.data)) {
    return <div className="p-6 text-sm text-danger">Couldn&rsquo;t load this camper.</div>;
  }

  const backTo = isEdit ? `/campers/${camperId}` : "/campers";

  return (
    <div className="mx-auto max-w-[720px]">
      <Breadcrumb
        items={
          isEdit
            ? [
                { label: "Campers", to: "/campers" },
                {
                  label: `${existing.data?.firstName ?? ""} ${existing.data?.surname ?? ""}`.trim(),
                  to: `/campers/${camperId}`,
                },
                { label: "Edit" },
              ]
            : [{ label: "Campers", to: "/campers" }, { label: "New camper" }]
        }
      />

      <h1 className="mb-4 text-lg font-medium text-primary">
        {isEdit ? `Edit ${existing.data?.firstName} ${existing.data?.surname}` : "New camper"}
      </h1>

      <form
        onSubmit={handleSubmit((values) => {
          setServerError(null);
          save.mutate(values);
        })}
      >
        <FormSection icon={<UserRoundPlus size={15} />} title="Personal information">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First name" htmlFor="firstName" error={errors.firstName?.message}>
              <Input id="firstName" {...register("firstName")} />
            </FormField>
            <FormField label="Surname" htmlFor="surname" error={errors.surname?.message}>
              <Input id="surname" {...register("surname")} />
            </FormField>
            <FormField label="Date of birth" htmlFor="dob" error={errors.dob?.message}>
              <Input id="dob" type="date" {...register("dob")} />
            </FormField>
            <FormField label="Sex" htmlFor="sex" error={errors.sex?.message}>
              <Select id="sex" {...register("sex")}>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </Select>
            </FormField>
            <FormField label="Race" htmlFor="race" error={errors.race?.message}>
              <Input id="race" {...register("race")} />
            </FormField>
            <FormField label="T-shirt size" htmlFor="tShirtSize" error={errors.tShirtSize?.message}>
              <Select id="tShirtSize" {...register("tShirtSize")}>
                <option value="">Not set</option>
                {["XS", "S", "M", "L", "XL"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Language spoken" htmlFor="language" error={errors.language?.message}>
              <Input id="language" {...register("language")} />
            </FormField>
            <FormField label="Cell number" htmlFor="cellNumber" error={errors.cellNumber?.message}>
              <Input id="cellNumber" {...register("cellNumber")} />
            </FormField>
            <FormField label="Address" htmlFor="address" error={errors.address?.message} className="col-span-2">
              <Textarea id="address" {...register("address")} />
            </FormField>
            <FormField label="Photo or scanned document (URL or upload)" htmlFor="photoUrl" error={errors.photoUrl?.message} className="col-span-2">
              <div className="flex gap-2">
                <Input id="photoUrl" placeholder="https://… or upload" {...register("photoUrl")} />
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-control border border-field-border bg-field px-3 text-sm font-medium text-secondary hover:text-primary">
                  <Upload size={14} />
                  {uploading ? "Uploading…" : "Upload"}
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadPhoto(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </FormField>
          </div>
        </FormSection>

        <FormSection icon={<UserRoundPlus size={15} />} title="JFF record">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="JFF file number" htmlFor="fileNumber" error={errors.fileNumber?.message}>
              <Input id="fileNumber" placeholder="e.g. JFF-0416" {...register("fileNumber")} />
            </FormField>
            <FormField label="Diagnosis (longitudinal)" htmlFor="diagnosis" error={errors.diagnosis?.message}>
              <Input id="diagnosis" {...register("diagnosis")} />
            </FormField>
            <FormField label="Treating clinic" htmlFor="treatingClinic" error={errors.treatingClinic?.message} className="col-span-2">
              <Input id="treatingClinic" {...register("treatingClinic")} />
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
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create camper"}
          </Button>
        </div>
      </form>
    </div>
  );
}
