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
public sealed class CampRegistrationsController(JffEhrDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CampRegistrationDto>>> GetAll(
        [FromQuery] Guid? campId, [FromQuery] Guid? camperId)
    {
        var query = db.CampRegistrations.AsQueryable();
        if (campId is not null) { query = query.Where(r => r.CampId == campId); }
        if (camperId is not null) { query = query.Where(r => r.CamperId == camperId); }

        var registrations = await query.ToListAsync();
        return Ok(registrations.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CampRegistrationDto>> GetById(Guid id)
    {
        var registration = await db.CampRegistrations.FindAsync(id);
        return registration is null ? NotFound() : Ok(ToDto(registration));
    }

    [HttpPost]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<ActionResult<CampRegistrationDto>> Create(CreateCampRegistrationRequest request)
    {
        var registration = new CampRegistration
        {
            RegistrationId = Guid.NewGuid(),
            CampId = request.CampId,
            CamperId = request.CamperId,
            Cabin = request.Cabin,
            GroupName = request.GroupName,
            Status = request.Status,
            RegisteredAt = DateTimeOffset.UtcNow,
        };

        db.CampRegistrations.Add(registration);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("The specified camp or camper does not exist.");
        }

        return CreatedAtAction(nameof(GetById), new { id = registration.RegistrationId }, ToDto(registration));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<IActionResult> Update(Guid id, UpdateCampRegistrationRequest request)
    {
        var registration = await db.CampRegistrations.FindAsync(id);
        if (registration is null) { return NotFound(); }

        registration.Cabin = request.Cabin;
        registration.GroupName = request.GroupName;
        registration.Status = request.Status;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var registration = await db.CampRegistrations.FindAsync(id);
        if (registration is null) { return NotFound(); }

        db.CampRegistrations.Remove(registration);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static CampRegistrationDto ToDto(CampRegistration r) => new()
    {
        RegistrationId = r.RegistrationId,
        CampId = r.CampId,
        CamperId = r.CamperId,
        Cabin = r.Cabin,
        GroupName = r.GroupName,
        Status = r.Status,
        RegisteredAt = r.RegisteredAt,
    };
}
