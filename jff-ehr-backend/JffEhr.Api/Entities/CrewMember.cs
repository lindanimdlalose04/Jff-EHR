namespace JffEhr.Api.Entities;

/// <summary>
/// Staff/volunteer roster. User is a subset of CrewMember (one FK User -> CrewMember).
/// Referenced from many entities in different performer roles (nurse, doctor, assessor,
/// prescriber, reporter, reviewer, administerer, check-in performer); each role gets its
/// own distinctly named inverse navigation collection since EF cannot infer these.
/// </summary>
public class CrewMember
{
    public Guid CrewId { get; set; }

    public required string Name { get; set; }
    public required string Surname { get; set; }

    /// <summary>Unique ID number.</summary>
    public required string IdNumber { get; set; }

    public DateOnly? Dob { get; set; }
    public required string Role { get; set; }
    public string? PhotoUrl { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public User? User { get; set; }

    public ICollection<CrewMedicalCheckin> MedicalCheckins { get; set; } = new List<CrewMedicalCheckin>();
    public ICollection<CrewMedicalCheckin> CheckInsPerformed { get; set; } = new List<CrewMedicalCheckin>();
    public ICollection<PrecampMedical> PrecampMedicalsCaptured { get; set; } = new List<PrecampMedical>();
    public ICollection<ArrivalCheck> ArrivalChecksAssessed { get; set; } = new List<ArrivalCheck>();
    public ICollection<ArrivalCheck> ArrivalChecksSigned { get; set; } = new List<ArrivalCheck>();
    public ICollection<Prescription> PrescriptionsPrescribed { get; set; } = new List<Prescription>();
    public ICollection<MedicationDose> MedicationDosesAdministered { get; set; } = new List<MedicationDose>();
    public ICollection<MedshackVisit> MedshackVisitsAsNurse { get; set; } = new List<MedshackVisit>();
    public ICollection<MedshackVisit> MedshackVisitsAsDoctor { get; set; } = new List<MedshackVisit>();
    public ICollection<MedshackTreatment> MedshackTreatmentsAdministered { get; set; } = new List<MedshackTreatment>();
    public ICollection<MedicationEvent> MedicationEventsReported { get; set; } = new List<MedicationEvent>();
    public ICollection<MedicationEvent> MedicationEventsReviewed { get; set; } = new List<MedicationEvent>();
}
