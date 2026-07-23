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
public sealed class PrescriptionsController(JffEhrDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PrescriptionDto>>> GetAll([FromQuery] Guid? registrationId)
    {
        var query = db.Prescriptions.Include(p => p.PrescribedByCrewMember).AsQueryable();
        if (registrationId is not null) { query = query.Where(p => p.RegistrationId == registrationId); }

        var prescriptions = await query.ToListAsync();
        var counts = await AdministeredCountsFor(prescriptions.Select(p => p.PrescriptionId).ToList());
        return Ok(prescriptions.Select(p => ToDto(p, counts.GetValueOrDefault(p.PrescriptionId))));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PrescriptionDto>> GetById(Guid id)
    {
        var prescription = await db.Prescriptions
            .Include(p => p.PrescribedByCrewMember)
            .FirstOrDefaultAsync(p => p.PrescriptionId == id);
        if (prescription is null) { return NotFound(); }

        return Ok(ToDto(prescription, await AdministeredCount(id)));
    }

    [HttpPost]
    [Authorize(Policy = "Medical")]
    public async Task<ActionResult<PrescriptionDto>> Create(CreatePrescriptionRequest request)
    {
        if (currentUser.CrewId is not { } prescribedBy)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var prescription = new Prescription
        {
            PrescriptionId = Guid.NewGuid(),
            RegistrationId = request.RegistrationId,
            MedicationName = request.MedicationName,
            Dose = request.Dose,
            Route = request.Route,
            Frequency = request.Frequency,
            ScheduledTimes = request.ScheduledTimes,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            PrescribedBy = prescribedBy,
            Notes = request.Notes,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.Prescriptions.Add(prescription);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("The specified registration does not exist.");
        }

        var saved = await db.Prescriptions
            .Include(p => p.PrescribedByCrewMember)
            .FirstAsync(p => p.PrescriptionId == prescription.PrescriptionId);

        return CreatedAtAction(nameof(GetById), new { id = prescription.PrescriptionId }, ToDto(saved, 0));
    }

    /// <summary>
    /// Tier 1 edit, allowed only before the first dose is administered. After
    /// that the prescription is locked: withdraw it and prescribe a correction.
    /// The DB trigger enforces the same rule independently.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "Medical")]
    public async Task<ActionResult<PrescriptionDto>> Update(Guid id, UpdatePrescriptionRequest request)
    {
        var prescription = await db.Prescriptions.FindAsync(id);
        if (prescription is null) { return NotFound(); }

        var administered = await AdministeredCount(id);
        if (administered > 0)
        {
            return Conflict("This prescription is locked: a dose has already been administered. Withdraw it and prescribe a correction instead.");
        }

        prescription.MedicationName = request.MedicationName;
        prescription.Dose = request.Dose;
        prescription.Route = request.Route;
        prescription.Frequency = request.Frequency;
        prescription.ScheduledTimes = request.ScheduledTimes;
        prescription.StartDate = request.StartDate;
        prescription.EndDate = request.EndDate;
        prescription.Notes = request.Notes;

        await db.SaveChangesAsync();

        var saved = await db.Prescriptions
            .Include(p => p.PrescribedByCrewMember)
            .FirstAsync(p => p.PrescriptionId == id);
        return Ok(ToDto(saved, 0));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Medical")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (currentUser.CrewId is not { } deletedBy)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var prescription = await db.Prescriptions.FindAsync(id);
        if (prescription is null) { return NotFound(); }

        prescription.DeletedAt = DateTimeOffset.UtcNow;
        prescription.DeletedBy = deletedBy;

        await db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Administered doses lock a prescription. Scheduled-but-not-given rows do
    /// not count, matching "before the first dose is administered".
    /// </summary>
    private async Task<int> AdministeredCount(Guid prescriptionId) =>
        await db.MedicationDoses
            .CountAsync(d => d.PrescriptionId == prescriptionId && d.AdministeredAt != null);

    private async Task<Dictionary<Guid, int>> AdministeredCountsFor(List<Guid> prescriptionIds)
    {
        if (prescriptionIds.Count == 0) { return []; }

        var grouped = await db.MedicationDoses
            .Where(d => prescriptionIds.Contains(d.PrescriptionId) && d.AdministeredAt != null)
            .GroupBy(d => d.PrescriptionId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToListAsync();

        return grouped.ToDictionary(x => x.Key, x => x.Count);
    }

    private static PrescriptionDto ToDto(Prescription p, int administeredDoseCount) => new()
    {
        IsLocked = administeredDoseCount > 0,
        AdministeredDoseCount = administeredDoseCount,
        PrescriptionId = p.PrescriptionId,
        RegistrationId = p.RegistrationId,
        MedicationName = p.MedicationName,
        Dose = p.Dose,
        Route = p.Route,
        Frequency = p.Frequency,
        ScheduledTimes = p.ScheduledTimes,
        StartDate = p.StartDate,
        EndDate = p.EndDate,
        PrescribedBy = p.PrescribedBy,
        PrescribedByName = p.PrescribedByCrewMember is null ? null : $"{p.PrescribedByCrewMember.Name} {p.PrescribedByCrewMember.Surname}",
        Notes = p.Notes,
        CreatedAt = p.CreatedAt,
    };
}
