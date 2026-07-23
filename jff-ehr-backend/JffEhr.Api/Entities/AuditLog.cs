namespace JffEhr.Api.Entities;

/// <summary>
/// Append-only audit trail. entity_id is a generic reference to a row in entity_table
/// and is intentionally not a foreign key (it can point at any of the 16 tables).
/// </summary>
public class AuditLog
{
    public Guid AuditId { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public required string EntityTable { get; set; }
    public Guid EntityId { get; set; }
    public required string Action { get; set; }

    /// <summary>jsonb, stored as raw JSON text at this layer.</summary>
    public string? BeforeState { get; set; }

    /// <summary>jsonb, stored as raw JSON text at this layer.</summary>
    public string? AfterState { get; set; }

    public string? IpAddress { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
