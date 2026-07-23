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
public sealed class MedshackVisitsController(JffEhrDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<MedshackVisitDto>>> GetAll([FromQuery] Guid? registrationId)
    {
        var query = db.MedshackVisits
            .Include(v => v.Nurse)
            .Include(v => v.Doctor)
            .AsQueryable();
        if (registrationId is not null) { query = query.Where(v => v.RegistrationId == registrationId); }

        var visits = await query.ToListAsync();
        return Ok(visits.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MedshackVisitDto>> GetById(Guid id)
    {
        var visit = await db.MedshackVisits
            .Include(v => v.Nurse)
            .Include(v => v.Doctor)
            .FirstOrDefaultAsync(v => v.VisitId == id);
        return visit is null ? NotFound() : Ok(ToDto(visit));
    }

    [HttpPost]
    [Authorize(Policy = "Medical")]
    public async Task<ActionResult<MedshackVisitDto>> Create(CreateMedshackVisitRequest request)
    {
        if (currentUser.CrewId is not { } nurseId)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var visit = new MedshackVisit
        {
            VisitId = Guid.NewGuid(),
            RegistrationId = request.RegistrationId,
            VisitAt = request.VisitAt,
            Reason = request.Reason,
            AccompaniedBy = request.AccompaniedBy,
            Temperature = request.Temperature,
            Pulse = request.Pulse,
            BloodPressure = request.BloodPressure,
            OxygenSaturation = request.OxygenSaturation,
            MedicalHistory = request.MedicalHistory,
            SignsSymptoms = request.SignsSymptoms,
            Findings = request.Findings,
            NursingReport = request.NursingReport,
            AdviceGiven = request.AdviceGiven,
            NurseId = nurseId,
            DoctorId = request.DoctorId,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.MedshackVisits.Add(visit);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("The specified registration or doctor does not exist.");
        }

        var saved = await db.MedshackVisits
            .Include(v => v.Nurse)
            .Include(v => v.Doctor)
            .FirstAsync(v => v.VisitId == visit.VisitId);

        return CreatedAtAction(nameof(GetById), new { id = visit.VisitId }, ToDto(saved));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Medical")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (currentUser.CrewId is not { } deletedBy)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var visit = await db.MedshackVisits.FindAsync(id);
        if (visit is null) { return NotFound(); }

        visit.DeletedAt = DateTimeOffset.UtcNow;
        visit.DeletedBy = deletedBy;

        await db.SaveChangesAsync();
        return NoContent();
    }

    private static MedshackVisitDto ToDto(MedshackVisit v) => new()
    {
        VisitId = v.VisitId,
        RegistrationId = v.RegistrationId,
        VisitAt = v.VisitAt,
        Reason = v.Reason,
        AccompaniedBy = v.AccompaniedBy,
        Temperature = v.Temperature,
        Pulse = v.Pulse,
        BloodPressure = v.BloodPressure,
        OxygenSaturation = v.OxygenSaturation,
        MedicalHistory = v.MedicalHistory,
        SignsSymptoms = v.SignsSymptoms,
        Findings = v.Findings,
        NursingReport = v.NursingReport,
        AdviceGiven = v.AdviceGiven,
        NurseId = v.NurseId,
        NurseName = v.Nurse is null ? null : $"{v.Nurse.Name} {v.Nurse.Surname}",
        DoctorId = v.DoctorId,
        DoctorName = v.Doctor is null ? null : $"{v.Doctor.Name} {v.Doctor.Surname}",
        CreatedAt = v.CreatedAt,
    };
}
