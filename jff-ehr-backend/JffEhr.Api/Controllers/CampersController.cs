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
public sealed class CampersController(JffEhrDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CamperDto>>> GetAll()
    {
        var campers = await db.Campers.ToListAsync();
        return Ok(campers.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CamperDto>> GetById(Guid id)
    {
        var camper = await db.Campers.FindAsync(id);
        return camper is null ? NotFound() : Ok(ToDto(camper));
    }

    [HttpPost]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<ActionResult<CamperDto>> Create(CreateCamperRequest request)
    {
        var camper = new Camper
        {
            CamperId = Guid.NewGuid(),
            FirstName = request.FirstName,
            Surname = request.Surname,
            Dob = request.Dob,
            Sex = request.Sex,
            Race = request.Race,
            Address = request.Address,
            CellNumber = request.CellNumber,
            Language = request.Language,
            TShirtSize = request.TShirtSize,
            PhotoUrl = request.PhotoUrl,
            Diagnosis = request.Diagnosis,
            TreatingClinic = request.TreatingClinic,
            FileNumber = request.FileNumber,
            FamilyGroupId = request.FamilyGroupId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        db.Campers.Add(camper);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            return Conflict("A camper with this file number already exists.");
        }

        return CreatedAtAction(nameof(GetById), new { id = camper.CamperId }, ToDto(camper));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<IActionResult> Update(Guid id, UpdateCamperRequest request)
    {
        var camper = await db.Campers.FindAsync(id);
        if (camper is null) { return NotFound(); }

        camper.FirstName = request.FirstName;
        camper.Surname = request.Surname;
        camper.Dob = request.Dob;
        camper.Sex = request.Sex;
        camper.Race = request.Race;
        camper.Address = request.Address;
        camper.CellNumber = request.CellNumber;
        camper.Language = request.Language;
        camper.TShirtSize = request.TShirtSize;
        camper.PhotoUrl = request.PhotoUrl;
        camper.Diagnosis = request.Diagnosis;
        camper.TreatingClinic = request.TreatingClinic;
        camper.FileNumber = request.FileNumber;
        camper.FamilyGroupId = request.FamilyGroupId;
        camper.UpdatedAt = DateTimeOffset.UtcNow;

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            return Conflict("A camper with this file number already exists.");
        }

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var camper = await db.Campers.FindAsync(id);
        if (camper is null) { return NotFound(); }

        db.Campers.Remove(camper);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("This camper cannot be deleted because it is still referenced by other records.");
        }

        return NoContent();
    }

    private static CamperDto ToDto(Camper c) => new()
    {
        CamperId = c.CamperId,
        FirstName = c.FirstName,
        Surname = c.Surname,
        Dob = c.Dob,
        Sex = c.Sex,
        Race = c.Race,
        Address = c.Address,
        CellNumber = c.CellNumber,
        Language = c.Language,
        TShirtSize = c.TShirtSize,
        PhotoUrl = c.PhotoUrl,
        Diagnosis = c.Diagnosis,
        TreatingClinic = c.TreatingClinic,
        FileNumber = c.FileNumber,
        FamilyGroupId = c.FamilyGroupId,
        CreatedAt = c.CreatedAt,
        UpdatedAt = c.UpdatedAt,
    };
}
