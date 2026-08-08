using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class MedicationEventDto
{
    public Guid EventId { get; set; }
    public Guid RegistrationId { get; set; }
    public DateTimeOffset EventAt { get; set; }
    public DateTimeOffset DiscoveryAt { get; set; }
    public string? Description { get; set; }
    public string? EventTypes { get; set; }
    public string? ContributingFactors { get; set; }
    public string? OtherEventType { get; set; }
    public string? OtherContributingFactor { get; set; }
    public string? ImmediateAction { get; set; }
    public string? DoctorNotified { get; set; }
    public bool NoTreatmentOrdered { get; set; }
    public string? TreatmentOrdered { get; set; }
    public string? CorrectiveAction { get; set; }
    public Guid ReporterId { get; set; }
    public string? ReporterName { get; set; }
    public Guid? ReviewerId { get; set; }
    public string? ReviewerName { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>True once a medical person has signed the event off.</summary>
    public bool IsReviewed { get; set; }
}

public sealed class CreateMedicationEventRequest
{
    [Required]
    public Guid RegistrationId { get; set; }

    [Required]
    public DateTimeOffset EventAt { get; set; }

    [Required]
    public DateTimeOffset DiscoveryAt { get; set; }

    [Required]
    public required string Description { get; set; }

    [Required]
    public required string EventTypes { get; set; }
    public string? ContributingFactors { get; set; }

    /// <summary>Free text for the "Other" impression; null unless the Other box was ticked.</summary>
    public string? OtherEventType { get; set; }

    /// <summary>Free text for the "Other" contributing factor; null unless the Other box was ticked.</summary>
    public string? OtherContributingFactor { get; set; }

    [Required]
    public required string ImmediateAction { get; set; }
    public string? DoctorNotified { get; set; }
    public bool NoTreatmentOrdered { get; set; }
    public string? TreatmentOrdered { get; set; }

    // ReporterId is injected server-side from the current user's CrewId.
    // CorrectiveAction and ReviewerId belong to the review step, not to
    // filing: they are set once via POST /medicationevents/{id}/review.
}

/// <summary>
/// The medical person's sign-off. Valid only once: a filed event is never
/// edited, and a review that already exists cannot be rewritten.
/// </summary>
public sealed class ReviewMedicationEventRequest
{
    [Required]
    public required string CorrectiveAction { get; set; }

    // ReviewerId is injected server-side from the current user's CrewId.
}
