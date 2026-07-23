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
public sealed class EmergencyContactsController(JffEhrDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<EmergencyContactDto>>> GetAll([FromQuery] Guid? camperId)
    {
        var query = db.EmergencyContacts.AsQueryable();
        if (camperId is not null) { query = query.Where(c => c.CamperId == camperId); }

        var contacts = await query.ToListAsync();
        return Ok(contacts.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<EmergencyContactDto>> GetById(Guid id)
    {
        var contact = await db.EmergencyContacts.FindAsync(id);
        return contact is null ? NotFound() : Ok(ToDto(contact));
    }

    [HttpPost]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<ActionResult<EmergencyContactDto>> Create(CreateEmergencyContactRequest request)
    {
        var contact = new EmergencyContact
        {
            ContactId = Guid.NewGuid(),
            CamperId = request.CamperId,
            Name = request.Name,
            CellNo = request.CellNo,
            WorkNo = request.WorkNo,
            Relationship = request.Relationship,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.EmergencyContacts.Add(contact);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("The specified camper does not exist.");
        }

        return CreatedAtAction(nameof(GetById), new { id = contact.ContactId }, ToDto(contact));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<IActionResult> Update(Guid id, UpdateEmergencyContactRequest request)
    {
        var contact = await db.EmergencyContacts.FindAsync(id);
        if (contact is null) { return NotFound(); }

        contact.Name = request.Name;
        contact.CellNo = request.CellNo;
        contact.WorkNo = request.WorkNo;
        contact.Relationship = request.Relationship;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "MedicalOrAdmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var contact = await db.EmergencyContacts.FindAsync(id);
        if (contact is null) { return NotFound(); }

        db.EmergencyContacts.Remove(contact);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static EmergencyContactDto ToDto(EmergencyContact c) => new()
    {
        ContactId = c.ContactId,
        CamperId = c.CamperId,
        Name = c.Name,
        CellNo = c.CellNo,
        WorkNo = c.WorkNo,
        Relationship = c.Relationship,
        CreatedAt = c.CreatedAt,
    };
}
