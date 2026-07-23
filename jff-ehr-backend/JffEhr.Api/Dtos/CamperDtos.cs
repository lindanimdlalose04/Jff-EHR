using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class CamperDto
{
    public Guid CamperId { get; set; }
    public required string FirstName { get; set; }
    public required string Surname { get; set; }
    public DateOnly Dob { get; set; }
    public required string Sex { get; set; }
    public string? Race { get; set; }
    public string? Address { get; set; }
    public string? CellNumber { get; set; }
    public string? Language { get; set; }
    public string? TShirtSize { get; set; }
    public string? PhotoUrl { get; set; }
    public string? Diagnosis { get; set; }
    public string? TreatingClinic { get; set; }
    public required string FileNumber { get; set; }
    public Guid? FamilyGroupId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class CreateCamperRequest
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
    public string? PhotoUrl { get; set; }
    public string? Diagnosis { get; set; }
    public string? TreatingClinic { get; set; }

    [Required, MaxLength(20)]
    public required string FileNumber { get; set; }
    public Guid? FamilyGroupId { get; set; }
}

public sealed class UpdateCamperRequest
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
    public string? PhotoUrl { get; set; }
    public string? Diagnosis { get; set; }
    public string? TreatingClinic { get; set; }

    [Required, MaxLength(20)]
    public required string FileNumber { get; set; }
    public Guid? FamilyGroupId { get; set; }
}
