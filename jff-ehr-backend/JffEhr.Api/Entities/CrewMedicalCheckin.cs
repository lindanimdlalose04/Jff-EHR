namespace JffEhr.Api.Entities;

public class CrewMedicalCheckin
{
    public Guid CheckinId { get; set; }

    /// <summary>The crew member being checked in.</summary>
    public Guid CrewId { get; set; }
    public CrewMember? CrewMember { get; set; }

    public Guid CampId { get; set; }
    public Camp? Camp { get; set; }

    public string? Allergies { get; set; }
    public bool HasBroviacPort { get; set; }
    public string? Eyesight { get; set; }
    public string? Hearing { get; set; }
    public string? MobilityAids { get; set; }
    public string? CurrentMedications { get; set; }
    public bool MedicalReleaseSigned { get; set; }

    /// <summary>The crew member performing the check-in.</summary>
    public Guid CheckedInBy { get; set; }
    public CrewMember? CheckedInByCrewMember { get; set; }

    public DateTimeOffset CheckedInAt { get; set; }
}
