using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class CrewMedicalCheckinDto
{
    public Guid CheckinId { get; set; }
    public Guid CrewId { get; set; }
    public string? CrewName { get; set; }
    public Guid CampId { get; set; }
    public string? Allergies { get; set; }
    public bool HasBroviacPort { get; set; }
    public bool HasBloodCount { get; set; }
    public string? Eyesight { get; set; }
    public string? Hearing { get; set; }
    public string? MobilityAids { get; set; }
    public string? CurrentMedications { get; set; }
    public bool MedicalReleaseSigned { get; set; }
    public Guid CheckedInBy { get; set; }
    public string? CheckedInByName { get; set; }
    public DateTimeOffset CheckedInAt { get; set; }
}

public sealed class CreateCrewMedicalCheckinRequest
{
    /// <summary>The crew member being checked in.</summary>
    [Required]
    public Guid CrewId { get; set; }

    [Required]
    public Guid CampId { get; set; }
    public string? Allergies { get; set; }
    public bool HasBroviacPort { get; set; }
    public bool HasBloodCount { get; set; }
    public string? Eyesight { get; set; }
    public string? Hearing { get; set; }
    public string? MobilityAids { get; set; }
    public string? CurrentMedications { get; set; }
    public bool MedicalReleaseSigned { get; set; }

    // CheckedInBy is injected server-side from the current user's CrewId, not
    // client-supplied.
}

public sealed class UpdateCrewMedicalCheckinRequest
{
    public string? Allergies { get; set; }
    public bool HasBroviacPort { get; set; }
    public bool HasBloodCount { get; set; }
    public string? Eyesight { get; set; }
    public string? Hearing { get; set; }
    public string? MobilityAids { get; set; }
    public string? CurrentMedications { get; set; }
    public bool MedicalReleaseSigned { get; set; }
}
