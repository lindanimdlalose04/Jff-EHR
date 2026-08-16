namespace JffEhr.Api.Entities;

/// <summary>
/// A staged, not-yet-confirmed camper registration, imported from the public
/// intake form's CSV export (see spec/forms/08_public_registration_intake.md).
///
/// This table exists so that unconfirmed intake data never touches the clinical
/// tables. A row here is reviewed by an administrator and then PROMOTED into a
/// real Camper plus primary Caregiver plus EmergencyContact, or discarded. It
/// carries only form 01 Part 1 fields: no medical (Part 2) and no signature
/// (Part 3). Access is admin only, enforced by row level security.
///
/// Fields are deliberately nullable so a messy or partial CSV row can still be
/// staged and corrected at review, rather than rejected at import. The required
/// fields are validated at confirm time, not import time.
/// </summary>
public sealed class PendingRegistration
{
    public Guid PendingRegistrationId { get; set; }

    /// <summary>Groups all rows imported from one CSV upload.</summary>
    public Guid ImportBatchId { get; set; }

    /// <summary>1-based row number within the source CSV, for the review list.</summary>
    public int SourceRow { get; set; }

    // Part A: the child (maps to Camper)
    public string FirstName { get; set; } = "";
    public string Surname { get; set; } = "";
    public DateOnly? Dob { get; set; }
    public string? Sex { get; set; }
    public string? Race { get; set; }
    public string? Address { get; set; }
    public string? CellNumber { get; set; }
    public string? Language { get; set; }
    public string? TShirtSize { get; set; }

    // Part B: primary caregiver (maps to Caregiver, IsPrimary = true)
    public string? CaregiverName { get; set; }
    public string? CaregiverCellNo { get; set; }
    public string? CaregiverWorkNo { get; set; }

    // Part C: emergency contact (maps to EmergencyContact)
    public string? EmergencyName { get; set; }
    public string? EmergencyCellNo { get; set; }
    public string? EmergencyWorkNo { get; set; }
    public string? EmergencyRelationship { get; set; }

    /// <summary>
    /// The original date-of-birth text when it could not be parsed, kept so the
    /// administrator can see and correct it at review. Null when Dob parsed cleanly.
    /// </summary>
    public string? RawDob { get; set; }

    /// <summary>A per-row note raised at import, e.g. an unreadable date. Advisory only.</summary>
    public string? ImportNote { get; set; }

    /// <summary>'pending', 'confirmed' or 'discarded'.</summary>
    public string Status { get; set; } = "pending";

    /// <summary>True when a live camper already has the same first name, surname and DOB.</summary>
    public bool PossibleDuplicate { get; set; }

    public Guid? DuplicateOfCamperId { get; set; }

    /// <summary>Set when the row is confirmed: the camper it became.</summary>
    public Guid? PromotedCamperId { get; set; }

    public Guid ImportedBy { get; set; }
    public DateTimeOffset ImportedAt { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
}
