import { StatusPill } from "@/components/ui/status-pill";

export interface PatientBannerData {
  initials: string;
  fullName: string;
  ageYears: number;
  sex: "Male" | "Female";
  regNumber: string;
  familyGroupLabel?: string;
  diagnosis: string;
  allergies?: string[];
  hivPositive: boolean;
}

export function PatientBanner({ patient }: { patient: PatientBannerData }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-card border border-card bg-surface">
      <div className="w-[5px] bg-accent" aria-hidden />
      <div className="flex flex-1 items-center gap-3.5 px-[18px] py-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-accent-tint text-sm font-medium text-accent">
          {patient.initials}
        </div>
        <div className="flex-1">
          <div className="text-base font-medium text-primary">{patient.fullName}</div>
          <div className="text-[12.5px] text-secondary">
            {patient.ageYears} years · {patient.sex} · Reg #{patient.regNumber}
            {patient.familyGroupLabel && (
              <>
                {" · family group "}
                <span className="text-accent">{patient.familyGroupLabel}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="mb-1 flex justify-end gap-1.5">
            {patient.hivPositive && <StatusPill tone="danger">HIV+</StatusPill>}
          </div>
          <div className="text-[11.5px] text-muted">
            {patient.diagnosis}
            {patient.allergies?.length
              ? ` · allergy: ${patient.allergies.join(", ")}`
              : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
