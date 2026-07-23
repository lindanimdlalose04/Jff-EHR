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
public sealed class CrewMembersController(JffEhrDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CrewMemberDto>>> GetAll()
    {
        var crew = await db.CrewMembers.ToListAsync();
        return Ok(crew.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CrewMemberDto>> GetById(Guid id)
    {
        var crew = await db.CrewMembers.FindAsync(id);
        return crew is null ? NotFound() : Ok(ToDto(crew));
    }

    [HttpPost]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<ActionResult<CrewMemberDto>> Create(CreateCrewMemberRequest request)
    {
        var crew = new CrewMember
        {
            CrewId = Guid.NewGuid(),
            Name = request.Name,
            Surname = request.Surname,
            IdNumber = request.IdNumber,
            Dob = request.Dob,
            Role = request.Role,
            PhotoUrl = request.PhotoUrl,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.CrewMembers.Add(crew);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            return Conflict("A crew member with this ID number already exists.");
        }

        return CreatedAtAction(nameof(GetById), new { id = crew.CrewId }, ToDto(crew));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<IActionResult> Update(Guid id, UpdateCrewMemberRequest request)
    {
        var crew = await db.CrewMembers.FindAsync(id);
        if (crew is null) { return NotFound(); }

        crew.Name = request.Name;
        crew.Surname = request.Surname;
        crew.IdNumber = request.IdNumber;
        crew.Dob = request.Dob;
        crew.Role = request.Role;
        crew.PhotoUrl = request.PhotoUrl;

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            return Conflict("A crew member with this ID number already exists.");
        }

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var crew = await db.CrewMembers.FindAsync(id);
        if (crew is null) { return NotFound(); }

        db.CrewMembers.Remove(crew);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("This crew member cannot be deleted because they are referenced by other records (e.g. as a performer on a clinical or operational record).");
        }

        return NoContent();
    }

    private static CrewMemberDto ToDto(CrewMember c) => new()
    {
        CrewId = c.CrewId,
        Name = c.Name,
        Surname = c.Surname,
        IdNumber = c.IdNumber,
        Dob = c.Dob,
        Role = c.Role,
        PhotoUrl = c.PhotoUrl,
        CreatedAt = c.CreatedAt,
    };
}
