// Design system — shared primitives reused by every screen.
export { Button } from "./components/ui/button";
export { Input, Textarea, Select } from "./components/ui/field";
export { StatusPill, type PillTone } from "./components/ui/status-pill";
export { FormSection } from "./components/forms/form-section";
export { FormField } from "./components/forms/form-field";
export { AppHeader } from "./components/layout/app-header";
export {
  OfflineBanner,
  useOnlineStatus,
} from "./components/layout/offline-banner";

// Camper feature: the patient banner primitive. The assessment vertical was
// replaced by the Refinement A split (pre-camp medical + arrival check); its
// screens live in features/ and are routed directly, not exported here.
export {
  PatientBanner,
  type PatientBannerData,
} from "./features/campers/components/patient-banner";
