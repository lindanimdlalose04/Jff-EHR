import type { BannerFlag } from "@/components/ui/record-chrome";
import type { CamperDetail } from "../api/camper-detail.api";

/**
 * Camper record -> the flags shown in the pinned banner.
 *
 * The banner exists for one reason: anything that could hurt the child should
 * be visible without scrolling and without opening a tab. So it carries the
 * allergy (taken from the nurse's day-one arrival check, which is the
 * confirmed source rather than the caregiver's pre-camp declaration) and the
 * consent state, because no child may take part without a signed indemnity.
 *
 * Deliberately NOT shown: HIV status. The earlier version inferred it from
 * "has a viral load or TB value on file", which is not the same thing as a
 * positive diagnosis, so the flag could be wrong. It is also the most
 * sensitive fact in the record, and a banner is the one part of the screen a
 * bystander at a camp table can read. The diagnosis stays in the meta line and
 * the detail stays behind the medical tab.
 */
export function camperBannerFlags(detail: CamperDetail): BannerFlag[] {
  const { consents, arrivalChecks } = detail;
  const flags: BannerFlag[] = [];

  const latestCheck = [...arrivalChecks].sort((a, b) =>
    b.assessedAt.localeCompare(a.assessedAt),
  )[0];

  if (latestCheck?.hasAllergies) {
    const detailText = latestCheck.allergiesDetail?.trim();
    flags.push({
      label: detailText ? `Allergy: ${detailText}` : "Allergies on file",
      tone: "danger",
    });
  }

  flags.push(
    consents.length > 0
      ? { label: "Consent signed", tone: "success" }
      : { label: "Consent missing", tone: "danger" },
  );

  return flags;
}
