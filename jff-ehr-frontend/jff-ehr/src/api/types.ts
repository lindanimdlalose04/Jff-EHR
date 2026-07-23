/**
 * DTO shapes as serialised by the ASP.NET Core API (System.Text.Json
 * camelCase). Dates arrive as ISO strings: DateOnly as "2026-07-10",
 * DateTimeOffset as full timestamps.
 */

export interface CampDto {
  campId: string;
  campNumber: number;
  startDate: string;
  endDate: string;
  venue: string;
  province: string;
  campType: string;
  status: string;
  createdAt: string;
}

export interface CampRegistrationDto {
  registrationId: string;
  campId: string;
  camperId: string;
  cabin: string | null;
  groupName: string | null;
  status: string;
  registeredAt: string;
}

export interface CamperDto {
  camperId: string;
  firstName: string;
  surname: string;
  dob: string;
  sex: string;
  race: string | null;
  address: string | null;
  cellNumber: string | null;
  language: string | null;
  tShirtSize: string | null;
  photoUrl: string | null;
  diagnosis: string | null;
  treatingClinic: string | null;
  fileNumber: string;
  familyGroupId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaregiverDto {
  caregiverId: string;
  camperId: string;
  name: string;
  cellNo: string;
  workNo: string | null;
  relationship: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface EmergencyContactDto {
  contactId: string;
  camperId: string;
  name: string;
  cellNo: string;
  workNo: string | null;
  relationship: string;
  createdAt: string;
}

export interface PrecampMedicalDto {
  precampId: string;
  registrationId: string;
  diagnosis: string | null;
  hospitalFileNumber: string | null;
  treatingContact: string | null;
  vlOver1000: boolean | null;
  viralLoad: string | null;
  vlTestDate: string | null;
  vlDateReceived: string | null;
  clinicalFindings: string | null;
  tbStatus: string | null;
  hepatitisB: boolean | null;
  tbOisHistory: boolean;
  tbOisHistoryDetail: string | null;
  medicationList: string | null;
  adherenceBarriers: boolean;
  adherenceBarriersDetail: string | null;
  dietaryRequirements: string | null;
  religion: string | null;
  additionalInfo: string | null;
  camperHistoryNotes: string | null;
  capturedBy: string;
  capturedByName: string | null;
  capturedAt: string;
}

export interface ArrivalCheckDto {
  arrivalCheckId: string;
  registrationId: string;
  hasAllergies: boolean;
  allergiesDetail: string | null;
  eyesight: string | null;
  hearing: string | null;
  mobilityAids: string | null;
  prosthesis: string | null;
  otherNotes: string | null;
  adlNeeds: string | null;
  tbScreening: string | null;
  hasMedication: boolean;
  medicationHandedIn: boolean;
  medicationHandedInDate: string | null;
  medicationList: string | null;
  physicalCondition: string | null;
  additionalNotes: string | null;
  status: string;
  assessedBy: string;
  assessedByName: string | null;
  assessedAt: string;
  signedAt: string | null;
  signedBy: string | null;
  signedByName: string | null;
}

export interface MedshackVisitDto {
  visitId: string;
  registrationId: string;
  visitAt: string;
  reason: string | null;
  accompaniedBy: string | null;
  temperature: number | null;
  pulse: number | null;
  bloodPressure: string | null;
  oxygenSaturation: number | null;
  medicalHistory: string | null;
  signsSymptoms: string | null;
  findings: string | null;
  nursingReport: string | null;
  adviceGiven: string | null;
  nurseId: string;
  nurseName: string | null;
  doctorId: string | null;
  doctorName: string | null;
  createdAt: string;
}

export interface MedshackTreatmentDto {
  treatmentId: string;
  visitId: string;
  sequenceNo: number;
  treatmentTime: string;
  treatmentDescription: string | null;
  outcome: string | null;
  administeredBy: string;
  administeredByName: string | null;
}

export interface PrescriptionDto {
  prescriptionId: string;
  registrationId: string;
  medicationName: string | null;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  scheduledTimes: string | null;
  startDate: string;
  endDate: string | null;
  prescribedBy: string | null;
  prescribedByName: string | null;
  notes: string | null;
  createdAt: string;
  /** True once a dose has been administered: the record is then locked. */
  isLocked: boolean;
  administeredDoseCount: number;
}

export interface MedicationDoseDto {
  doseId: string;
  prescriptionId: string;
  scheduledAt: string;
  administeredAt: string | null;
  administeredBy: string | null;
  administeredByName: string | null;
  status: string | null;
  notes: string | null;
  createdAt: string;
}

export interface MedicationEventDto {
  eventId: string;
  registrationId: string;
  eventAt: string;
  discoveryAt: string;
  description: string | null;
  eventTypes: string | null;
  contributingFactors: string | null;
  immediateAction: string | null;
  doctorNotified: string | null;
  noTreatmentOrdered: boolean;
  treatmentOrdered: string | null;
  correctiveAction: string | null;
  reporterId: string;
  reporterName: string | null;
  reviewerId: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  /** True once a medical person has signed the event off. */
  isReviewed: boolean;
  createdAt: string;
}

export interface UserDto {
  userId: string;
  crewId: string;
  email: string;
  rolePermissions: string;
  lastLoginAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CrewMemberDto {
  crewId: string;
  name: string;
  surname: string;
  idNumber: string;
  dob: string | null;
  role: string;
  photoUrl: string | null;
  createdAt: string;
}

export interface CrewMedicalCheckinDto {
  checkinId: string;
  crewId: string;
  crewName: string | null;
  campId: string;
  allergies: string | null;
  /** Crew-specific: campers do not have this field. */
  hasBroviacPort: boolean;
  /** Crew-specific: campers do not have this field. */
  hasBloodCount: boolean;
  eyesight: string | null;
  hearing: string | null;
  mobilityAids: string | null;
  currentMedications: string | null;
  /** The crew indemnity / medical release acknowledgement gate. */
  medicalReleaseSigned: boolean;
  checkedInBy: string;
  checkedInByName: string | null;
  checkedInAt: string;
}

export interface ConsentRecordDto {
  consentId: string;
  registrationId: string;
  consentType: string | null;
  signedBy: string | null;
  witnessName: string | null;
  signedAt: string;
  signedLocation: string | null;
  documentUrl: string | null;
  popiaAcknowledged: boolean;
}
