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
public sealed class MedicationEventsController(JffEhrDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<MedicationEventDto>>> GetAll([FromQuery] Guid? registrationId)
    {
        var query = db.MedicationEvents
            .Include(e => e.Reporter)
            .Include(e => e.Reviewer)
            .AsQueryable();
        if (registrationId is not null) { query = query.Where(e => e.RegistrationId == registrationId); }

        var events = await query.ToListAsync();
        return Ok(events.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<MedicationEventDto>> GetById(Guid id)
    {
        var evt = await db.MedicationEvents
            .Include(e => e.Reporter)
            .Include(e => e.Reviewer)
            .FirstOrDefaultAsync(e => e.EventId == id);
        return evt is null ? NotFound() : Ok(ToDto(evt));
    }

    [HttpPost]
    [Authorize(Policy = "Medical")]
    public async Task<ActionResult<MedicationEventDto>> Create(CreateMedicationEventRequest request)
    {
        if (currentUser.CrewId is not { } reporterId)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var evt = new MedicationEvent
        {
            EventId = Guid.NewGuid(),
            RegistrationId = request.RegistrationId,
            EventAt = request.EventAt,
            DiscoveryAt = request.DiscoveryAt,
            Description = request.Description,
            EventTypes = request.EventTypes,
            ContributingFactors = request.ContributingFactors,
            OtherEventType = string.IsNullOrWhiteSpace(request.OtherEventType) ? null : request.OtherEventType.Trim(),
            OtherContributingFactor = string.IsNullOrWhiteSpace(request.OtherContributingFactor) ? null : request.OtherContributingFactor.Trim(),
            ImmediateAction = request.ImmediateAction,
            DoctorNotified = request.DoctorNotified,
            NoTreatmentOrdered = request.NoTreatmentOrdered,
            TreatmentOrdered = request.NoTreatmentOrdered ? null : request.TreatmentOrdered,
            ReporterId = reporterId,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.MedicationEvents.Add(evt);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("The specified registration or reviewer does not exist.");
        }

        var saved = await db.MedicationEvents
            .Include(e => e.Reporter)
            .Include(e => e.Reviewer)
            .FirstAsync(e => e.EventId == evt.EventId);

        return CreatedAtAction(nameof(GetById), new { id = evt.EventId }, ToDto(saved));
    }

    /// <summary>
    /// The medical person's sign-off. The only permitted change to a filed
    /// event, and only while it is unreviewed: the DB trigger enforces both
    /// that nothing else changes and that a review is never rewritten.
    /// </summary>
    [HttpPost("{id:guid}/review")]
    [Authorize(Policy = "Medical")]
    public async Task<ActionResult<MedicationEventDto>> Review(Guid id, ReviewMedicationEventRequest request)
    {
        if (currentUser.CrewId is not { } reviewerId)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var evt = await db.MedicationEvents.FindAsync(id);
        if (evt is null) { return NotFound(); }
        if (evt.ReviewerId is not null || evt.CorrectiveAction is not null)
        {
            return Conflict("This event has already been reviewed; the review cannot be changed.");
        }

        evt.ReviewerId = reviewerId;
        evt.CorrectiveAction = request.CorrectiveAction;
        evt.ReviewedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync();

        var saved = await db.MedicationEvents
            .Include(e => e.Reporter)
            .Include(e => e.Reviewer)
            .FirstAsync(e => e.EventId == id);
        return Ok(ToDto(saved));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Medical")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (currentUser.CrewId is not { } deletedBy)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var evt = await db.MedicationEvents.FindAsync(id);
        if (evt is null) { return NotFound(); }

        evt.DeletedAt = DateTimeOffset.UtcNow;
        evt.DeletedBy = deletedBy;

        await db.SaveChangesAsync();
        return NoContent();
    }

    private static MedicationEventDto ToDto(MedicationEvent e) => new()
    {
        EventId = e.EventId,
        RegistrationId = e.RegistrationId,
        EventAt = e.EventAt,
        DiscoveryAt = e.DiscoveryAt,
        Description = e.Description,
        EventTypes = e.EventTypes,
        ContributingFactors = e.ContributingFactors,
        OtherEventType = e.OtherEventType,
        OtherContributingFactor = e.OtherContributingFactor,
        ImmediateAction = e.ImmediateAction,
        DoctorNotified = e.DoctorNotified,
        NoTreatmentOrdered = e.NoTreatmentOrdered,
        TreatmentOrdered = e.TreatmentOrdered,
        CorrectiveAction = e.CorrectiveAction,
        ReporterId = e.ReporterId,
        ReporterName = e.Reporter is null ? null : $"{e.Reporter.Name} {e.Reporter.Surname}",
        ReviewerId = e.ReviewerId,
        ReviewerName = e.Reviewer is null ? null : $"{e.Reviewer.Name} {e.Reviewer.Surname}",
        ReviewedAt = e.ReviewedAt,
        IsReviewed = e.ReviewerId is not null,
        CreatedAt = e.CreatedAt,
    };
}
