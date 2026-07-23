namespace JffEhr.Api.Entities;

/// <summary>Child entity of MedshackVisit; multiple treatments per visit.</summary>
public class MedshackTreatment : ISoftDeletableClinicalEntity
{
    public Guid TreatmentId { get; set; }

    public Guid VisitId { get; set; }
    public MedshackVisit? Visit { get; set; }

    public int SequenceNo { get; set; }
    public DateTimeOffset TreatmentTime { get; set; }
    public required string TreatmentDescription { get; set; }
    public string? Outcome { get; set; }

    public Guid AdministeredBy { get; set; }
    public CrewMember? AdministeredByCrewMember { get; set; }

    /// <summary>Soft-delete flag. Clinical record; never physically deleted.</summary>
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }
    public CrewMember? DeletedByCrewMember { get; set; }
}
