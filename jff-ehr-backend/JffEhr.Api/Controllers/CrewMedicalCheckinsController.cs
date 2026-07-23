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
public sealed class CrewMedicalCheckinsController(JffEhrDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CrewMedicalCheckinDto>>> GetAll(
        [FromQuery] Guid? campId, [FromQuery] Guid? crewId)
    {
        var query = db.CrewMedicalCheckins
            .Include(c => c.CrewMember)
            .Include(c => c.CheckedInByCrewMember)
            .AsQueryable();
        if (campId is not null) { query = query.Where(c => c.CampId == campId); }
        if (crewId is not null) { query = query.Where(c => c.CrewId == crewId); }

        var checkins = await query.ToListAsync();
        return Ok(checkins.Select(Project));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CrewMedicalCheckinDto>> GetById(Guid id)
    {
        var checkin = await db.CrewMedicalCheckins
            .Include(c => c.CrewMember)
            .Include(c => c.CheckedInByCrewMember)
            .FirstOrDefaultAsync(c => c.CheckinId == id);
        return checkin is null ? NotFound() : Ok(Project(checkin));
    }

    [HttpPost]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<ActionResult<CrewMedicalCheckinDto>> Create(CreateCrewMedicalCheckinRequest request)
    {
        if (currentUser.CrewId is not { } checkedInBy)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var checkin = new CrewMedicalCheckin
        {
            CheckinId = Guid.NewGuid(),
            CrewId = request.CrewId,
            CampId = request.CampId,
            Allergies = request.Allergies,
            HasBroviacPort = request.HasBroviacPort,
            HasBloodCount = request.HasBloodCount,
            Eyesight = request.Eyesight,
            Hearing = request.Hearing,
            MobilityAids = request.MobilityAids,
            CurrentMedications = request.CurrentMedications,
            MedicalReleaseSigned = request.MedicalReleaseSigned,
            CheckedInBy = checkedInBy,
            CheckedInAt = DateTimeOffset.UtcNow,
        };

        db.CrewMedicalCheckins.Add(checkin);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("The specified crew member or camp does not exist.");
        }

        var saved = await db.CrewMedicalCheckins
            .Include(c => c.CrewMember)
            .Include(c => c.CheckedInByCrewMember)
            .FirstAsync(c => c.CheckinId == checkin.CheckinId);

        return CreatedAtAction(nameof(GetById), new { id = checkin.CheckinId }, Project(saved));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<IActionResult> Update(Guid id, UpdateCrewMedicalCheckinRequest request)
    {
        var checkin = await db.CrewMedicalCheckins.FindAsync(id);
        if (checkin is null) { return NotFound(); }

        checkin.Allergies = request.Allergies;
        checkin.HasBroviacPort = request.HasBroviacPort;
        checkin.HasBloodCount = request.HasBloodCount;
        checkin.Eyesight = request.Eyesight;
        checkin.Hearing = request.Hearing;
        checkin.MobilityAids = request.MobilityAids;
        checkin.CurrentMedications = request.CurrentMedications;
        checkin.MedicalReleaseSigned = request.MedicalReleaseSigned;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var checkin = await db.CrewMedicalCheckins.FindAsync(id);
        if (checkin is null) { return NotFound(); }

        db.CrewMedicalCheckins.Remove(checkin);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static CrewMedicalCheckinDto Project(CrewMedicalCheckin c) => new()
    {
        CheckinId = c.CheckinId,
        CrewId = c.CrewId,
        CrewName = c.CrewMember!.Name + " " + c.CrewMember.Surname,
        CampId = c.CampId,
        Allergies = c.Allergies,
        HasBroviacPort = c.HasBroviacPort,
        HasBloodCount = c.HasBloodCount,
        Eyesight = c.Eyesight,
        Hearing = c.Hearing,
        MobilityAids = c.MobilityAids,
        CurrentMedications = c.CurrentMedications,
        MedicalReleaseSigned = c.MedicalReleaseSigned,
        CheckedInBy = c.CheckedInBy,
        CheckedInByName = c.CheckedInByCrewMember!.Name + " " + c.CheckedInByCrewMember.Surname,
        CheckedInAt = c.CheckedInAt,
    };
}
