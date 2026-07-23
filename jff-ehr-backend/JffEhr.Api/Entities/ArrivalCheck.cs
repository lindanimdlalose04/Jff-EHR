namespace JffEhr.Api.Entities;

/// <summary>
/// The nurse's day-one arrival check (Refinement A), one per CampRegistration.
/// Carries the draft -> signed lifecycle (Refinement B): fully editable while
/// draft, locked on signing. After the lock, corrections are visible amendments
/// (soft delete plus a replacement), never silent edits; the DB trigger enforces
/// that only the soft-delete columns may change once signed.
/// Source of field authority: spec/forms/02.
/// </summary>
public class ArrivalCheck : ISoftDeletableClinicalEntity
{
    public const string StatusDraft = "draft";
    public const string StatusSigned = "signed";

    public Guid ArrivalCheckId { get; set; }

    public Guid RegistrationId { get; set; }
    public CampRegistration? Registration { get; set; }

    public bool HasAllergies { get; set; }
    public string? AllergiesDetail { get; set; }
    public string? Eyesight { get; set; }
    public string? Hearing { get; set; }
    public string? MobilityAids { get; set; }
    public string? Prosthesis { get; set; }
    public string? OtherNotes { get; set; }

    /// <summary>jsonb: per-item free text for shower, dressing, toileting, eating.</summary>
    public string? AdlNeeds { get; set; }

    /// <summary>jsonb: the TB screening triplet (cough over 2 weeks, weight loss, night sweats).</summary>
    public string? TbScreening { get; set; }

    public bool HasMedication { get; set; }
    public bool MedicationHandedIn { get; set; }
    public DateOnly? MedicationHandedInDate { get; set; }

    /// <summary>jsonb array of medication names (the form numbers up to 5).</summary>
    public string? MedicationList { get; set; }

    public string? PhysicalCondition { get; set; }

    /// <summary>
    /// The nurse's own arrival-day notes. The paper check-in form carries this
    /// field itself (form wins over the brief's overlap-ownership rule, flagged).
    /// </summary>
    public string? AdditionalNotes { get; set; }

    /// <summary>draft or signed. The lock lives on the signed state.</summary>
    public required string Status { get; set; }

    public Guid AssessedBy { get; set; }
    public CrewMember? AssessedByCrewMember { get; set; }
    public DateTimeOffset AssessedAt { get; set; }

    public DateTimeOffset? SignedAt { get; set; }
    public Guid? SignedBy { get; set; }
    public CrewMember? SignedByCrewMember { get; set; }

    /// <summary>Soft-delete flag. Clinical record; never physically deleted.</summary>
    public DateTimeOffset? DeletedAt { get; set; }
    public Guid? DeletedBy { get; set; }
    public CrewMember? DeletedByCrewMember { get; set; }
}
