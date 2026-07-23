using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class ArrivalCheckDto
{
    public Guid ArrivalCheckId { get; set; }
    public Guid RegistrationId { get; set; }
    public bool HasAllergies { get; set; }
    public string? AllergiesDetail { get; set; }
    public string? Eyesight { get; set; }
    public string? Hearing { get; set; }
    public string? MobilityAids { get; set; }
    public string? Prosthesis { get; set; }
    public string? OtherNotes { get; set; }
    public string? AdlNeeds { get; set; }
    public string? TbScreening { get; set; }
    public bool HasMedication { get; set; }
    public bool MedicationHandedIn { get; set; }
    public DateOnly? MedicationHandedInDate { get; set; }
    public string? MedicationList { get; set; }
    public string? PhysicalCondition { get; set; }
    public string? AdditionalNotes { get; set; }
    public required string Status { get; set; }
    public Guid AssessedBy { get; set; }
    public string? AssessedByName { get; set; }
    public DateTimeOffset AssessedAt { get; set; }
    public DateTimeOffset? SignedAt { get; set; }
    public Guid? SignedBy { get; set; }
    public string? SignedByName { get; set; }
}

public sealed class CreateArrivalCheckRequest
{
    [Required]
    public Guid RegistrationId { get; set; }

    public bool HasAllergies { get; set; }
    public string? AllergiesDetail { get; set; }
    public string? Eyesight { get; set; }
    public string? Hearing { get; set; }
    public string? MobilityAids { get; set; }
    public string? Prosthesis { get; set; }
    public string? OtherNotes { get; set; }
    public string? AdlNeeds { get; set; }
    public string? TbScreening { get; set; }
    public bool HasMedication { get; set; }
    public bool MedicationHandedIn { get; set; }
    public DateOnly? MedicationHandedInDate { get; set; }
    public string? MedicationList { get; set; }
    public string? PhysicalCondition { get; set; }
    public string? AdditionalNotes { get; set; }
}

/// <summary>Valid only while the check is a draft; a signed check returns 409.</summary>
public sealed class UpdateArrivalCheckRequest
{
    public bool HasAllergies { get; set; }
    public string? AllergiesDetail { get; set; }
    public string? Eyesight { get; set; }
    public string? Hearing { get; set; }
    public string? MobilityAids { get; set; }
    public string? Prosthesis { get; set; }
    public string? OtherNotes { get; set; }
    public string? AdlNeeds { get; set; }
    public string? TbScreening { get; set; }
    public bool HasMedication { get; set; }
    public bool MedicationHandedIn { get; set; }
    public DateOnly? MedicationHandedInDate { get; set; }
    public string? MedicationList { get; set; }
    public string? PhysicalCondition { get; set; }
    public string? AdditionalNotes { get; set; }
}
