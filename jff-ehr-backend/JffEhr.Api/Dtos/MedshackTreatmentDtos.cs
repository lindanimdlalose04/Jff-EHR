using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class MedshackTreatmentDto
{
    public Guid TreatmentId { get; set; }
    public Guid VisitId { get; set; }
    public int SequenceNo { get; set; }
    public DateTimeOffset TreatmentTime { get; set; }
    public string? TreatmentDescription { get; set; }
    public string? Outcome { get; set; }
    public Guid AdministeredBy { get; set; }
    public string? AdministeredByName { get; set; }
}

public sealed class CreateMedshackTreatmentRequest
{
    [Required]
    public Guid VisitId { get; set; }

    [Required]
    public DateTimeOffset TreatmentTime { get; set; }

    [Required]
    public required string TreatmentDescription { get; set; }
    public string? Outcome { get; set; }

    // SequenceNo is computed server-side (max existing + 1 for this visit).
    // AdministeredBy is injected server-side from the current user's CrewId.
}
