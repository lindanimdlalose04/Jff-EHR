namespace JffEhr.Api.Dtos;

/// <summary>
/// Read-only. AuditLog rows are only ever written by AuditSaveChangesInterceptor;
/// there is no create/update request DTO.
/// </summary>
public sealed class AuditLogDto
{
    public Guid AuditId { get; set; }
    public Guid UserId { get; set; }
    public string? UserEmail { get; set; }
    public string? EntityTable { get; set; }
    public Guid EntityId { get; set; }
    public string? Action { get; set; }
    public string? BeforeState { get; set; }
    public string? AfterState { get; set; }
    public string? IpAddress { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
