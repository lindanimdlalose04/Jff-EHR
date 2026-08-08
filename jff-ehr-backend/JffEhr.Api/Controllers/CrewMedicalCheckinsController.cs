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
            .Include(c => c.CrewCampRegistration).ThenInclude(r => r!.CrewMember)
            .Include(c => c.CheckedInByCrewMember)
            .AsQueryable();
        if (campId is not null) { query = query.Where(c => c.CrewCampRegistration!.CampId == campId); }
        if (crewId is not null) { query = query.Where(c => c.CrewCampRegistration!.CrewId == crewId); }

        var checkins = await query.ToListAsync();
        return Ok(checkins.Select(Project));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CrewMedicalCheckinDto>> GetById(Guid id)
    {
        var checkin = await db.CrewMedicalCheckins
            .Include(c => c.CrewCampRegistration).ThenInclude(r => r!.CrewMember)
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

        // The check-in hangs off the crew member's registration to this camp
        // (full mirror of the camper clinical chain). Ensure that registration
        // exists first: checking someone in also confirms they are attending.
        var registration = await db.CrewCampRegistrations
            .FirstOrDefaultAsync(r => r.CrewId == request.CrewId && r.CampId == request.CampId);
        if (registration is null)
        {
            registration = new CrewCampRegistration
            {
                CrewRegistrationId = Guid.NewGuid(),
                CrewId = request.CrewId,
                CampId = request.CampId,
                Role = null,
                Status = "attended",
                RegisteredAt = DateTimeOffset.UtcNow,
            };
            db.CrewCampRegistrations.Add(registration);
        }

        var checkin = new CrewMedicalCheckin
        {
            CheckinId = Guid.NewGuid(),
            CrewRegistrationId = registration.CrewRegistrationId,
            Allergies = request.Allergies,
            Eyesight = request.Eyesight,
            Hearing = request.Hearing,
            CurrentMedications = request.CurrentMedications,
            Comments = request.Comments,
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
            .Include(c => c.CrewCampRegistration).ThenInclude(r => r!.CrewMember)
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
        checkin.Eyesight = request.Eyesight;
        checkin.Hearing = request.Hearing;
        checkin.CurrentMedications = request.CurrentMedications;
        checkin.Comments = request.Comments;
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
        CrewRegistrationId = c.CrewRegistrationId,
        CrewId = c.CrewCampRegistration!.CrewId,
        CrewName = c.CrewCampRegistration.CrewMember!.Name + " " + c.CrewCampRegistration.CrewMember.Surname,
        CampId = c.CrewCampRegistration.CampId,
        Allergies = c.Allergies,
        Eyesight = c.Eyesight,
        Hearing = c.Hearing,
        CurrentMedications = c.CurrentMedications,
        Comments = c.Comments,
        MedicalReleaseSigned = c.MedicalReleaseSigned,
        CheckedInBy = c.CheckedInBy,
        CheckedInByName = c.CheckedInByCrewMember!.Name + " " + c.CheckedInByCrewMember.Surname,
        CheckedInAt = c.CheckedInAt,
    };
}
