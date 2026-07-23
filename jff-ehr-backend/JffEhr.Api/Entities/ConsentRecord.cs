namespace JffEhr.Api.Entities;

/// <summary>One per CampRegistration; each camp is re-signed. Insert-only.</summary>
public class ConsentRecord : ISoftDeletableClinicalEntity
{
    public Guid ConsentId { get; set; }

    public Guid RegistrationId { get; set; }
    public CampRegistration? Registration { get; set; }

    public required string ConsentType { get; set; }
    public required string SignedBy { get; set; }
    public string? WitnessName { get; set; }
    public DateTimeOffset SignedAt { get; set; }
    public string? SignedLocation { get; set; }
    public string? DocumentUrl { get; set; }
    public bool PopiaAcknowledged { get; set; }

    /// <summary>Soft-delete flag. Clinical record; never physically deleted.</summary>
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }
    public CrewMember? DeletedByCrewMember { get; set; }
}
