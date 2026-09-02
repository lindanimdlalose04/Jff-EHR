import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartPulse, NotebookPen, Pill, ShieldCheck } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { RecordBanner } from "@/components/ui/record-chrome";
import { Input, Textarea } from "@/components/ui/field";
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
  eyesight: string;
  hearing: string;
  currentMedications: string;
  comments: string;
  medicalReleaseSigned: boolean;
}

const empty: Draft = {
  allergies: "",
  eyesight: "",
  hearing: "",
  currentMedications: "",
  comments: "",
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
      eyesight: c.eyesight ?? "",
      hearing: c.hearing ?? "",
      currentMedications: c.currentMedications ?? "",
      comments: c.comments ?? "",
      medicalReleaseSigned: c.medicalReleaseSigned,
    });
  }, [data?.checkin]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: CheckinPayload = {
        allergies: draft.allergies.trim() || null,
        eyesight: draft.eyesight.trim() || null,
        hearing: draft.hearing.trim() || null,
        currentMedications: draft.currentMedications.trim() || null,
        comments: draft.comments.trim() || null,
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
        <div className="border border-card bg-surface p-6 text-center text-base text-muted">
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

      <div className="mb-3 border border-card bg-surface">
        <RecordBanner
          title={`${crew.surname.toUpperCase()}, ${crew.name}`}
          meta={
            <>
              {crew.role} &middot; medical check-in for camp {activeCamp.campNumber},{" "}
              {activeCamp.venue}
            </>
          }
        />
      </div>

      {error && (
        <div className="mb-3 border border-danger bg-danger-tint px-3 py-2 text-sm font-semibold text-danger-text" role="alert">
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
          </div>
        </FormSection>

        <FormSection icon={<NotebookPen size={15} />} title="Comments">
          <FormField label="Anything clinically notable" htmlFor="comments">
            <Textarea
              id="comments"
              value={draft.comments}
              onChange={(e) => set({ comments: e.target.value })}
              placeholder="Broviac / port, blood count, mobility, or anything else worth noting"
            />
          </FormField>
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
          <label className="flex items-start gap-2 text-sm text-primary">
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
          <p className="mt-2 text-right text-xs text-muted">
            Crew check-ins are recorded by medical or admin staff.
          </p>
        )}
      </form>
    </div>
  );
}
