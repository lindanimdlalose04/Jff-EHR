namespace JffEhr.Api.Entities;

public class Camp
{
    public Guid CampId { get; set; }

    /// <summary>Unique, human-facing camp number.</summary>
    public int CampNumber { get; set; }

    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public required string Venue { get; set; }
    public required string Province { get; set; }
    public required string CampType { get; set; }
    public required string Status { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<CampRegistration> Registrations { get; set; } = new List<CampRegistration>();
    public ICollection<CrewMedicalCheckin> CrewMedicalCheckins { get; set; } = new List<CrewMedicalCheckin>();
}
