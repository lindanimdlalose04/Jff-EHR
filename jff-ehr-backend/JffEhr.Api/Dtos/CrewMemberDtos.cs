using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class CrewMemberDto
{
    public Guid CrewId { get; set; }
    public required string Name { get; set; }
    public required string Surname { get; set; }
    public required string IdNumber { get; set; }
    public DateOnly? Dob { get; set; }
    public required string Role { get; set; }
    public string? PhotoUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class CreateCrewMemberRequest
{
    [Required, MaxLength(80)]
    public required string Name { get; set; }

    [Required, MaxLength(80)]
    public required string Surname { get; set; }

    [Required, MaxLength(20)]
    public required string IdNumber { get; set; }
    public DateOnly? Dob { get; set; }

    [Required, MaxLength(60)]
    public required string Role { get; set; }
    public string? PhotoUrl { get; set; }
}

public sealed class UpdateCrewMemberRequest
{
    [Required, MaxLength(80)]
    public required string Name { get; set; }

    [Required, MaxLength(80)]
    public required string Surname { get; set; }

    [Required, MaxLength(20)]
    public required string IdNumber { get; set; }
    public DateOnly? Dob { get; set; }

    [Required, MaxLength(60)]
    public required string Role { get; set; }
    public string? PhotoUrl { get; set; }
}
