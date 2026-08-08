namespace JffEhr.Api.Entities;

/// <summary>Medication event / near-miss / incident record. Insert-only.</summary>
public class MedicationEvent : ISoftDeletableClinicalEntity
{
    public Guid EventId { get; set; }

    public Guid RegistrationId { get; set; }
    public CampRegistration? Registration { get; set; }

    public DateTimeOffset EventAt { get; set; }
    public DateTimeOffset DiscoveryAt { get; set; }
    public required string Description { get; set; }

    /// <summary>jsonb, stored as raw JSON text at this layer.</summary>
    public required string EventTypes { get; set; }

    /// <summary>jsonb, stored as raw JSON text at this layer.</summary>
    public string? ContributingFactors { get; set; }

    /// <summary>Free text for the "Other" initial impression, captured only when that box is ticked. The fixed nine in EventTypes are never changed.</summary>
    public string? OtherEventType { get; set; }

    /// <summary>Free text for the "Other" contributing factor, captured only when that box is ticked. The fixed three in ContributingFactors are never changed.</summary>
    public string? OtherContributingFactor { get; set; }

    public required string ImmediateAction { get; set; }
    public string? DoctorNotified { get; set; }

    /// <summary>The form's explicit "no treatment ordered" checkbox, distinct from an unanswered field.</summary>
    public bool NoTreatmentOrdered { get; set; }
    public string? TreatmentOrdered { get; set; }

    public Guid ReporterId { get; set; }
    public CrewMember? Reporter { get; set; }

    // The review half of the form. Both stay null until a medical person signs
    // the event off, and the DB trigger allows them to be filled exactly once.
    public string? CorrectiveAction { get; set; }

    public Guid? ReviewerId { get; set; }
    public CrewMember? Reviewer { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Soft-delete flag. Clinical record; never physically deleted.</summary>
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }
    public CrewMember? DeletedByCrewMember { get; set; }
}
