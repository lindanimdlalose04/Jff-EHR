import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Check, FileDown, Pill, TriangleAlert } from "lucide-react";
import { format } from "date-fns";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { exportMedicationAdministrationRecord } from "@/lib/mar-pdf";
import { useMe } from "@/features/auth/use-me";
import { RecordBanner, SectionHead, Toolbar, type BannerFlag } from "@/components/ui/record-chrome";
import { formatSex } from "@/lib/display";
import {
  fetchCamperGrid,
  isPrescriptionActiveOn,
  parseScheduledTimes,
  recordDose,
  resolveSlot,
  toLocalDay,
  type DoseSlot,
} from "../api/medications.api";

/**
 * Route "/registrations/:regId/medications". The weekly Sunday to Saturday
 * grid from the Medications and Treatments paper form (spec/forms/05): rows
 * are each prescribed medication and time, columns are the seven days, cells
 * are dose slots. Recording a cell writes a medication_doses row stamped with
 * who and when, which is the "electronically signs that Gail gave it"
 * requirement. Missed is computed, never set by hand.
 */

function startOfWeekSunday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

export function MedicationGridPage() {
  const { regId = "" } = useParams();
  const queryClient = useQueryClient();
  const me = useMe();
  const canRecord = me.data?.role === "medical";
  const [weekOffset, setWeekOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => new Date());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["medication-grid", regId],
    queryFn: () => fetchCamperGrid(regId),
    enabled: Boolean(regId),
  });

  const record = useMutation({
    mutationFn: (slot: DoseSlot) =>
      recordDose({ prescriptionId: slot.prescriptionId, scheduledAt: slot.scheduledAt }),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["medication-grid", regId] });
      void queryClient.invalidateQueries({ queryKey: ["medication-rounds"] });
    },
    onError: (e: Error & { response?: { status?: number } }) =>
      setError(
        e.response?.status === 403
          ? "Only the medical team may record doses."
          : e.message,
      ),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading medication grid…</div>;
  if (isError || !data) {
    return <div className="p-6 text-sm text-danger">Couldn&rsquo;t load the medication grid.</div>;
  }

  const { camper, camp, registration, arrivalCheck, precamp, prescriptions, dosesByPrescription } = data;

  // Default to the week containing today when today falls inside the camp,
  // otherwise the week the camp starts in.
  const today = new Date();
  const campStart = camp ? new Date(`${camp.startDate}T00:00:00`) : today;
  const campEnd = camp ? new Date(`${camp.endDate}T23:59:59`) : today;
  const anchor = today >= campStart && today <= campEnd ? today : campStart;
  const weekStart = startOfWeekSunday(anchor);
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Rows: one per prescription per scheduled time.
  const rows = prescriptions.flatMap((p) =>
    parseScheduledTimes(p.scheduledTimes).map((time) => ({ prescription: p, time })),
  );

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Campers", to: "/campers" },
          { label: `${camper.firstName} ${camper.surname}`, to: `/campers/${camper.camperId}` },
          { label: "Medication grid" },
        ]}
      />

      <div className="border border-card bg-surface">
        {(() => {
          const flags: BannerFlag[] = [];
          if (arrivalCheck?.hasAllergies) {
            flags.push({
              label: arrivalCheck.allergiesDetail
                ? `Allergy: ${arrivalCheck.allergiesDetail}`
                : "Allergies on file",
              tone: "danger",
            });
          } else if (!arrivalCheck) {
            flags.push({ label: "Not yet arrival checked", tone: "warning" });
          }
          return (
            <RecordBanner
              title={`${camper.surname.toUpperCase()}, ${camper.firstName}`}
              flags={flags}
              meta={
                <>
                  <span className="mono">{camper.fileNumber}</span> &middot; {formatSex(camper.sex)} &middot;{" "}
                  {camp ? `Camp ${camp.campNumber}, ${camp.venue}` : "Camp"} &middot; cabin{" "}
                  {registration.cabin ?? "not set"} &middot;{" "}
                  {precamp?.diagnosis ?? camper.diagnosis ?? "no diagnosis recorded"}
                </>
              }
            />
          );
        })()}
      </div>

      {error && (
        <div className="mt-3 rounded-control border border-danger-border bg-danger-tint px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-4 border border-card bg-surface">
      <SectionHead
        title="Medication and treatment record"
        hint={`Week of ${format(weekStart, "d MMMM yyyy")}`}
      />
      <Toolbar>
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant="secondary"
            className="h-8 px-3"
            onClick={() => exportMedicationAdministrationRecord(data)}
          >
            <FileDown size={13} /> Export PDF
          </Button>
          <Link to={`/registrations/${regId}/prescriptions`}>
            <Button variant="secondary" className="h-8 px-3">
              <Pill size={13} /> Prescriptions
            </Button>
          </Link>
          <Button
            variant="secondary"
            className="h-8 px-2"
            aria-label="Previous week"
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            <ChevronLeft size={15} />
          </Button>
          <Button
            variant="secondary"
            className="h-8 px-2"
            aria-label="Next week"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            <ChevronRight size={15} />
          </Button>
        </div>
      </Toolbar>

      {rows.length === 0 ? (
        <div className="p-6 text-center text-base text-muted">
          No prescriptions for this camp yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-header-tint">
                <th className="sticky left-0 z-10 min-w-[190px] border-b border-r border-divider bg-header-tint px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Medication
                </th>
                {days.map((d) => (
                  <th
                    key={d.toISOString()}
                    className="border-b border-divider px-2 py-2 text-center text-xs font-semibold text-muted"
                  >
                    <div>{format(d, "EEE")}</div>
                    <div className="font-normal">{format(d, "d MMM")}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ prescription, time }) => (
                <tr key={`${prescription.prescriptionId}-${time}`}>
                  <td className="sticky left-0 z-10 border-b border-r border-divider bg-surface px-3 py-2 align-top">
                    <div className="font-medium text-primary">{prescription.medicationName}</div>
                    <div className="text-xs text-muted">
                      {prescription.dose}
                      {prescription.route ? `, ${prescription.route}` : ""} · {time}
                    </div>
                  </td>
                  {days.map((d) => {
                    const day = toLocalDay(d);
                    const inRange = isPrescriptionActiveOn(prescription, day, camp);
                    if (!inRange) {
                      return (
                        <td
                          key={day}
                          className="border-b border-divider px-2 py-2 text-center text-muted"
                        >
                          <span className="text-xs">-</span>
                        </td>
                      );
                    }
                    const slot = resolveSlot(
                      prescription.prescriptionId,
                      day,
                      time,
                      dosesByPrescription[prescription.prescriptionId] ?? [],
                      now,
                    );
                    return (
                      <td key={day} className="border-b border-divider px-1.5 py-1.5 text-center">
                        <DoseCell
                          slot={slot}
                          canRecord={canRecord}
                          busy={record.isPending}
                          onRecord={() => record.mutate(slot)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-divider px-4 py-2.5 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 bg-success-tint ring-1 ring-success" />
          given
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 bg-danger-tint ring-1 ring-danger" />
          missed (time passed, not recorded)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 bg-field ring-1 ring-field-border" />
          pending
        </span>
        {!canRecord && <span>Recording is limited to the medical team.</span>}
      </div>
      </div>
    </div>
  );
}

function DoseCell({
  slot,
  canRecord,
  busy,
  onRecord,
}: {
  slot: DoseSlot;
  canRecord: boolean;
  busy: boolean;
  onRecord: () => void;
}) {
  if (slot.state === "given") {
    const dose = slot.givenDose;
    return (
      <span
        className="inline-flex min-w-[58px] flex-col items-center bg-success-tint px-1.5 py-1 text-success-text ring-1 ring-success"
        title={
          dose?.administeredByName
            ? `Given by ${dose.administeredByName}${dose.administeredAt ? ` at ${format(new Date(dose.administeredAt), "HH:mm")}` : ""}`
            : "Given"
        }
      >
        <Check size={13} />
        <span className="text-xs font-medium">
          {dose?.administeredAt ? format(new Date(dose.administeredAt), "HH:mm") : "given"}
        </span>
      </span>
    );
  }

  if (slot.state === "missed") {
    return canRecord ? (
      <button
        type="button"
        disabled={busy}
        onClick={onRecord}
        title="Scheduled time has passed with no dose recorded. Click to record it now."
        className="inline-flex min-w-[58px] flex-col items-center bg-danger-tint px-1.5 py-1 text-danger-text ring-1 ring-danger transition hover:brightness-95 disabled:opacity-50"
      >
        <TriangleAlert size={13} />
        <span className="text-xs font-medium">missed</span>
      </button>
    ) : (
      <span className="inline-flex min-w-[58px] flex-col items-center rounded-control bg-warning-tint px-1.5 py-1 text-warning ring-1 ring-warning/40">
        <TriangleAlert size={13} />
        <span className="text-xs font-medium">missed</span>
      </span>
    );
  }

  return canRecord ? (
    <button
      type="button"
      disabled={busy}
      onClick={onRecord}
      title="Record this dose as given"
      className="inline-flex min-w-[58px] items-center justify-center rounded-control bg-field px-1.5 py-1.5 text-xs text-secondary ring-1 ring-field-border transition hover:bg-accent-tint hover:text-accent disabled:opacity-50"
    >
      record
    </button>
  ) : (
    <span className="inline-flex min-w-[58px] items-center justify-center rounded-control bg-field px-1.5 py-1.5 text-xs text-muted ring-1 ring-field-border">
      pending
    </span>
  );
}
