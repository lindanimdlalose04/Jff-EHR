using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class EmergencyContactDto
{
    public Guid ContactId { get; set; }
    public Guid CamperId { get; set; }
    public required string Name { get; set; }
    public required string CellNo { get; set; }
    public string? WorkNo { get; set; }
    public required string Relationship { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class CreateEmergencyContactRequest
{
    [Required]
    public Guid CamperId { get; set; }

    [Required, MaxLength(160)]
    public required string Name { get; set; }

    [Required, MaxLength(20)]
    public required string CellNo { get; set; }

    [MaxLength(20)]
    public string? WorkNo { get; set; }

    [Required, MaxLength(40)]
    public required string Relationship { get; set; }
}

public sealed class UpdateEmergencyContactRequest
{
    [Required, MaxLength(160)]
    public required string Name { get; set; }

    [Required, MaxLength(20)]
    public required string CellNo { get; set; }

    [MaxLength(20)]
    public string? WorkNo { get; set; }

    [Required, MaxLength(40)]
    public required string Relationship { get; set; }
}
