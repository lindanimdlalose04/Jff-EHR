using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class ConsentRecordDto
{
    public Guid ConsentId { get; set; }
    public Guid RegistrationId { get; set; }
    public string? ConsentType { get; set; }
    public string? SignedBy { get; set; }
    public string? WitnessName { get; set; }
    public DateTimeOffset SignedAt { get; set; }
    public string? SignedLocation { get; set; }
    public string? DocumentUrl { get; set; }
    public bool PopiaAcknowledged { get; set; }
}

public sealed class CreateConsentRecordRequest
{
    [Required]
    public Guid RegistrationId { get; set; }

    [Required, MaxLength(40)]
    public required string ConsentType { get; set; }

    [Required, MaxLength(160)]
    public required string SignedBy { get; set; }

    [MaxLength(160)]
    public string? WitnessName { get; set; }

    [Required]
    public DateTimeOffset SignedAt { get; set; }

    [MaxLength(120)]
    public string? SignedLocation { get; set; }

    public string? DocumentUrl { get; set; }

    public bool PopiaAcknowledged { get; set; }
}
