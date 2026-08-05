import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Droplet, HeartPulse, Pill, ShieldCheck } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { useMe } from "@/features/auth/use-me";
import {
  createCrewCheckin,
  fetchCrewDetail,
  updateCrewCheckin,
  type CheckinPayload,
} from "../api/crew.api";

/**
 * Route "/crew/:crewId/checkin". The crew medical check-in (spec/forms/06). Its
 * own form, not a reskin of the camper arrival check: it carries the two
 * crew-specific flags (broviac/port and blood count) and the crew indemnity /
 * medical release acknowledgement.
 *
 * Flagged as specified-not-built for now (would extend the entity): the form's
 * TB screening triplet, assistance-with-daily-living block, prosthesis, and
 * other-comments fields. Priority 3, deliberately partial.
 */

interface Draft {
  allergies: string;
  hasBroviacPort: boolean;
  hasBloodCount: boolean;
  eyesight: string;
  hearing: string;
  mobilityAids: string;
  currentMedications: string;
  medicalReleaseSigned: boolean;
}

const empty: Draft = {
  allergies: "",
  hasBroviacPort: false,
  hasBloodCount: false,
  eyesight: "",
  hearing: "",
  mobilityAids: "",
  currentMedications: "",
  medicalReleaseSigned: false,
};

export function CrewCheckinPage() {
  const { crewId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const canRecord = me.data?.role === "medical" || me.data?.role === "admin";
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["crew-detail", crewId],
    queryFn: () => fetchCrewDetail(crewId),
    enabled: Boolean(crewId),
  });

  const [draft, setDraft] = useState<Draft>(empty);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => {
    const c = data?.checkin;
    if (!c) return;
    setDraft({
      allergies: c.allergies ?? "",
      hasBroviacPort: c.hasBroviacPort,
      hasBloodCount: c.hasBloodCount,
      eyesight: c.eyesight ?? "",
      hearing: c.hearing ?? "",
      mobilityAids: c.mobilityAids ?? "",
      currentMedications: c.currentMedications ?? "",
      medicalReleaseSigned: c.medicalReleaseSigned,
    });
  }, [data?.checkin]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: CheckinPayload = {
        allergies: draft.allergies.trim() || null,
        hasBroviacPort: draft.hasBroviacPort,
        hasBloodCount: draft.hasBloodCount,
        eyesight: draft.eyesight.trim() || null,
        hearing: draft.hearing.trim() || null,
        mobilityAids: draft.mobilityAids.trim() || null,
        currentMedications: draft.currentMedications.trim() || null,
        medicalReleaseSigned: draft.medicalReleaseSigned,
      };
      if (data?.checkin) {
        await updateCrewCheckin(data.checkin.checkinId, payload);
      } else {
        await createCrewCheckin(crewId, data!.activeCamp!.campId, payload);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["crew-detail", crewId] });
      void queryClient.invalidateQueries({ queryKey: ["crew-list"] });
      navigate(`/crew/${crewId}`);
    },
    onError: (e: Error & { response?: { status?: number } }) =>
      setError(
        e.response?.status === 403
          ? "You do not have permission to record crew check-ins."
          : e.message,
      ),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;
  if (isError || !data) {
    return <div className="p-6 text-sm text-danger">Couldn&rsquo;t load this crew member.</div>;
  }
  if (!data.activeCamp) {
    return (
      <div className="mx-auto max-w-[720px]">
        <Breadcrumb
          items={[
            { label: "Crew", to: "/crew" },
            { label: `${data.crew.name} ${data.crew.surname}`, to: `/crew/${crewId}` },
            { label: "Medical check-in" },
          ]}
        />
        <div className="rounded-card border border-card bg-surface p-6 text-center text-[13px] text-muted">
          There is no active camp to check this crew member into.
        </div>
      </div>
    );
  }

  const { crew, activeCamp, checkin } = data;

  return (
    <div className="mx-auto max-w-[720px]">
      <Breadcrumb
        items={[
          { label: "Crew", to: "/crew" },
          { label: `${crew.name} ${crew.surname}`, to: `/crew/${crewId}` },
          { label: "Medical check-in" },
        ]}
      />

      <h1 className="text-lg font-medium text-primary">Crew medical check-in</h1>
      <p className="mb-4 mt-0.5 text-[12.5px] text-muted">
        {crew.name} {crew.surname} · Camp {activeCamp.campNumber}, {activeCamp.venue}
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
          save.mutate();
        }}
      >
        <FormSection icon={<HeartPulse size={15} />} title="Assessment">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Allergies" htmlFor="allergies" className="col-span-2">
              <Input id="allergies" value={draft.allergies} onChange={(e) => set({ allergies: e.target.value })} />
            </FormField>
            <FormField label="Eyesight" htmlFor="eyesight">
              <Input id="eyesight" value={draft.eyesight} onChange={(e) => set({ eyesight: e.target.value })} />
            </FormField>
            <FormField label="Hearing" htmlFor="hearing">
              <Input id="hearing" value={draft.hearing} onChange={(e) => set({ hearing: e.target.value })} />
            </FormField>
            <FormField label="Mobility aids" htmlFor="mobilityAids" className="col-span-2">
              <Input id="mobilityAids" value={draft.mobilityAids} onChange={(e) => set({ mobilityAids: e.target.value })} />
            </FormField>
          </div>
        </FormSection>

        <FormSection icon={<Droplet size={15} />} title="Crew-specific" tone="danger">
          <p className="mb-2 text-[11.5px] text-muted">
            These two fields are on the crew form and not the camper form.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-[12.5px] text-primary">
              <input
                type="checkbox"
                className="accent-accent"
                checked={draft.hasBroviacPort}
                onChange={(e) => set({ hasBroviacPort: e.target.checked })}
              />
              Broviac / Port-a-cath
            </label>
            <label className="flex items-center gap-2 text-[12.5px] text-primary">
              <input
                type="checkbox"
                className="accent-accent"
                checked={draft.hasBloodCount}
                onChange={(e) => set({ hasBloodCount: e.target.checked })}
              />
              Blood count
            </label>
          </div>
        </FormSection>

        <FormSection icon={<Pill size={15} />} title="Medication">
          <FormField label="Current medications" htmlFor="currentMedications">
            <Input
              id="currentMedications"
              value={draft.currentMedications}
              onChange={(e) => set({ currentMedications: e.target.value })}
            />
          </FormField>
        </FormSection>

        <FormSection icon={<ShieldCheck size={15} />} title="Indemnity and medical release">
          <label className="flex items-start gap-2 text-[12.5px] text-primary">
            <input
              type="checkbox"
              className="mt-0.5 accent-accent"
              checked={draft.medicalReleaseSigned}
              onChange={(e) => set({ medicalReleaseSigned: e.target.checked })}
            />
            <span>
              Indemnity and medical release signed: the crew member holds the organisers
              harmless, authorises emergency treatment and referral, and acknowledges POPIA.
              No participant is accepted to camp without this.
            </span>
          </label>
        </FormSection>

        <div className="flex justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={() => navigate(`/crew/${crewId}`)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!canRecord || save.isPending}>
            {save.isPending ? "Saving…" : checkin ? "Save check-in" : "Check in"}
          </Button>
        </div>
        {!canRecord && (
          <p className="mt-2 text-right text-[11.5px] text-muted">
            Crew check-ins are recorded by medical or admin staff.
          </p>
        )}
      </form>
    </div>
  );
}
