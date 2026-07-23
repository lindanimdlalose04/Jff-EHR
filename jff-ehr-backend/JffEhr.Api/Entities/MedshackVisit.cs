namespace JffEhr.Api.Entities;

public class MedshackVisit : ISoftDeletableClinicalEntity
{
    public Guid VisitId { get; set; }

    public Guid RegistrationId { get; set; }
    public CampRegistration? Registration { get; set; }

    public DateTimeOffset VisitAt { get; set; }
    public required string Reason { get; set; }
    public string? AccompaniedBy { get; set; }
    public decimal? Temperature { get; set; }
    public int? Pulse { get; set; }
    public string? BloodPressure { get; set; }
    public int? OxygenSaturation { get; set; }
    public string? MedicalHistory { get; set; }
    public string? SignsSymptoms { get; set; }
    public string? Findings { get; set; }
    public string? NursingReport { get; set; }
    public string? AdviceGiven { get; set; }

    public Guid NurseId { get; set; }
    public CrewMember? Nurse { get; set; }

    public Guid? DoctorId { get; set; }
    public CrewMember? Doctor { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Soft-delete flag. Clinical record; never physically deleted.</summary>
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }
    public CrewMember? DeletedByCrewMember { get; set; }

    public ICollection<MedshackTreatment> Treatments { get; set; } = new List<MedshackTreatment>();
}
