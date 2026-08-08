namespace JffEhr.Api.Entities;

/// <summary>
/// Links a persistent CrewMember to a specific Camp, mirroring CampRegistration
/// for campers. A returning volunteer is added to each camp they attend, and
/// check-in status is tracked per camp, so the fixed staff are no longer
/// assumed present at every camp.
/// </summary>
public class CrewCampRegistration
{
    public Guid CrewRegistrationId { get; set; }

    public Guid CrewId { get; set; }
    public CrewMember? CrewMember { get; set; }

    public Guid CampId { get; set; }
    public Camp? Camp { get; set; }

    /// <summary>The crew member's role at this camp; may differ from camp to camp.</summary>
    public string? Role { get; set; }

    /// <summary>registered / attended / cancelled, mirroring camp_registrations.</summary>
    public required string Status { get; set; }

    public DateTimeOffset RegisteredAt { get; set; }

    /// <summary>The crew member's medical check-in(s) for this camp hang off the registration.</summary>
    public ICollection<CrewMedicalCheckin> MedicalCheckins { get; set; } = new List<CrewMedicalCheckin>();
}
