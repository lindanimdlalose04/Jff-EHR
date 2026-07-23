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
public sealed class CaregiversController(JffEhrDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CaregiverDto>>> GetAll([FromQuery] Guid? camperId)
    {
        var query = db.Caregivers.AsQueryable();
        if (camperId is not null) { query = query.Where(c => c.CamperId == camperId); }

        var caregivers = await query.ToListAsync();
        return Ok(caregivers.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CaregiverDto>> GetById(Guid id)
    {
        var caregiver = await db.Caregivers.FindAsync(id);
        return caregiver is null ? NotFound() : Ok(ToDto(caregiver));
    }

    [HttpPost]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<ActionResult<CaregiverDto>> Create(CreateCaregiverRequest request)
    {
        var caregiver = new Caregiver
        {
            CaregiverId = Guid.NewGuid(),
            CamperId = request.CamperId,
            Name = request.Name,
            CellNo = request.CellNo,
            WorkNo = request.WorkNo,
            Relationship = request.Relationship,
            IsPrimary = request.IsPrimary,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.Caregivers.Add(caregiver);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("The specified camper does not exist.");
        }

        return CreatedAtAction(nameof(GetById), new { id = caregiver.CaregiverId }, ToDto(caregiver));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<IActionResult> Update(Guid id, UpdateCaregiverRequest request)
    {
        var caregiver = await db.Caregivers.FindAsync(id);
        if (caregiver is null) { return NotFound(); }

        caregiver.Name = request.Name;
        caregiver.CellNo = request.CellNo;
        caregiver.WorkNo = request.WorkNo;
        caregiver.Relationship = request.Relationship;
        caregiver.IsPrimary = request.IsPrimary;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var caregiver = await db.Caregivers.FindAsync(id);
        if (caregiver is null) { return NotFound(); }

        db.Caregivers.Remove(caregiver);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static CaregiverDto ToDto(Caregiver c) => new()
    {
        CaregiverId = c.CaregiverId,
        CamperId = c.CamperId,
        Name = c.Name,
        CellNo = c.CellNo,
        WorkNo = c.WorkNo,
        Relationship = c.Relationship,
        IsPrimary = c.IsPrimary,
        CreatedAt = c.CreatedAt,
    };
}
