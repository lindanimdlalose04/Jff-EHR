import { ageYears } from "@/lib/display";
import type { CamperDetail } from "../api/camper-detail.api";
import type { PatientBannerData } from "../components/patient-banner";

/**
 * Camper + latest clinical records -> PatientBanner shape. After the
 * Refinement A split: HIV status comes from the newest pre-camp medical (the
 * caregiver's declared VL / TB block), allergies from the newest arrival check
 * (the nurse's day-one confirmation).
 */
export function toBanner(detail: CamperDetail): PatientBannerData {
  const { camper, siblings, precampMedicals, arrivalChecks } = detail;
  const latestPrecamp = [...precampMedicals].sort((a, b) =>
    b.capturedAt.localeCompare(a.capturedAt),
  )[0];
  const latestCheck = [...arrivalChecks].sort((a, b) =>
    b.assessedAt.localeCompare(a.assessedAt),
  )[0];
  return {
    initials: `${camper.firstName[0] ?? ""}${camper.surname[0] ?? ""}`.toUpperCase(),
    fullName: `${camper.firstName} ${camper.surname}`,
    ageYears: ageYears(camper.dob),
    sex: camper.sex === "M" ? "Male" : "Female",
    regNumber: camper.fileNumber,
    familyGroupLabel: siblings.length
      ? `${camper.surname} (${siblings.length + 1} siblings)`
      : undefined,
    diagnosis: camper.diagnosis ?? "No diagnosis on file",
    allergies:
      latestCheck?.hasAllergies && latestCheck.allergiesDetail
        ? latestCheck.allergiesDetail.split(",").map((s) => s.trim())
        : undefined,
    hivPositive: Boolean(latestPrecamp?.viralLoad ?? latestPrecamp?.tbStatus),
  };
}
