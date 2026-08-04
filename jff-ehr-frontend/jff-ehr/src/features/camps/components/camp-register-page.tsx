import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserPlus } from "lucide-react";
import { apiClient } from "@/api/client";
import type { CamperDto, CampDto, CampRegistrationDto } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { useMe } from "@/features/auth/use-me";

/**
 * Route "/camps/:campId/register". The hinge between the persistent camper and
 * the camp episode: assigning a camper to this camp creates the registration
 * that every clinical record for the camp hangs from. Campers already
 * registered are excluded from the picker.
 */

const STATUSES = ["registered", "checked_in", "attended", "cancelled"];

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  return (await apiClient.get<T>(url, { params })).data;
}

export function CampRegisterPage() {
  const { campId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const canMaintain = me.data?.role === "medical" || me.data?.role === "admin";

  const [camperId, setCamperId] = useState("");
  const [cabin, setCabin] = useState("");
  const [groupName, setGroupName] = useState("");
  const [status, setStatus] = useState("registered");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["camp-register-context", campId],
    queryFn: async () => {
      const [camp, campers, registrations] = await Promise.all([
        get<CampDto>(`/camps/${campId}`),
        get<CamperDto[]>("/campers"),
        get<CampRegistrationDto[]>("/campregistrations", { campId }),
      ]);
      const taken = new Set(registrations.map((r) => r.camperId));
      return {
        camp,
        available: campers
          .filter((c) => !taken.has(c.camperId))
          .sort((a, b) =>
            `${a.surname} ${a.firstName}`.localeCompare(`${b.surname} ${b.firstName}`),
          ),
      };
    },
    enabled: Boolean(campId),
  });

  const register = useMutation({
    mutationFn: async () =>
      (
        await apiClient.post<CampRegistrationDto>("/campregistrations", {
          campId,
          camperId,
          cabin: cabin.trim() || null,
          groupName: groupName.trim() || null,
          status,
        })
      ).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["camp-hub", campId] });
      void queryClient.invalidateQueries({ queryKey: ["camp-registrations"] });
      navigate(`/camps/${campId}`);
    },
    onError: (e: Error & { response?: { status?: number } }) =>
      setError(
        e.response?.status === 403
          ? "You do not have permission to register campers."
          : e.response?.status === 409
            ? "That camper is already registered to this camp."
            : e.message,
      ),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;
  if (isError || !data) {
    return <div className="p-6 text-sm text-danger">Couldn&rsquo;t load this camp.</div>;
  }

  return (
    <div className="mx-auto max-w-[640px]">
      <Link
        to={`/camps/${campId}`}
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-secondary hover:text-primary"
      >
        <ArrowLeft size={14} /> Back to camp
      </Link>

      <h1 className="text-lg font-medium text-primary">Register a camper</h1>
      <p className="mb-4 mt-0.5 text-[12.5px] text-muted">
        Camp {data.camp.campNumber}, {data.camp.venue}
      </p>

      {error && (
        <div className="mb-3 rounded-control border border-danger-border bg-danger-tint px-3 py-2 text-[12.5px] text-danger">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          register.mutate();
        }}
      >
        <FormSection icon={<UserPlus size={15} />} title="Registration">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Camper" htmlFor="camper" className="col-span-2">
              <SearchSelect
                id="camper"
                value={camperId}
                onChange={setCamperId}
                placeholder="Search by name, file number or diagnosis…"
                emptyText="No camper matches"
                options={data.available.map((c) => ({
                  value: c.camperId,
                  label: `${c.firstName} ${c.surname}`,
                  hint: `${c.fileNumber}${c.diagnosis ? ` · ${c.diagnosis}` : ""}`,
                }))}
              />
            </FormField>
            <FormField label="Cabin" htmlFor="cabin">
              <Input
                id="cabin"
                value={cabin}
                onChange={(e) => setCabin(e.target.value)}
                placeholder="e.g. Lions"
              />
            </FormField>
            <FormField label="Group" htmlFor="groupName">
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            </FormField>
            <FormField label="Status" htmlFor="status">
              <Select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          {data.available.length === 0 && (
            <p className="mt-2 text-[12px] text-muted">
              Every camper on file is already registered to this camp.{" "}
              <Link to="/campers/new" className="text-accent hover:underline">
                Create a new camper
              </Link>
              .
            </p>
          )}
        </FormSection>

        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => navigate(`/camps/${campId}`)}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!camperId || !canMaintain || register.isPending}
          >
            {register.isPending ? "Registering…" : "Register camper"}
          </Button>
        </div>
        {!canMaintain && (
          <p className="mt-2 text-right text-[11.5px] text-muted">
            Registrations are maintained by medical or admin staff.
          </p>
        )}
      </form>
    </div>
  );
}
