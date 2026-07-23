using JffEhr.Api.Auth;
using JffEhr.Api.Data;
using JffEhr.Api.Dtos;
using JffEhr.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JffEhr.Api.Controllers;

/// <summary>
/// The caregiver's pre-camp medical half of the intake (Refinement A). One per
/// registration. Editable (no signing lifecycle), but never hard-deleted: the
/// DB trigger blocks DELETE, so removal is the soft-delete flags only.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class PrecampMedicalsController(JffEhrDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PrecampMedicalDto>>> GetAll([FromQuery] Guid? registrationId)
    {
        var query = db.PrecampMedicals.Include(p => p.CapturedByCrewMember).AsQueryable();
        if (registrationId is not null) { query = query.Where(p => p.RegistrationId == registrationId); }

        var records = await query.ToListAsync();
        return Ok(records.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PrecampMedicalDto>> GetById(Guid id)
    {
        var record = await db.PrecampMedicals
            .Include(p => p.CapturedByCrewMember)
            .FirstOrDefaultAsync(p => p.PrecampId == id);
        return record is null ? NotFound() : Ok(ToDto(record));
    }

    [HttpPost]
    [Authorize(Policy = "Medical")]
    public async Task<ActionResult<PrecampMedicalDto>> Create(CreatePrecampMedicalRequest request)
    {
        if (currentUser.CrewId is not { } capturedBy)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var record = new PrecampMedical
        {
            PrecampId = Guid.NewGuid(),
            RegistrationId = request.RegistrationId,
            CapturedBy = capturedBy,
            CapturedAt = DateTimeOffset.UtcNow,
        };
        Apply(record, request.Diagnosis, request.HospitalFileNumber, request.TreatingContact,
            request.VlOver1000, request.ViralLoad, request.VlTestDate, request.VlDateReceived,
            request.ClinicalFindings, request.TbStatus, request.HepatitisB, request.TbOisHistory,
            request.TbOisHistoryDetail, request.MedicationList, request.AdherenceBarriers,
            request.AdherenceBarriersDetail, request.DietaryRequirements, request.Religion,
            request.AdditionalInfo, request.CamperHistoryNotes);

        db.PrecampMedicals.Add(record);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            return Conflict("This registration already has a pre-camp medical record.");
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("The specified registration does not exist.");
        }

        var saved = await db.PrecampMedicals
            .Include(p => p.CapturedByCrewMember)
            .FirstAsync(p => p.PrecampId == record.PrecampId);
        return CreatedAtAction(nameof(GetById), new { id = record.PrecampId }, ToDto(saved));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "Medical")]
    public async Task<ActionResult<PrecampMedicalDto>> Update(Guid id, UpdatePrecampMedicalRequest request)
    {
        var record = await db.PrecampMedicals
            .Include(p => p.CapturedByCrewMember)
            .FirstOrDefaultAsync(p => p.PrecampId == id);
        if (record is null) { return NotFound(); }

        Apply(record, request.Diagnosis, request.HospitalFileNumber, request.TreatingContact,
            request.VlOver1000, request.ViralLoad, request.VlTestDate, request.VlDateReceived,
            request.ClinicalFindings, request.TbStatus, request.HepatitisB, request.TbOisHistory,
            request.TbOisHistoryDetail, request.MedicationList, request.AdherenceBarriers,
            request.AdherenceBarriersDetail, request.DietaryRequirements, request.Religion,
            request.AdditionalInfo, request.CamperHistoryNotes);

        await db.SaveChangesAsync();
        return Ok(ToDto(record));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "Medical")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (currentUser.CrewId is not { } deletedBy)
        {
            return Problem("The current user has no linked crew member.", statusCode: StatusCodes.Status403Forbidden);
        }

        var record = await db.PrecampMedicals.FindAsync(id);
        if (record is null) { return NotFound(); }

        record.DeletedAt = DateTimeOffset.UtcNow;
        record.DeletedBy = deletedBy;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static void Apply(PrecampMedical record, string? diagnosis, string? hospitalFileNumber,
        string? treatingContact, bool? vlOver1000, string? viralLoad, DateOnly? vlTestDate,
        DateOnly? vlDateReceived, string? clinicalFindings, string? tbStatus, bool? hepatitisB,
        bool tbOisHistory, string? tbOisHistoryDetail, string? medicationList, bool adherenceBarriers,
        string? adherenceBarriersDetail, string? dietaryRequirements, string? religion,
        string? additionalInfo, string? camperHistoryNotes)
    {
        record.Diagnosis = diagnosis;
        record.HospitalFileNumber = hospitalFileNumber;
        record.TreatingContact = treatingContact;
        record.VlOver1000 = vlOver1000;
        record.ViralLoad = viralLoad;
        record.VlTestDate = vlTestDate;
        record.VlDateReceived = vlDateReceived;
        record.ClinicalFindings = clinicalFindings;
        record.TbStatus = tbStatus;
        record.HepatitisB = hepatitisB;
        record.TbOisHistory = tbOisHistory;
        record.TbOisHistoryDetail = tbOisHistoryDetail;
        record.MedicationList = medicationList;
        record.AdherenceBarriers = adherenceBarriers;
        record.AdherenceBarriersDetail = adherenceBarriersDetail;
        record.DietaryRequirements = dietaryRequirements;
        record.Religion = religion;
        record.AdditionalInfo = additionalInfo;
        record.CamperHistoryNotes = camperHistoryNotes;
    }

    private static PrecampMedicalDto ToDto(PrecampMedical p) => new()
    {
        PrecampId = p.PrecampId,
        RegistrationId = p.RegistrationId,
        Diagnosis = p.Diagnosis,
        HospitalFileNumber = p.HospitalFileNumber,
        TreatingContact = p.TreatingContact,
        VlOver1000 = p.VlOver1000,
        ViralLoad = p.ViralLoad,
        VlTestDate = p.VlTestDate,
        VlDateReceived = p.VlDateReceived,
        ClinicalFindings = p.ClinicalFindings,
        TbStatus = p.TbStatus,
        HepatitisB = p.HepatitisB,
        TbOisHistory = p.TbOisHistory,
        TbOisHistoryDetail = p.TbOisHistoryDetail,
        MedicationList = p.MedicationList,
        AdherenceBarriers = p.AdherenceBarriers,
        AdherenceBarriersDetail = p.AdherenceBarriersDetail,
        DietaryRequirements = p.DietaryRequirements,
        Religion = p.Religion,
        AdditionalInfo = p.AdditionalInfo,
        CamperHistoryNotes = p.CamperHistoryNotes,
        CapturedBy = p.CapturedBy,
        CapturedByName = p.CapturedByCrewMember is null ? null : $"{p.CapturedByCrewMember.Name} {p.CapturedByCrewMember.Surname}",
        CapturedAt = p.CapturedAt,
    };
}
