using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

/// <summary>A staged intake row, as shown in the admin review queue.</summary>
public sealed class PendingRegistrationDto
{
    public Guid PendingRegistrationId { get; set; }
    public Guid ImportBatchId { get; set; }
    public int SourceRow { get; set; }

    public string FirstName { get; set; } = "";
    public string Surname { get; set; } = "";
    public DateOnly? Dob { get; set; }
    public string? Sex { get; set; }
    public string? Race { get; set; }
    public string? Address { get; set; }
    public string? CellNumber { get; set; }
    public string? Language { get; set; }
    public string? TShirtSize { get; set; }

    public string? CaregiverName { get; set; }
    public string? CaregiverCellNo { get; set; }
    public string? CaregiverWorkNo { get; set; }

    public string? EmergencyName { get; set; }
    public string? EmergencyCellNo { get; set; }
    public string? EmergencyWorkNo { get; set; }
    public string? EmergencyRelationship { get; set; }

    public string? RawDob { get; set; }
    public string? ImportNote { get; set; }
    public string Status { get; set; } = "pending";
    public bool PossibleDuplicate { get; set; }
    public Guid? DuplicateOfCamperId { get; set; }
    public Guid? PromotedCamperId { get; set; }
    public DateTimeOffset ImportedAt { get; set; }
}

/// <summary>Summary returned after a CSV import, before any review.</summary>
public sealed class ImportResultDto
{
    public Guid ImportBatchId { get; set; }
    public int RowsImported { get; set; }
    public int PossibleDuplicates { get; set; }
    public int RowsWithNotes { get; set; }
    public List<PendingRegistrationDto> Pending { get; set; } = new();
}

/// <summary>
/// The administrator's confirmed values for one staged row. These are the values
/// promoted into the real Camper, primary Caregiver and EmergencyContact. The admin
/// may have corrected any field at review, so the request carries the full record
/// rather than only edits.
/// </summary>
public sealed class ConfirmRegistrationRequest
{
    [Required, MaxLength(80)]
    public required string FirstName { get; set; }

    [Required, MaxLength(80)]
    public required string Surname { get; set; }

    [Required]
    public DateOnly Dob { get; set; }

    [Required, MaxLength(8)]
    public required string Sex { get; set; }

    [MaxLength(30)]
    public string? Race { get; set; }
    public string? Address { get; set; }

    [MaxLength(20)]
    public string? CellNumber { get; set; }

    [MaxLength(40)]
    public string? Language { get; set; }

    [MaxLength(8)]
    public string? TShirtSize { get; set; }

    /// <summary>
    /// Optional real clinical file number. When omitted, a unique placeholder is
    /// generated (see the controller) because the file number is a Part 2 value the
    /// public form does not collect.
    /// </summary>
    [MaxLength(20)]
    public string? FileNumber { get; set; }

    // Primary caregiver
    [Required, MaxLength(160)]
    public required string CaregiverName { get; set; }

    [Required, MaxLength(20)]
    public required string CaregiverCellNo { get; set; }

    [MaxLength(20)]
    public string? CaregiverWorkNo { get; set; }

    [MaxLength(40)]
    public string CaregiverRelationship { get; set; } = "Parent / caregiver";

    // Emergency contact
    [Required, MaxLength(160)]
    public required string EmergencyName { get; set; }

    [Required, MaxLength(20)]
    public required string EmergencyCellNo { get; set; }

    [MaxLength(20)]
    public string? EmergencyWorkNo { get; set; }

    [Required, MaxLength(40)]
    public required string EmergencyRelationship { get; set; }

    /// <summary>
    /// Set true to confirm anyway when the row was flagged a possible duplicate.
    /// Guards against silently creating a second record for a returning child.
    /// </summary>
    public bool ConfirmDespiteDuplicate { get; set; }
}
