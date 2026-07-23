using JffEhr.Api.Auth;
using JffEhr.Api.Data;
using JffEhr.Api.Dtos;
using JffEhr.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JffEhr.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class ConsentRecordsController(JffEhrDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ConsentRecordDto>>> GetAll([FromQuery] Guid? registrationId)
    {
        var query = db.ConsentRecords.AsQueryable();
        if (registrationId is not null) { query = query.Where(c => c.RegistrationId == registrationId); }

        var records = await query.ToListAsync();
        return Ok(records.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ConsentRecordDto>> GetById(Guid id)
    {
        var record = await db.ConsentRecords.FindAsync(id);
        return record is null ? NotFound() : Ok(ToDto(record));
    }

    [HttpPost]
    [Authorize(Policy = "Medical")]
    public async Task<ActionResult<ConsentRecordDto>> Create(CreateConsentRecordRequest request)
    {
        var record = new ConsentRecord
        {
            ConsentId = Guid.NewGuid(),
            RegistrationId = request.RegistrationId,
            ConsentType = request.ConsentType,
            SignedBy = request.SignedBy,
            WitnessName = request.WitnessName,
            SignedAt = request.SignedAt,
            SignedLocation = request.SignedLocation,
            DocumentUrl = request.DocumentUrl,
            PopiaAcknowledged = request.PopiaAcknowledged,
        };

        db.ConsentRecords.Add(record);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("The specified registration does not exist.");
        }

        return CreatedAtAction(nameof(GetById), new { id = record.ConsentId }, ToDto(record));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Medical")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (currentUser.CrewId is not { } deletedBy)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var record = await db.ConsentRecords.FindAsync(id);
        if (record is null) { return NotFound(); }

        record.DeletedAt = DateTimeOffset.UtcNow;
        record.DeletedBy = deletedBy;

        await db.SaveChangesAsync();
        return NoContent();
    }

    private static ConsentRecordDto ToDto(ConsentRecord c) => new()
    {
        ConsentId = c.ConsentId,
        RegistrationId = c.RegistrationId,
        ConsentType = c.ConsentType,
        SignedBy = c.SignedBy,
        WitnessName = c.WitnessName,
        SignedAt = c.SignedAt,
        SignedLocation = c.SignedLocation,
        DocumentUrl = c.DocumentUrl,
        PopiaAcknowledged = c.PopiaAcknowledged,
    };
}
