using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class PrescriptionDto
{
    public Guid PrescriptionId { get; set; }
    public Guid RegistrationId { get; set; }
    public string? MedicationName { get; set; }
    public string? Dose { get; set; }
    public string? Route { get; set; }
    public string? Frequency { get; set; }
    public string? ScheduledTimes { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public Guid? PrescribedBy { get; set; }
    public string? PrescribedByName { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>
    /// True once a dose has been administered against this prescription. While
    /// false the record is Tier 1 (fully editable); once true it is locked and
    /// corrections go through withdraw plus re-prescribe.
    /// </summary>
    public bool IsLocked { get; set; }

    /// <summary>Number of administered doses, shown as the reason for the lock.</summary>
    public int AdministeredDoseCount { get; set; }
}

public sealed class CreatePrescriptionRequest
{
    [Required]
    public Guid RegistrationId { get; set; }

    [Required, MaxLength(120)]
    public required string MedicationName { get; set; }

    [Required, MaxLength(60)]
    public required string Dose { get; set; }

    [MaxLength(40)]
    public string? Route { get; set; }

    [Required, MaxLength(60)]
    public required string Frequency { get; set; }

    [Required]
    public required string ScheduledTimes { get; set; }

    [Required]
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? Notes { get; set; }

    // PrescribedBy is injected server-side from the current user's CrewId.
}

/// <summary>
/// Valid only while no dose has been administered against the prescription;
/// once one has, the API returns 409 and the DB trigger refuses the write.
/// </summary>
public sealed class UpdatePrescriptionRequest
{
    [Required, MaxLength(120)]
    public required string MedicationName { get; set; }

    [Required, MaxLength(60)]
    public required string Dose { get; set; }

    [MaxLength(40)]
    public string? Route { get; set; }

    [Required, MaxLength(60)]
    public required string Frequency { get; set; }

    [Required]
    public required string ScheduledTimes { get; set; }

    [Required]
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? Notes { get; set; }
}
