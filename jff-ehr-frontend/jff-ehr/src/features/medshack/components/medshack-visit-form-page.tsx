import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  ClipboardList,
  FilePenLine,
  Plus,
  Stethoscope,
  Syringe,
  Trash2,
} from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { FormSection } from "@/components/forms/form-section";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { useMe } from "@/features/auth/use-me";
import { ageYears, formatDate } from "@/lib/display";
import {
  createVisitWithTreatments,
  fetchVisitFormContext,
  type TreatmentPayload,
} from "../api/medshack.api";

/**
 * Route "/medshack/new". The MedShack visit form (spec/forms/03). The treatment
 * section is a repeating table (time, treatment, outcome), not a single text
 * box: each row becomes an append-only medshack_treatments record numbered
 * server-side. The nurse signature is the signed-in user; the doctor
 * countersignature is optional.
 */

interface TreatmentRow {
  key: number;
  time: string;
  description: string;
  outcome: string;
}

const ORGANISATION = "Just Footprints Foundation";

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function MedShackVisitFormPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const canRecord = me.data?.role === "medical";

  const { data: context, isLoading, isError } = useQuery({
    queryKey: ["medshack-form-context"],
    queryFn: fetchVisitFormContext,
  });

  const [registrationId, setRegistrationId] = useState("");
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [visitTime, setVisitTime] = useState(nowTime);
  const [reason, setReason] = useState("");
  const [accompaniedBy, setAccompaniedBy] = useState("");
  const [temperature, setTemperature] = useState("");
  const [pulse, setPulse] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [signsSymptoms, setSignsSymptoms] = useState("");
  const [findings, setFindings] = useState("");
  const [adviceGiven, setAdviceGiven] = useState("");
  const [nursingReport, setNursingReport] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [treatments, setTreatments] = useState<TreatmentRow[]>([
    { key: 1, time: nowTime(), description: "", outcome: "" },
  ]);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const visitAt = new Date(`${visitDate}T${visitTime}:00`).toISOString();
      const rows: TreatmentPayload[] = treatments
        .filter((t) => t.description.trim())
        .map((t) => ({
          treatmentTime: new Date(`${visitDate}T${(t.time || visitTime)}:00`).toISOString(),
          treatmentDescription: t.description.trim(),
          outcome: t.outcome.trim() || null,
        }));

      return createVisitWithTreatments(
        {
          registrationId,
          visitAt,
          reason: reason.trim(),
          accompaniedBy: accompaniedBy.trim() || null,
          temperature: temperature ? Number(temperature) : null,
          pulse: pulse ? Number(pulse) : null,
          bloodPressure: bloodPressure.trim() || null,
          oxygenSaturation: oxygenSaturation ? Number(oxygenSaturation) : null,
          medicalHistory: medicalHistory.trim() || null,
          signsSymptoms: signsSymptoms.trim() || null,
          findings: findings.trim() || null,
          nursingReport: nursingReport.trim() || null,
          adviceGiven: adviceGiven.trim() || null,
          doctorId: doctorId || null,
        },
        rows,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["medshack-visits"] });
      void queryClient.invalidateQueries({ queryKey: ["camper-detail"] });
      navigate("/medshack");
    },
    onError: (e: Error & { response?: { status?: number } }) =>
      setError(
        e.response?.status === 403
          ? "Only the medical team may record MedShack visits."
          : e.message,
      ),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;
  if (isError || !context) {
    return <div className="p-6 text-sm text-danger">Couldn&rsquo;t load the visit form.</div>;
  }

  const selected = context.roster.find((r) => r.registrationId === registrationId);
  const valid = registrationId && reason.trim() && visitDate && visitTime;

  const addRow = () =>
    setTreatments((rows) => [
      ...rows,
      { key: Math.max(0, ...rows.map((r) => r.key)) + 1, time: nowTime(), description: "", outcome: "" },
    ]);
  const removeRow = (key: number) =>
    setTreatments((rows) => (rows.length === 1 ? rows : rows.filter((r) => r.key !== key)));
  const setRow = (key: number, patch: Partial<TreatmentRow>) =>
    setTreatments((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <div className="mx-auto max-w-[820px]">
      <Link
        to="/medshack"
        className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-secondary hover:text-primary"
      >
        <ArrowLeft size={14} /> MedShack
      </Link>

      <h1 className="text-lg font-medium text-primary">MedShack visit</h1>
      <p className="mb-4 mt-0.5 text-[12.5px] text-muted">
        {ORGANISATION}
        {context.camp ? ` · Camp ${context.camp.campNumber}, ${context.camp.venue}` : ""}
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
        <FormSection icon={<Stethoscope size={15} />} title="Visit">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Camper" htmlFor="camper" className="col-span-2">
              <Select
                id="camper"
                value={registrationId}
                onChange={(e) => setRegistrationId(e.target.value)}
              >
                <option value="">Select a camper</option>
                {context.roster.map((r) => (
                  <option key={r.registrationId} value={r.registrationId}>
                    {r.camper.firstName} {r.camper.surname} ({r.camper.fileNumber})
                  </option>
                ))}
              </Select>
            </FormField>

            {selected && (
              <div className="col-span-2 rounded-control bg-header-tint px-3 py-2 text-[12px] text-secondary">
                {selected.camper.sex === "M" ? "Male" : "Female"} ·{" "}
                {ageYears(selected.camper.dob)} years · born{" "}
                {formatDate(selected.camper.dob)}
                {selected.groupName ? ` · group ${selected.groupName}` : ""}
                {selected.cabin ? ` · cabin ${selected.cabin}` : ""}
                <span className="ml-1 text-muted">(from the camper record)</span>
              </div>
            )}

            <FormField label="Date" htmlFor="visitDate">
              <Input
                id="visitDate"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
              />
            </FormField>
            <FormField label="Time" htmlFor="visitTime">
              <Input
                id="visitTime"
                type="time"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
              />
            </FormField>
            <FormField label="Person accompanying" htmlFor="accompaniedBy">
              <Input
                id="accompaniedBy"
                value={accompaniedBy}
                onChange={(e) => setAccompaniedBy(e.target.value)}
                placeholder="e.g. Cabin leader"
              />
            </FormField>
            <FormField label="Reason for the visit" htmlFor="reason">
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Fell during soccer"
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection icon={<Activity size={15} />} title="Vitals">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FormField label="Temperature (°C)" htmlFor="temperature">
              <Input
                id="temperature"
                inputMode="decimal"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="36.8"
              />
            </FormField>
            <FormField label="Pulse" htmlFor="pulse">
              <Input
                id="pulse"
                inputMode="numeric"
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                placeholder="88"
              />
            </FormField>
            <FormField label="Blood pressure" htmlFor="bloodPressure">
              <Input
                id="bloodPressure"
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                placeholder="110/70"
              />
            </FormField>
            <FormField label="SpO2 (%)" htmlFor="oxygenSaturation">
              <Input
                id="oxygenSaturation"
                inputMode="numeric"
                value={oxygenSaturation}
                onChange={(e) => setOxygenSaturation(e.target.value)}
                placeholder="99"
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection icon={<ClipboardList size={15} />} title="Clinical">
          <div className="grid gap-3">
            <FormField label="Medical history" htmlFor="medicalHistory">
              <Textarea
                id="medicalHistory"
                value={medicalHistory}
                onChange={(e) => setMedicalHistory(e.target.value)}
              />
            </FormField>
            <FormField label="Signs and symptoms" htmlFor="signsSymptoms">
              <Textarea
                id="signsSymptoms"
                value={signsSymptoms}
                onChange={(e) => setSignsSymptoms(e.target.value)}
              />
            </FormField>
            <FormField label="Findings on examination" htmlFor="findings">
              <Textarea
                id="findings"
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection icon={<Syringe size={15} />} title="Treatment given">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-header-tint">
                  <th className="w-[92px] border-b border-divider px-2 py-1.5 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted">
                    Time
                  </th>
                  <th className="border-b border-divider px-2 py-1.5 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted">
                    Treatment
                  </th>
                  <th className="border-b border-divider px-2 py-1.5 text-left text-[11.5px] font-semibold uppercase tracking-wide text-muted">
                    Outcome
                  </th>
                  <th className="w-[42px] border-b border-divider" />
                </tr>
              </thead>
              <tbody>
                {treatments.map((row) => (
                  <tr key={row.key}>
                    <td className="border-b border-divider px-1.5 py-1.5 align-top">
                      <Input
                        type="time"
                        aria-label="Treatment time"
                        value={row.time}
                        onChange={(e) => setRow(row.key, { time: e.target.value })}
                      />
                    </td>
                    <td className="border-b border-divider px-1.5 py-1.5 align-top">
                      <Input
                        aria-label="Treatment"
                        value={row.description}
                        onChange={(e) => setRow(row.key, { description: e.target.value })}
                        placeholder="e.g. Wound irrigated with saline"
                      />
                    </td>
                    <td className="border-b border-divider px-1.5 py-1.5 align-top">
                      <Input
                        aria-label="Outcome"
                        value={row.outcome}
                        onChange={(e) => setRow(row.key, { outcome: e.target.value })}
                        placeholder="e.g. Clean wound bed"
                      />
                    </td>
                    <td className="border-b border-divider px-1 py-1.5 text-center align-top">
                      <button
                        type="button"
                        aria-label="Remove treatment row"
                        className="rounded p-1.5 text-secondary hover:bg-danger-tint hover:text-danger disabled:opacity-40"
                        disabled={treatments.length === 1}
                        onClick={() => removeRow(row.key)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <p className="text-[11px] text-muted">
              Each row is saved as its own treatment record, numbered in this order.
            </p>
            <Button type="button" variant="secondary" className="h-8 px-3" onClick={addRow}>
              <Plus size={13} /> Add treatment row
            </Button>
          </div>
        </FormSection>

        <FormSection icon={<FilePenLine size={15} />} title="Advice and report">
          <div className="grid gap-3">
            <FormField
              label="Advice to the crew member accompanying the camper"
              htmlFor="adviceGiven"
            >
              <Textarea
                id="adviceGiven"
                value={adviceGiven}
                onChange={(e) => setAdviceGiven(e.target.value)}
                placeholder="One piece of advice per line"
              />
            </FormField>
            <FormField label="Nursing report" htmlFor="nursingReport">
              <Textarea
                id="nursingReport"
                value={nursingReport}
                onChange={(e) => setNursingReport(e.target.value)}
              />
            </FormField>
            <FormField label="Camp doctor countersignature (optional)" htmlFor="doctorId">
              <Select id="doctorId" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                <option value="">No doctor countersignature</option>
                {context.doctors.map((d) => (
                  <option key={d.crewId} value={d.crewId}>
                    {d.name} {d.surname}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </FormSection>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11.5px] text-muted">
            Signed as {me.data ? `${me.data.name} ${me.data.surname}` : "the camp nurse"}. A saved
            visit cannot be edited, only corrected by a further record.
          </p>
          <div className="flex gap-2.5">
            <Button type="button" variant="secondary" onClick={() => navigate("/medshack")}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!valid || !canRecord || save.isPending}>
              {save.isPending ? "Saving…" : "Save visit"}
            </Button>
          </div>
        </div>
        {!canRecord && (
          <p className="mt-2 text-right text-[11.5px] text-muted">
            Recording visits is limited to the medical team.
          </p>
        )}
      </form>
    </div>
  );
}
