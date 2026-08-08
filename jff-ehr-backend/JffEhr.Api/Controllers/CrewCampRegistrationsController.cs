using JffEhr.Api.Auth;
using JffEhr.Api.Data;
using JffEhr.Api.Dtos;
using JffEhr.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JffEhr.Api.Controllers;

/// <summary>
/// Crew-to-camp attendance, mirroring CampRegistrationsController for campers.
/// A crew member is added to each camp they attend; check-in status is read
/// separately from crew_medical_checkins. Tier 1: medical or admin, full CRUD.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class CrewCampRegistrationsController(JffEhrDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CrewCampRegistrationDto>>> GetAll(
        [FromQuery] Guid? campId, [FromQuery] Guid? crewId)
    {
        var query = db.CrewCampRegistrations.Include(r => r.CrewMember).AsQueryable();
        if (campId is not null) { query = query.Where(r => r.CampId == campId); }
        if (crewId is not null) { query = query.Where(r => r.CrewId == crewId); }

        var rows = await query.ToListAsync();
        return Ok(rows.Select(Project));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CrewCampRegistrationDto>> GetById(Guid id)
    {
        var reg = await db.CrewCampRegistrations
            .Include(r => r.CrewMember)
            .FirstOrDefaultAsync(r => r.CrewRegistrationId == id);
        return reg is null ? NotFound() : Ok(Project(reg));
    }

    [HttpPost]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<ActionResult<CrewCampRegistrationDto>> Create(CreateCrewCampRegistrationRequest request)
    {
        var reg = new CrewCampRegistration
        {
            CrewRegistrationId = Guid.NewGuid(),
            CrewId = request.CrewId,
            CampId = request.CampId,
            Role = string.IsNullOrWhiteSpace(request.Role) ? null : request.Role.Trim(),
            Status = string.IsNullOrWhiteSpace(request.Status) ? "registered" : request.Status.Trim(),
            RegisteredAt = DateTimeOffset.UtcNow,
        };

        db.CrewCampRegistrations.Add(reg);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            return Conflict("That crew member is already registered to this camp.");
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("The specified crew member or camp does not exist.");
        }

        var saved = await db.CrewCampRegistrations
            .Include(r => r.CrewMember)
            .FirstAsync(r => r.CrewRegistrationId == reg.CrewRegistrationId);
        return CreatedAtAction(nameof(GetById), new { id = reg.CrewRegistrationId }, Project(saved));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<IActionResult> Update(Guid id, UpdateCrewCampRegistrationRequest request)
    {
        var reg = await db.CrewCampRegistrations.FindAsync(id);
        if (reg is null) { return NotFound(); }

        reg.Role = string.IsNullOrWhiteSpace(request.Role) ? null : request.Role.Trim();
        reg.Status = request.Status.Trim();

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var reg = await db.CrewCampRegistrations.FindAsync(id);
        if (reg is null) { return NotFound(); }

        db.CrewCampRegistrations.Remove(reg);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static CrewCampRegistrationDto Project(CrewCampRegistration r) => new()
    {
        CrewRegistrationId = r.CrewRegistrationId,
        CrewId = r.CrewId,
        CrewName = r.CrewMember is null ? null : $"{r.CrewMember.Name} {r.CrewMember.Surname}",
        CampId = r.CampId,
        Role = r.Role,
        Status = r.Status,
        RegisteredAt = r.RegisteredAt,
    };
}
