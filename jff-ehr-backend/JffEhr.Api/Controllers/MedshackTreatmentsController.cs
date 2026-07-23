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
public sealed class MedshackTreatmentsController(JffEhrDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<MedshackTreatmentDto>>> GetAll([FromQuery] Guid? visitId)
    {
        var query = db.MedshackTreatments.Include(t => t.AdministeredByCrewMember).AsQueryable();
        if (visitId is not null) { query = query.Where(t => t.VisitId == visitId); }

        var treatments = await query.ToListAsync();
        return Ok(treatments.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MedshackTreatmentDto>> GetById(Guid id)
    {
        var treatment = await db.MedshackTreatments
            .Include(t => t.AdministeredByCrewMember)
            .FirstOrDefaultAsync(t => t.TreatmentId == id);
        return treatment is null ? NotFound() : Ok(ToDto(treatment));
    }

    [HttpPost]
    [Authorize(Policy = "Medical")]
    public async Task<ActionResult<MedshackTreatmentDto>> Create(CreateMedshackTreatmentRequest request)
    {
        if (currentUser.CrewId is not { } administeredBy)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var maxSequenceNo = await db.MedshackTreatments
            .Where(t => t.VisitId == request.VisitId)
            .Select(t => (int?)t.SequenceNo)
            .MaxAsync() ?? 0;

        var treatment = new MedshackTreatment
        {
            TreatmentId = Guid.NewGuid(),
            VisitId = request.VisitId,
            SequenceNo = maxSequenceNo + 1,
            TreatmentTime = request.TreatmentTime,
            TreatmentDescription = request.TreatmentDescription,
            Outcome = request.Outcome,
            AdministeredBy = administeredBy,
        };

        db.MedshackTreatments.Add(treatment);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("The specified visit does not exist.");
        }

        var saved = await db.MedshackTreatments
            .Include(t => t.AdministeredByCrewMember)
            .FirstAsync(t => t.TreatmentId == treatment.TreatmentId);

        return CreatedAtAction(nameof(GetById), new { id = treatment.TreatmentId }, ToDto(saved));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Medical")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (currentUser.CrewId is not { } deletedBy)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var treatment = await db.MedshackTreatments.FindAsync(id);
        if (treatment is null) { return NotFound(); }

        treatment.DeletedAt = DateTimeOffset.UtcNow;
        treatment.DeletedBy = deletedBy;

        await db.SaveChangesAsync();
        return NoContent();
    }

    private static MedshackTreatmentDto ToDto(MedshackTreatment t) => new()
    {
        TreatmentId = t.TreatmentId,
        VisitId = t.VisitId,
        SequenceNo = t.SequenceNo,
        TreatmentTime = t.TreatmentTime,
        TreatmentDescription = t.TreatmentDescription,
        Outcome = t.Outcome,
        AdministeredBy = t.AdministeredBy,
        AdministeredByName = t.AdministeredByCrewMember is null ? null : $"{t.AdministeredByCrewMember.Name} {t.AdministeredByCrewMember.Surname}",
    };
}
