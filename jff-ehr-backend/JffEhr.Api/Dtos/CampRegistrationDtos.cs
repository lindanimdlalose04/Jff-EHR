using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class CampRegistrationDto
{
    public Guid RegistrationId { get; set; }
    public Guid CampId { get; set; }
    public Guid CamperId { get; set; }
    public string? Cabin { get; set; }
    public string? GroupName { get; set; }
    public required string Status { get; set; }
    public DateTimeOffset RegisteredAt { get; set; }
}

public sealed class CreateCampRegistrationRequest
{
    [Required]
    public Guid CampId { get; set; }

    [Required]
    public Guid CamperId { get; set; }

    [MaxLength(20)]
    public string? Cabin { get; set; }

    [MaxLength(40)]
    public string? GroupName { get; set; }

    [Required, MaxLength(20)]
    public required string Status { get; set; }
}

public sealed class UpdateCampRegistrationRequest
{
    [MaxLength(20)]
    public string? Cabin { get; set; }

    [MaxLength(40)]
    public string? GroupName { get; set; }

    [Required, MaxLength(20)]
    public required string Status { get; set; }
}
