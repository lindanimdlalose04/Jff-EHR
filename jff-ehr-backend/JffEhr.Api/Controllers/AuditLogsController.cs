using JffEhr.Api.Data;
using JffEhr.Api.Dtos;
using JffEhr.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JffEhr.Api.Controllers;

/// <summary>
/// Read-only. AuditLog rows are only ever written by AuditSaveChangesInterceptor;
/// there are no create/update/delete endpoints.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Admin")]
public sealed class AuditLogsController(JffEhrDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<AuditLogDto>>> GetAll(
        [FromQuery] string? entityTable, [FromQuery] Guid? entityId, [FromQuery] Guid? userId)
    {
        var query = db.AuditLogs.Include(a => a.User).AsQueryable();
        if (!string.IsNullOrWhiteSpace(entityTable)) { query = query.Where(a => a.EntityTable == entityTable); }
        if (entityId is not null) { query = query.Where(a => a.EntityId == entityId); }
        if (userId is not null) { query = query.Where(a => a.UserId == userId); }

        var logs = await query.OrderByDescending(a => a.CreatedAt).ToListAsync();
        return Ok(logs.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AuditLogDto>> GetById(Guid id)
    {
        var log = await db.AuditLogs.Include(a => a.User).FirstOrDefaultAsync(a => a.AuditId == id);
        return log is null ? NotFound() : Ok(ToDto(log));
    }

    private static AuditLogDto ToDto(AuditLog a) => new()
    {
        AuditId = a.AuditId,
        UserId = a.UserId,
        UserEmail = a.User?.Email,
        EntityTable = a.EntityTable,
        EntityId = a.EntityId,
        Action = a.Action,
        BeforeState = a.BeforeState,
        AfterState = a.AfterState,
        IpAddress = a.IpAddress,
        CreatedAt = a.CreatedAt,
    };
}
