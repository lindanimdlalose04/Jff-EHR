import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import type { CamperGridContext } from "@/features/medications/api/medications.api";

/**
 * Medication administration record (MAR) as a PDF, for emailing a doctor
 * (Gail's request, B4). It is a faithful, read-only rendering of the doses
 * actually administered and signed for: it lists only given doses, with the
 * medication, the scheduled and administered times, and who gave it. Nothing
 * is computed or inferred beyond what is already recorded.
 */
export function exportMedicationAdministrationRecord(ctx: CamperGridContext): void {
  const { camper, camp, registration, prescriptions, dosesByPrescription } = ctx;

  const given = prescriptions.flatMap((p) =>
    (dosesByPrescription[p.prescriptionId] ?? [])
      .filter((d) => (d.status ?? "").toLowerCase() === "given" || d.administeredAt != null)
      .map((d) => ({
        medication: `${p.medicationName ?? ""}${p.dose ? ` (${p.dose})` : ""}`.trim(),
        scheduledAt: d.scheduledAt,
        administeredAt: d.administeredAt,
        by: d.administeredByName ?? "-",
      })),
  );
  given.sort((a, b) => (a.administeredAt ?? "").localeCompare(b.administeredAt ?? ""));

  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Medication administration record", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    [
      `Camper: ${camper.firstName} ${camper.surname}  (${camper.fileNumber})`,
      `Camp: ${camp ? `Camp ${camp.campNumber}, ${camp.venue}` : "-"}`,
      `Cabin: ${registration.cabin ?? "not set"}`,
      `Generated: ${format(new Date(), "d MMM yyyy, HH:mm")}`,
    ],
    14,
    26,
  );

  autoTable(doc, {
    startY: 48,
    head: [["Medication", "Scheduled", "Administered", "By"]],
    body: given.map((g) => [
      g.medication,
      g.scheduledAt ? format(parseISO(g.scheduledAt), "d MMM yyyy HH:mm") : "-",
      g.administeredAt ? format(parseISO(g.administeredAt), "d MMM yyyy HH:mm") : "-",
      g.by,
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59] },
    theme: "grid",
  });

  if (given.length === 0) {
    doc.text("No administered doses have been recorded for this camper.", 14, 54);
  }

  const safe = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "-");
  doc.save(`MAR-${safe(camper.surname)}-${safe(camper.firstName)}.pdf`);
}
