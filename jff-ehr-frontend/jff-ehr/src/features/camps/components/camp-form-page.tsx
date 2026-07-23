import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Tent } from "lucide-react";
import { apiClient } from "@/api/client";
import type { CampDto } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { useMe } from "@/features/auth/use-me";

/**
 * Routes "/camps/new" and "/camps/:campId/edit". Camps are Tier 1: fully
 * editable administrative data, maintained by medical or admin staff.
 */

const STATUSES = ["planned", "active", "completed", "cancelled"];

interface Draft {
  campNumber: string;
  startDate: string;
  endDate: string;
  venue: string;
  province: string;
  campType: string;
  status: string;
}

export function CampFormPage() {
  const { campId } = useParams();
  const isEdit = Boolean(campId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const canMaintain = me.data?.role === "medical" || me.data?.role === "admin";
  const [error, setError] = useState<string | null>(null);

  const existing = useQuery({
    queryKey: ["camps", campId],
    queryFn: async () => (await apiClient.get<CampDto>(`/camps/${campId}`)).data,
    enabled: isEdit,
  });

  const [draft, setDraft] = useState<Draft>({
    campNumber: "",
    startDate: "",
    endDate: "",
    venue: "",
    province: "",
    campType: "oncology",
    status: "planned",
  });
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => {
    const c = existing.data;
    if (!c) return;
    setDraft({
      campNumber: String(c.campNumber),
      startDate: c.startDate,
      endDate: c.endDate,
      venue: c.venue,
      province: c.province,
      campType: c.campType,
      status: c.status,
    });
  }, [existing.data]);

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        startDate: draft.startDate,
        endDate: draft.endDate,
        venue: draft.venue.trim(),
        province: draft.province.trim(),
        campType: draft.campType.trim(),
        status: draft.status,
      };
      if (isEdit) {
        return (await apiClient.put<CampDto>(`/camps/${campId}`, body)).data;
      }
      return (
        await apiClient.post<CampDto>("/camps", {
          campNumber: Number(draft.campNumber),
          ...body,
        })
      ).data;
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["camps"] });
      void queryClient.invalidateQueries({ queryKey: ["camp-hub"] });
      navigate(`/camps/${saved.campId}`);
    },
    onError: (e: Error & { response?: { status?: number } }) =>
      setError(
        e.response?.status === 403
          ? "You do not have permission to maintain camps."
          : e.response?.status === 409
            ? "That camp number is already in use."
            : e.message,
      ),
  });

  if (isEdit && existing.isLoading) {
    return <div className="p-6 text-sm text-muted">Loading camp…</div>;
  }

  const valid =
    draft.startDate &&
    draft.endDate &&
    draft.venue.trim() &&
    draft.province.trim() &&
    (isEdit || draft.campNumber.trim());
  const backTo = isEdit ? `/camps/${campId}` : "/camps";

  return (
    <div className="mx-auto max-w-[640px]">
      <Link
        to={backTo}
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-secondary hover:text-primary"
      >
        <ArrowLeft size={14} /> {isEdit ? "Back to camp" : "Camps"}
      </Link>

      <h1 className="mb-4 text-lg font-medium text-primary">
        {isEdit ? `Edit camp ${existing.data?.campNumber ?? ""}` : "New camp"}
      </h1>

      {error && (
        <div className="mb-3 rounded-control border border-danger-border bg-danger-tint px-3 py-2 text-[12.5px] text-danger">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          save.mutate();
        }}
      >
        <FormSection icon={<Tent size={15} />} title="Camp details">
          <div className="grid grid-cols-2 gap-3">
            {!isEdit && (
              <FormField label="Camp number" htmlFor="campNumber">
                <Input
                  id="campNumber"
                  inputMode="numeric"
                  value={draft.campNumber}
                  onChange={(e) => set({ campNumber: e.target.value })}
                  placeholder="15"
                />
              </FormField>
            )}
            <FormField label="Status" htmlFor="status">
              <Select id="status" value={draft.status} onChange={(e) => set({ status: e.target.value })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Start date" htmlFor="startDate">
              <Input
                id="startDate"
                type="date"
                value={draft.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
              />
            </FormField>
            <FormField label="End date" htmlFor="endDate">
              <Input
                id="endDate"
                type="date"
                value={draft.endDate}
                onChange={(e) => set({ endDate: e.target.value })}
              />
            </FormField>
            <FormField label="Venue" htmlFor="venue" className="col-span-2">
              <Input
                id="venue"
                value={draft.venue}
                onChange={(e) => set({ venue: e.target.value })}
                placeholder="e.g. Bergkroon, Paarl"
              />
            </FormField>
            <FormField label="Province" htmlFor="province">
              <Input
                id="province"
                value={draft.province}
                onChange={(e) => set({ province: e.target.value })}
              />
            </FormField>
            <FormField label="Camp type" htmlFor="campType">
              <Input
                id="campType"
                value={draft.campType}
                onChange={(e) => set({ campType: e.target.value })}
                placeholder="e.g. oncology"
              />
            </FormField>
          </div>
        </FormSection>

        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!valid || !canMaintain || save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create camp"}
          </Button>
        </div>
        {!canMaintain && (
          <p className="mt-2 text-right text-[11.5px] text-muted">
            Camps are maintained by medical or admin staff.
          </p>
        )}
      </form>
    </div>
  );
}
