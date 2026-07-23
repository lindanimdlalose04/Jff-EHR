namespace JffEhr.Api.Entities;

/// <summary>The prescribed schedule; actual administration is tracked on MedicationDose.</summary>
public class Prescription : ISoftDeletableClinicalEntity
{
    public Guid PrescriptionId { get; set; }

    public Guid RegistrationId { get; set; }
    public CampRegistration? Registration { get; set; }

    public required string MedicationName { get; set; }
    public required string Dose { get; set; }
    public string? Route { get; set; }
    public required string Frequency { get; set; }

    /// <summary>jsonb, stored as raw JSON text at this layer.</summary>
    public required string ScheduledTimes { get; set; }

    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }

    public Guid? PrescribedBy { get; set; }
    public CrewMember? PrescribedByCrewMember { get; set; }

    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Soft-delete flag. Clinical record; never physically deleted.</summary>
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }
    public CrewMember? DeletedByCrewMember { get; set; }

    public ICollection<MedicationDose> Doses { get; set; } = new List<MedicationDose>();
}
