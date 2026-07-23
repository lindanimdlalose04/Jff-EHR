using JffEhr.Api.Data;
using JffEhr.Api.Dtos;
using JffEhr.Api.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JffEhr.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Admin")]
public sealed class UsersController(JffEhrDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetAll()
    {
        var users = await db.Users.ToListAsync();
        return Ok(users.Select(ToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserDto>> GetById(Guid id)
    {
        var user = await db.Users.FindAsync(id);
        return user is null ? NotFound() : Ok(ToDto(user));
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(CreateUserRequest request)
    {
        if (request.RolePermissions is not ("medical" or "admin"))
        {
            return BadRequest("RolePermissions must be exactly 'medical' or 'admin'.");
        }

        var user = new User
        {
            UserId = request.UserId,
            CrewId = request.CrewId,
            Email = request.Email,
            // Real authentication is handled entirely by Supabase Auth; this column
            // is never used to verify a credential, so it's set to a fixed placeholder.
            PasswordHash = "managed-by-supabase-auth",
            RolePermissions = request.RolePermissions,
            IsActive = request.IsActive,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.Users.Add(user);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            return Conflict("A user with this id, email, or crew member is already registered.");
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("The specified crew member does not exist.");
        }

        return CreatedAtAction(nameof(GetById), new { id = user.UserId }, ToDto(user));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateUserRequest request)
    {
        if (request.RolePermissions is not ("medical" or "admin"))
        {
            return BadRequest("RolePermissions must be exactly 'medical' or 'admin'.");
        }

        var user = await db.Users.FindAsync(id);
        if (user is null) { return NotFound(); }

        user.Email = request.Email;
        user.RolePermissions = request.RolePermissions;
        user.IsActive = request.IsActive;

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsUniqueViolation())
        {
            return Conflict("A user with this email already exists.");
        }

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) { return NotFound(); }

        db.Users.Remove(user);

        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.IsForeignKeyViolation())
        {
            return Conflict("This user cannot be deleted because it is still referenced by other records.");
        }

        return NoContent();
    }

    private static UserDto ToDto(User u) => new()
    {
        UserId = u.UserId,
        CrewId = u.CrewId,
        Email = u.Email,
        RolePermissions = u.RolePermissions,
        LastLoginAt = u.LastLoginAt,
        IsActive = u.IsActive,
        CreatedAt = u.CreatedAt,
    };
}
