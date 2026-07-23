namespace JffEhr.Api.Entities;

/// <summary>
/// Marker for the 7 clinical entities that are soft-delete-only: CamperAssessment,
/// ConsentRecord, Prescription, MedicationDose, MedshackVisit, MedshackTreatment,
/// MedicationEvent. Records are never physically deleted; DeletedAt/DeletedBy record
/// the soft-delete, and a DB-level trigger (added via migration) blocks every other
/// column change and blocks hard DELETE outright.
/// </summary>
public interface ISoftDeletableClinicalEntity
{
    DateTimeOffset? DeletedAt { get; set; }
    Guid? DeletedBy { get; set; }
    CrewMember? DeletedByCrewMember { get; set; }
}
