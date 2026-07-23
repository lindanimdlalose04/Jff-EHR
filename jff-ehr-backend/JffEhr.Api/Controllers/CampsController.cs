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
public sealed class CampsController(JffEhrDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CampDto>>> GetAll()
    {
        var camps = await db.Camps.ToListAsync();
        return Ok(camps.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CampDto>> GetById(Guid id)
    {
        var camp = await db.Camps.FindAsync(id);
        return camp is null ? NotFound() : Ok(ToDto(camp));
    }

    [HttpPost]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<ActionResult<CampDto>> Create(CreateCampRequest request)
    {
        var camp = new Camp
        {
            CampId = Guid.NewGuid(),
            CampNumber = request.CampNumber,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Venue = request.Venue,
            Province = request.Province,
            CampType = request.CampType,
            Status = request.Status,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.Camps.Add(camp);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            return Conflict("A camp with this camp number already exists.");
        }

        return CreatedAtAction(nameof(GetById), new { id = camp.CampId }, ToDto(camp));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<IActionResult> Update(Guid id, UpdateCampRequest request)
    {
        var camp = await db.Camps.FindAsync(id);
        if (camp is null) { return NotFound(); }

        camp.StartDate = request.StartDate;
        camp.EndDate = request.EndDate;
        camp.Venue = request.Venue;
        camp.Province = request.Province;
        camp.CampType = request.CampType;
        camp.Status = request.Status;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var camp = await db.Camps.FindAsync(id);
        if (camp is null) { return NotFound(); }

        db.Camps.Remove(camp);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static CampDto ToDto(Camp c) => new()
    {
        CampId = c.CampId,
        CampNumber = c.CampNumber,
        StartDate = c.StartDate,
        EndDate = c.EndDate,
        Venue = c.Venue,
        Province = c.Province,
        CampType = c.CampType,
        Status = c.Status,
        CreatedAt = c.CreatedAt,
    };
}
