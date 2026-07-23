using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class CampDto
{
    public Guid CampId { get; set; }
    public int CampNumber { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public required string Venue { get; set; }
    public required string Province { get; set; }
    public required string CampType { get; set; }
    public required string Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class CreateCampRequest
{
    [Required]
    public int CampNumber { get; set; }

    [Required]
    public DateOnly StartDate { get; set; }

    [Required]
    public DateOnly EndDate { get; set; }

    [Required, MaxLength(200)]
    public required string Venue { get; set; }

    [Required, MaxLength(40)]
    public required string Province { get; set; }

    [Required, MaxLength(60)]
    public required string CampType { get; set; }

    [Required, MaxLength(20)]
    public required string Status { get; set; }
}

public sealed class UpdateCampRequest
{
    [Required]
    public DateOnly StartDate { get; set; }

    [Required]
    public DateOnly EndDate { get; set; }

    [Required, MaxLength(200)]
    public required string Venue { get; set; }

    [Required, MaxLength(40)]
    public required string Province { get; set; }

    [Required, MaxLength(60)]
    public required string CampType { get; set; }

    [Required, MaxLength(20)]
    public required string Status { get; set; }
}
