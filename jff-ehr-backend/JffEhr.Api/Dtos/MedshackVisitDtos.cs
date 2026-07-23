using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class MedshackVisitDto
{
    public Guid VisitId { get; set; }
    public Guid RegistrationId { get; set; }
    public DateTimeOffset VisitAt { get; set; }
    public string? Reason { get; set; }
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
    public string? NurseName { get; set; }
    public Guid? DoctorId { get; set; }
    public string? DoctorName { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class CreateMedshackVisitRequest
{
    [Required]
    public Guid RegistrationId { get; set; }

    [Required]
    public DateTimeOffset VisitAt { get; set; }

    [Required]
    public required string Reason { get; set; }

    [MaxLength(160)]
    public string? AccompaniedBy { get; set; }
    public decimal? Temperature { get; set; }
    public int? Pulse { get; set; }

    [MaxLength(20)]
    public string? BloodPressure { get; set; }
    public int? OxygenSaturation { get; set; }
    public string? MedicalHistory { get; set; }
    public string? SignsSymptoms { get; set; }
    public string? Findings { get; set; }
    public string? NursingReport { get; set; }
    public string? AdviceGiven { get; set; }
    public Guid? DoctorId { get; set; }

    // NurseId is injected server-side from the current user's CrewId.
}
