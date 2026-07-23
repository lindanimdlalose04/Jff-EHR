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
public sealed class MedicationDosesController(JffEhrDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<MedicationDoseDto>>> GetAll([FromQuery] Guid? prescriptionId)
    {
        var query = db.MedicationDoses.Include(d => d.AdministeredByCrewMember).AsQueryable();
        if (prescriptionId is not null) { query = query.Where(d => d.PrescriptionId == prescriptionId); }

        var doses = await query.ToListAsync();
        return Ok(doses.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MedicationDoseDto>> GetById(Guid id)
    {
        var dose = await db.MedicationDoses
            .Include(d => d.AdministeredByCrewMember)
            .FirstOrDefaultAsync(d => d.DoseId == id);
        return dose is null ? NotFound() : Ok(ToDto(dose));
    }

    [HttpPost]
    [Authorize(Policy = "Medical")]
    public async Task<ActionResult<MedicationDoseDto>> Create(CreateMedicationDoseRequest request)
    {
        if (currentUser.CrewId is not { } administeredBy)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var dose = new MedicationDose
        {
            DoseId = Guid.NewGuid(),
            PrescriptionId = request.PrescriptionId,
            ScheduledAt = request.ScheduledAt,
            AdministeredAt = request.AdministeredAt,
            AdministeredBy = administeredBy,
            Status = request.Status,
            Notes = request.Notes,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.MedicationDoses.Add(dose);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("The specified prescription does not exist.");
        }

        var saved = await db.MedicationDoses
            .Include(d => d.AdministeredByCrewMember)
            .FirstAsync(d => d.DoseId == dose.DoseId);

        return CreatedAtAction(nameof(GetById), new { id = dose.DoseId }, ToDto(saved));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Medical")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (currentUser.CrewId is not { } deletedBy)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var dose = await db.MedicationDoses.FindAsync(id);
        if (dose is null) { return NotFound(); }

        dose.DeletedAt = DateTimeOffset.UtcNow;
        dose.DeletedBy = deletedBy;

        await db.SaveChangesAsync();
        return NoContent();
    }

    private static MedicationDoseDto ToDto(MedicationDose d) => new()
    {
        DoseId = d.DoseId,
        PrescriptionId = d.PrescriptionId,
        ScheduledAt = d.ScheduledAt,
        AdministeredAt = d.AdministeredAt,
        AdministeredBy = d.AdministeredBy,
        AdministeredByName = d.AdministeredByCrewMember is null ? null : $"{d.AdministeredByCrewMember.Name} {d.AdministeredByCrewMember.Surname}",
        Status = d.Status,
        Notes = d.Notes,
        CreatedAt = d.CreatedAt,
    };
}
