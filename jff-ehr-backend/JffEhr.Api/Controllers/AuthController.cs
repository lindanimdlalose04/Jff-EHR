using JffEhr.Api.Auth;
using JffEhr.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JffEhr.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class AuthController(JffEhrDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    /// <summary>Identity of the current caller, resolved from their Supabase JWT.</summary>
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserDto>> Me()
    {
        if (currentUser.UserId is not { } userId)
        {
            return Problem("No authenticated user id.", statusCode: StatusCodes.Status401Unauthorized);
        }

        var user = await db.Users
            .Include(u => u.CrewMember)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user is null) { return NotFound(); }

        return Ok(new CurrentUserDto
        {
            UserId = user.UserId,
            CrewId = user.CrewId,
            Role = user.RolePermissions,
            Name = user.CrewMember?.Name,
            Surname = user.CrewMember?.Surname,
            Email = user.Email,
        });
    }
}

public sealed class CurrentUserDto
{
    public Guid UserId { get; set; }
    public Guid CrewId { get; set; }
    public string? Role { get; set; }
    public string? Name { get; set; }
    public string? Surname { get; set; }
    public string? Email { get; set; }
}
