using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class CrewCampRegistrationDto
{
    public Guid CrewRegistrationId { get; set; }
    public Guid CrewId { get; set; }
    public string? CrewName { get; set; }
    public Guid CampId { get; set; }
    public string? Role { get; set; }
    public string Status { get; set; } = "registered";
    public DateTimeOffset RegisteredAt { get; set; }
}

public sealed class CreateCrewCampRegistrationRequest
{
    [Required]
    public Guid CrewId { get; set; }

    [Required]
    public Guid CampId { get; set; }

    public string? Role { get; set; }

    /// <summary>Defaults to "registered" server-side when omitted.</summary>
    public string? Status { get; set; }
}

public sealed class UpdateCrewCampRegistrationRequest
{
    public string? Role { get; set; }

    [Required]
    public required string Status { get; set; }
}
