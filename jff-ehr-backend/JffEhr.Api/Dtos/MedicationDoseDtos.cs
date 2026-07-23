using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class MedicationDoseDto
{
    public Guid DoseId { get; set; }
    public Guid PrescriptionId { get; set; }
    public DateTimeOffset ScheduledAt { get; set; }
    public DateTimeOffset? AdministeredAt { get; set; }
    public Guid? AdministeredBy { get; set; }
    public string? AdministeredByName { get; set; }
    public string? Status { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>
/// A dose is an immutable event log entry (administered / missed / refused),
/// created once at the moment the event is known -- not a mutable schedule
/// row that gets updated later. There is no UpdateMedicationDoseRequest.
/// </summary>
public sealed class CreateMedicationDoseRequest
{
    [Required]
    public Guid PrescriptionId { get; set; }

    [Required]
    public DateTimeOffset ScheduledAt { get; set; }
    public DateTimeOffset? AdministeredAt { get; set; }

    [Required, MaxLength(20)]
    public required string Status { get; set; }
    public string? Notes { get; set; }

    // AdministeredBy is injected server-side from the current user's CrewId.
}
