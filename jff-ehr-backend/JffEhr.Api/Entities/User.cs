namespace JffEhr.Api.Entities;

/// <summary>One-to-one subset of CrewMember: a CrewMember may have system access.</summary>
public class User
{
    public Guid UserId { get; set; }

    public Guid CrewId { get; set; }
    public CrewMember? CrewMember { get; set; }

    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public required string RolePermissions { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }
    public bool IsActive { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
