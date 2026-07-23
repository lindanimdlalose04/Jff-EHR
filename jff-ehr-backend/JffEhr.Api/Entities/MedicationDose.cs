namespace JffEhr.Api.Entities;

public class MedicationDose : ISoftDeletableClinicalEntity
{
    public Guid DoseId { get; set; }

    public Guid PrescriptionId { get; set; }
    public Prescription? Prescription { get; set; }

    public DateTimeOffset ScheduledAt { get; set; }
    public DateTimeOffset? AdministeredAt { get; set; }

    public Guid? AdministeredBy { get; set; }
    public CrewMember? AdministeredByCrewMember { get; set; }

    public required string Status { get; set; }
    public string? Notes { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Soft-delete flag. Clinical record; never physically deleted.</summary>
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }
    public CrewMember? DeletedByCrewMember { get; set; }
}
