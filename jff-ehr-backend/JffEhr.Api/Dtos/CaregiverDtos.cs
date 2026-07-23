using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class CaregiverDto
{
    public Guid CaregiverId { get; set; }
    public Guid CamperId { get; set; }
    public required string Name { get; set; }
    public required string CellNo { get; set; }
    public string? WorkNo { get; set; }
    public required string Relationship { get; set; }
    public bool IsPrimary { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class CreateCaregiverRequest
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
    public bool IsPrimary { get; set; }
}

public sealed class UpdateCaregiverRequest
{
    [Required, MaxLength(160)]
    public required string Name { get; set; }

    [Required, MaxLength(20)]
    public required string CellNo { get; set; }

    [MaxLength(20)]
    public string? WorkNo { get; set; }

    [Required, MaxLength(40)]
    public required string Relationship { get; set; }
    public bool IsPrimary { get; set; }
}
