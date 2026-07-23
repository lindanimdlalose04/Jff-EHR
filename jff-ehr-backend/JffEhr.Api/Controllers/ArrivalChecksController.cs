using JffEhr.Api.Auth;
using JffEhr.Api.Data;
using JffEhr.Api.Dtos;
using JffEhr.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JffEhr.Api.Controllers;

/// <summary>
/// The nurse's day-one arrival check with the draft -> signed lifecycle
/// (Refinement B). Created as a draft (Gail pre-loads before camp), freely
/// editable while draft, locked by the sign action. Once signed, the DB trigger
/// permits only the soft-delete columns to change; corrections are amendments.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class ArrivalChecksController(JffEhrDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ArrivalCheckDto>>> GetAll([FromQuery] Guid? registrationId)
    {
        var query = db.ArrivalChecks
            .Include(a => a.AssessedByCrewMember)
            .Include(a => a.SignedByCrewMember)
            .AsQueryable();
        if (registrationId is not null) { query = query.Where(a => a.RegistrationId == registrationId); }

        var checks = await query.ToListAsync();
        return Ok(checks.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ArrivalCheckDto>> GetById(Guid id)
    {
        var check = await db.ArrivalChecks
            .Include(a => a.AssessedByCrewMember)
            .Include(a => a.SignedByCrewMember)
            .FirstOrDefaultAsync(a => a.ArrivalCheckId == id);
        return check is null ? NotFound() : Ok(ToDto(check));
    }

    [HttpPost]
    [Authorize(Policy = "Medical")]
    public async Task<ActionResult<ArrivalCheckDto>> Create(CreateArrivalCheckRequest request)
    {
        if (currentUser.CrewId is not { } assessedBy)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var check = new ArrivalCheck
        {
            ArrivalCheckId = Guid.NewGuid(),
            RegistrationId = request.RegistrationId,
            Status = ArrivalCheck.StatusDraft,
            AssessedBy = assessedBy,
            AssessedAt = DateTimeOffset.UtcNow,
        };
        Apply(check, request.HasAllergies, request.AllergiesDetail, request.Eyesight, request.Hearing,
            request.MobilityAids, request.Prosthesis, request.OtherNotes, request.AdlNeeds,
            request.TbScreening, request.HasMedication, request.MedicationHandedIn,
            request.MedicationHandedInDate, request.MedicationList, request.PhysicalCondition,
            request.AdditionalNotes);

        db.ArrivalChecks.Add(check);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            return Conflict("This registration already has an arrival check.");
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("The specified registration does not exist.");
        }

        return CreatedAtAction(nameof(GetById), new { id = check.ArrivalCheckId }, await Reload(check.ArrivalCheckId));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "Medical")]
    public async Task<ActionResult<ArrivalCheckDto>> Update(Guid id, UpdateArrivalCheckRequest request)
    {
        var check = await db.ArrivalChecks.FindAsync(id);
        if (check is null) { return NotFound(); }
        if (check.Status == ArrivalCheck.StatusSigned)
        {
            return Conflict("This arrival check is signed and locked. Record corrections as a new amendment.");
        }

        Apply(check, request.HasAllergies, request.AllergiesDetail, request.Eyesight, request.Hearing,
            request.MobilityAids, request.Prosthesis, request.OtherNotes, request.AdlNeeds,
            request.TbScreening, request.HasMedication, request.MedicationHandedIn,
            request.MedicationHandedInDate, request.MedicationList, request.PhysicalCondition,
            request.AdditionalNotes);

        await db.SaveChangesAsync();
        return Ok(await Reload(id));
    }

    /// <summary>The nurse's signature: flips draft to signed and locks the record.</summary>
    [HttpPost("{id:guid}/sign")]
    [Authorize(Policy = "Medical")]
    public async Task<ActionResult<ArrivalCheckDto>> Sign(Guid id)
    {
        if (currentUser.CrewId is not { } signedBy)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var check = await db.ArrivalChecks.FindAsync(id);
        if (check is null) { return NotFound(); }
        if (check.Status == ArrivalCheck.StatusSigned)
        {
            return Conflict("This arrival check is already signed.");
        }

        check.Status = ArrivalCheck.StatusSigned;
        check.SignedAt = DateTimeOffset.UtcNow;
        check.SignedBy = signedBy;
        await db.SaveChangesAsync();

        return Ok(await Reload(id));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Medical")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (currentUser.CrewId is not { } deletedBy)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var check = await db.ArrivalChecks.FindAsync(id);
        if (check is null) { return NotFound(); }

        check.DeletedAt = DateTimeOffset.UtcNow;
        check.DeletedBy = deletedBy;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<ArrivalCheckDto> Reload(Guid id)
    {
        var saved = await db.ArrivalChecks
            .Include(a => a.AssessedByCrewMember)
            .Include(a => a.SignedByCrewMember)
            .FirstAsync(a => a.ArrivalCheckId == id);
        return ToDto(saved);
    }

    private static void Apply(ArrivalCheck check, bool hasAllergies, string? allergiesDetail,
        string? eyesight, string? hearing, string? mobilityAids, string? prosthesis,
        string? otherNotes, string? adlNeeds, string? tbScreening, bool hasMedication,
        bool medicationHandedIn, DateOnly? medicationHandedInDate, string? medicationList,
        string? physicalCondition, string? additionalNotes)
    {
        check.HasAllergies = hasAllergies;
        check.AllergiesDetail = allergiesDetail;
        check.Eyesight = eyesight;
        check.Hearing = hearing;
        check.MobilityAids = mobilityAids;
        check.Prosthesis = prosthesis;
        check.OtherNotes = otherNotes;
        check.AdlNeeds = adlNeeds;
        check.TbScreening = tbScreening;
        check.HasMedication = hasMedication;
        check.MedicationHandedIn = medicationHandedIn;
        check.MedicationHandedInDate = medicationHandedInDate;
        check.MedicationList = medicationList;
        check.PhysicalCondition = physicalCondition;
        check.AdditionalNotes = additionalNotes;
    }

    private static ArrivalCheckDto ToDto(ArrivalCheck a) => new()
    {
        ArrivalCheckId = a.ArrivalCheckId,
        RegistrationId = a.RegistrationId,
        HasAllergies = a.HasAllergies,
        AllergiesDetail = a.AllergiesDetail,
        Eyesight = a.Eyesight,
        Hearing = a.Hearing,
        MobilityAids = a.MobilityAids,
        Prosthesis = a.Prosthesis,
        OtherNotes = a.OtherNotes,
        AdlNeeds = a.AdlNeeds,
        TbScreening = a.TbScreening,
        HasMedication = a.HasMedication,
        MedicationHandedIn = a.MedicationHandedIn,
        MedicationHandedInDate = a.MedicationHandedInDate,
        MedicationList = a.MedicationList,
        PhysicalCondition = a.PhysicalCondition,
        AdditionalNotes = a.AdditionalNotes,
        Status = a.Status,
        AssessedBy = a.AssessedBy,
        AssessedByName = a.AssessedByCrewMember is null ? null : $"{a.AssessedByCrewMember.Name} {a.AssessedByCrewMember.Surname}",
        AssessedAt = a.AssessedAt,
        SignedAt = a.SignedAt,
        SignedBy = a.SignedBy,
        SignedByName = a.SignedByCrewMember is null ? null : $"{a.SignedByCrewMember.Name} {a.SignedByCrewMember.Surname}",
    };
}
