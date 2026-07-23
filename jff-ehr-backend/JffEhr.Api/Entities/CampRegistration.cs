namespace JffEhr.Api.Entities;

/// <summary>Links a longitudinal Camper to a specific Camp instance.</summary>
public class CampRegistration
{
    public Guid RegistrationId { get; set; }

    public Guid CampId { get; set; }
    public Camp? Camp { get; set; }

    public Guid CamperId { get; set; }
    public Camper? Camper { get; set; }

    public string? Cabin { get; set; }
    public string? GroupName { get; set; }
    public required string Status { get; set; }
    public DateTimeOffset RegisteredAt { get; set; }

    public ICollection<ConsentRecord> ConsentRecords { get; set; } = new List<ConsentRecord>();
    public PrecampMedical? PrecampMedical { get; set; }
    public ArrivalCheck? ArrivalCheck { get; set; }
    public ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();
    public ICollection<MedshackVisit> MedshackVisits { get; set; } = new List<MedshackVisit>();
    public ICollection<MedicationEvent> MedicationEvents { get; set; } = new List<MedicationEvent>();
}
