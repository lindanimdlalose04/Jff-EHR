import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, ListChecks, ShieldQuestion, TriangleAlert } from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { SearchSelect } from "@/components/ui/search-select";
import { useMe } from "@/features/auth/use-me";
import { useActiveCamp } from "@/app/active-camp-context";
import { ageYears, formatDate } from "@/lib/display";
import {
  CONTRIBUTING_FACTORS,
  EVENT_TYPES,
  fetchIncidentFormContext,
  fileIncident,
} from "../api/incidents.api";

/**
 * Route "/incidents/new". Medication / treatment event / near miss report
 * (spec/forms/04 + spec/wireframes/03). The option lists come from the paper
 * form and are exhaustive: nine initial impressions, three contributing
 * factors. Once filed the report is never editable, only reviewed.
 */

function nowLocal(): { date: string; time: string } {
  const d = new Date();
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

export function IncidentFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const canFile = me.data?.role === "medical";
  const { selectedCampId } = useActiveCamp();
  const [start] = useState(nowLocal);

  const { data: context, isLoading, isError } = useQuery({
    queryKey: ["incident-form-context", selectedCampId],
    queryFn: () => fetchIncidentFormContext(selectedCampId),
  });

  const [registrationId, setRegistrationId] = useState("");
  const [eventDate, setEventDate] = useState(start.date);
  const [eventTime, setEventTime] = useState(start.time);
  const [discoveryDate, setDiscoveryDate] = useState(start.date);
  const [discoveryTime, setDiscoveryTime] = useState(start.time);
  const [description, setDescription] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [factors, setFactors] = useState<string[]>([]);
  const [immediateAction, setImmediateAction] = useState("");
  const [doctorNotified, setDoctorNotified] = useState("");
  const [noTreatmentOrdered, setNoTreatmentOrdered] = useState(false);
  const [treatmentOrdered, setTreatmentOrdered] = useState("");
  const [error, setError] = useState<string | null>(null);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const file = useMutation({
    mutationFn: () =>
      fileIncident({
        registrationId,
        eventAt: new Date(`${eventDate}T${eventTime}:00`).toISOString(),
        discoveryAt: new Date(`${discoveryDate}T${discoveryTime}:00`).toISOString(),
        description: description.trim(),
        // Stored in the form's own order, not the order they were clicked.
        eventTypes: JSON.stringify(EVENT_TYPES.filter((t) => types.includes(t))),
        contributingFactors: factors.length
          ? JSON.stringify(CONTRIBUTING_FACTORS.filter((f) => factors.includes(f)))
          : null,
        immediateAction: immediateAction.trim(),
        doctorNotified: doctorNotified.trim() || null,
        noTreatmentOrdered,
        treatmentOrdered: noTreatmentOrdered ? null : treatmentOrdered.trim() || null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
      navigate("/incidents");
    },
    onError: (e: Error & { response?: { status?: number } }) =>
      setError(
        e.response?.status === 403
          ? "Only the medical team may file event reports."
          : e.message,
      ),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;
  if (isError || !context) {
    return <div className="p-6 text-sm text-danger">Couldn&rsquo;t load the report form.</div>;
  }

  const selected = context.roster.find((r) => r.registrationId === registrationId);
  const valid =
    registrationId && description.trim() && immediateAction.trim() && types.length > 0;

  return (
    <div className="mx-auto max-w-[820px]">
      <Link
        to="/incidents"
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-secondary hover:text-primary"
      >
        <ArrowLeft size={14} /> Incidents
      </Link>

      <h1 className="text-lg font-medium text-primary">
        Medication / treatment event / near miss
      </h1>
      <p className="mb-4 mt-0.5 text-[12.5px] text-muted">
        Append-only, reviewed by a doctor, never editable once filed
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
          file.mutate();
        }}
      >
        <FormSection icon={<TriangleAlert size={15} />} title="Camper and timing">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Camper" htmlFor="camper" className="col-span-2">
              <SearchSelect
                id="camper"
                value={registrationId}
                onChange={setRegistrationId}
                placeholder="Search by name, file number or diagnosis…"
                emptyText="No camper matches"
                options={context.roster.map((r) => ({
                  value: r.registrationId,
                  label: `${r.camper.firstName} ${r.camper.surname}`,
                  hint: `${r.camper.fileNumber}${r.diagnosis ? ` · ${r.diagnosis}` : ""}`,
                }))}
              />
            </FormField>

            {selected && (
              <div className="col-span-2 rounded-control bg-header-tint px-3 py-2 text-[12px] text-secondary">
                Born {formatDate(selected.camper.dob)} ({ageYears(selected.camper.dob)} years)
                {selected.cabin ? ` · cabin ${selected.cabin}` : ""} · primary diagnosis:{" "}
                {selected.diagnosis ?? "not recorded"}
                <span className="ml-1 text-muted">(from the camper record)</span>
              </div>
            )}

            <FormField label="Date of event" htmlFor="eventDate">
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </FormField>
            <FormField label="Time of event" htmlFor="eventTime">
              <Input
                id="eventTime"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </FormField>
            <FormField label="Date of discovery" htmlFor="discoveryDate">
              <Input
                id="discoveryDate"
                type="date"
                value={discoveryDate}
                onChange={(e) => setDiscoveryDate(e.target.value)}
              />
            </FormField>
            <FormField label="Time of discovery" htmlFor="discoveryTime">
              <Input
                id="discoveryTime"
                type="time"
                value={discoveryTime}
                onChange={(e) => setDiscoveryTime(e.target.value)}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          icon={<ListChecks size={15} />}
          title="Initial impression"
          hint="from the actual form"
          tone="danger"
        >
          <div className="grid gap-2 sm:grid-cols-3">
            {EVENT_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-2 text-[12.5px] text-primary">
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={types.includes(t)}
                  onChange={() => toggle(types, setTypes, t)}
                />
                {t}
              </label>
            ))}
          </div>
          {types.length === 0 && (
            <p className="mt-2 text-[11.5px] text-muted">Select at least one.</p>
          )}
        </FormSection>

        <FormSection
          icon={<ShieldQuestion size={15} />}
          title="Contributing factors"
          hint="only three on the form"
        >
          <div className="grid gap-2 sm:grid-cols-3">
            {CONTRIBUTING_FACTORS.map((f) => (
              <label key={f} className="flex items-center gap-2 text-[12.5px] text-primary">
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={factors.includes(f)}
                  onChange={() => toggle(factors, setFactors, f)}
                />
                {f}
              </label>
            ))}
          </div>
        </FormSection>

        <FormSection icon={<ClipboardList size={15} />} title="Description and response">
          <div className="grid gap-3">
            <FormField label="Description of event" htmlFor="description">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What happened, factually"
              />
            </FormField>
            <FormField label="Immediate action taken" htmlFor="immediateAction">
              <Textarea
                id="immediateAction"
                value={immediateAction}
                onChange={(e) => setImmediateAction(e.target.value)}
              />
            </FormField>
            <FormField label="Notification of camp doctor" htmlFor="doctorNotified">
              <Input
                id="doctorNotified"
                value={doctorNotified}
                onChange={(e) => setDoctorNotified(e.target.value)}
                placeholder="Who was notified, and when"
              />
            </FormField>
            <div>
              <label className="flex items-center gap-2 text-[12.5px] text-primary">
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={noTreatmentOrdered}
                  onChange={(e) => setNoTreatmentOrdered(e.target.checked)}
                />
                No treatment ordered
              </label>
              {!noTreatmentOrdered && (
                <div className="mt-2">
                  <Input
                    aria-label="Treatment ordered"
                    value={treatmentOrdered}
                    onChange={(e) => setTreatmentOrdered(e.target.value)}
                    placeholder="Treatment ordered"
                  />
                </div>
              )}
            </div>
          </div>
        </FormSection>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[400px] text-[11.5px] text-muted">
            Reported by {me.data ? `${me.data.name} ${me.data.surname}` : "the reporter"}. Not yet
            reviewed: a medical person adds the investigation and corrective action plan after
            filing.
          </p>
          <div className="flex gap-2.5">
            <Button type="button" variant="secondary" onClick={() => navigate("/incidents")}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!valid || !canFile || file.isPending}>
              {file.isPending ? "Filing…" : "File report"}
            </Button>
          </div>
        </div>
        {!canFile && (
          <p className="mt-2 text-right text-[11.5px] text-muted">
            Filing reports is limited to the medical team.
          </p>
        )}
      </form>
    </div>
  );
}
