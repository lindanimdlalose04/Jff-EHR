import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRoundCog } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { useMe } from "@/features/auth/use-me";
import { createCrew, fetchCrewMember, updateCrew, type CrewPayload } from "../api/crew.api";

/**
 * Routes "/crew/new" and "/crew/:crewId/edit". Tier 1 CRUD for the crew member
 * record, maintained by medical or admin staff.
 */

interface Draft {
  name: string;
  surname: string;
  idNumber: string;
  dob: string;
  role: string;
  photoUrl: string;
}

export function CrewFormPage() {
  const { crewId } = useParams();
  const isEdit = Boolean(crewId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const canMaintain = me.data?.role === "medical" || me.data?.role === "admin";
  const [error, setError] = useState<string | null>(null);

  const existing = useQuery({
    queryKey: ["crew", crewId],
    queryFn: () => fetchCrewMember(crewId!),
    enabled: isEdit,
  });

  const [draft, setDraft] = useState<Draft>({
    name: "",
    surname: "",
    idNumber: "",
    dob: "",
    role: "",
    photoUrl: "",
  });
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => {
    const c = existing.data;
    if (!c) return;
    setDraft({
      name: c.name,
      surname: c.surname,
      idNumber: c.idNumber,
      dob: c.dob ?? "",
      role: c.role,
      photoUrl: c.photoUrl ?? "",
    });
  }, [existing.data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: CrewPayload = {
        name: draft.name.trim(),
        surname: draft.surname.trim(),
        idNumber: draft.idNumber.trim(),
        dob: draft.dob || null,
        role: draft.role.trim(),
        photoUrl: draft.photoUrl.trim() || null,
      };
      if (isEdit) {
        await updateCrew(crewId!, payload);
        return crewId!;
      }
      return (await createCrew(payload)).crewId;
    },
    onSuccess: (savedId) => {
      void queryClient.invalidateQueries({ queryKey: ["crew-list"] });
      void queryClient.invalidateQueries({ queryKey: ["crew", savedId] });
      navigate(`/crew/${savedId}`);
    },
    onError: (e: Error & { response?: { status?: number } }) =>
      setError(
        e.response?.status === 403
          ? "You do not have permission to maintain crew."
          : e.response?.status === 409
            ? "A crew member with this ID number already exists."
            : e.message,
      ),
  });

  if (isEdit && existing.isLoading) {
    return <div className="p-6 text-sm text-muted">Loading crew member…</div>;
  }

  const valid = draft.name.trim() && draft.surname.trim() && draft.idNumber.trim() && draft.role.trim();
  const backTo = isEdit ? `/crew/${crewId}` : "/crew";

  return (
    <div className="mx-auto max-w-[640px]">
      <Breadcrumb
        items={
          isEdit
            ? [
                { label: "Crew", to: "/crew" },
                {
                  label: `${existing.data?.name ?? ""} ${existing.data?.surname ?? ""}`.trim(),
                  to: `/crew/${crewId}`,
                },
                { label: "Edit" },
              ]
            : [{ label: "Crew", to: "/crew" }, { label: "New crew member" }]
        }
      />

      <h1 className="mb-4 text-lg font-medium text-primary">
        {isEdit ? `Edit ${existing.data?.name} ${existing.data?.surname}` : "New crew member"}
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
        <FormSection icon={<UserRoundCog size={15} />} title="Crew member">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First name" htmlFor="name">
              <Input id="name" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
            </FormField>
            <FormField label="Surname" htmlFor="surname">
              <Input id="surname" value={draft.surname} onChange={(e) => set({ surname: e.target.value })} />
            </FormField>
            <FormField label="ID number" htmlFor="idNumber">
              <Input id="idNumber" value={draft.idNumber} onChange={(e) => set({ idNumber: e.target.value })} />
            </FormField>
            <FormField label="Date of birth" htmlFor="dob">
              <Input id="dob" type="date" value={draft.dob} onChange={(e) => set({ dob: e.target.value })} />
            </FormField>
            <FormField label="Role" htmlFor="role">
              <Input
                id="role"
                value={draft.role}
                onChange={(e) => set({ role: e.target.value })}
                placeholder="e.g. nurse, doctor, camp admin, volunteer"
              />
            </FormField>
            <FormField label="Photo URL" htmlFor="photoUrl">
              <Input
                id="photoUrl"
                value={draft.photoUrl}
                onChange={(e) => set({ photoUrl: e.target.value })}
                placeholder="https://…"
              />
            </FormField>
          </div>
        </FormSection>

        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => navigate(backTo)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!valid || !canMaintain || save.isPending}>
            {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create crew member"}
          </Button>
        </div>
        {!canMaintain && (
          <p className="mt-2 text-right text-[11.5px] text-muted">
            Crew records are maintained by medical or admin staff.
          </p>
        )}
      </form>
    </div>
  );
}
