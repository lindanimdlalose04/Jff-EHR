using System.ComponentModel.DataAnnotations;

namespace JffEhr.Api.Dtos;

public sealed class UserDto
{
    public Guid UserId { get; set; }
    public Guid CrewId { get; set; }
    public required string Email { get; set; }
    public required string RolePermissions { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    // PasswordHash is deliberately never included: it's a server-managed
    // placeholder, not a real credential (Supabase Auth handles authentication).
}

public sealed class CreateUserRequest
{
    /// <summary>
    /// Must equal the id of the corresponding Supabase Auth user (auth.uid()),
    /// created separately via Supabase Auth / the Supabase dashboard. Not
    /// server-generated: the identity seam (JWT sub -> app.current_user_id ->
    /// RLS) only resolves if this matches that Supabase Auth user's id exactly.
    /// </summary>
    [Required]
    public Guid UserId { get; set; }

    [Required]
    public Guid CrewId { get; set; }

    [Required, EmailAddress, MaxLength(160)]
    public required string Email { get; set; }

    /// <summary>Must be exactly "medical" or "admin" -- RBAC depends on an exact match.</summary>
    [Required]
    public required string RolePermissions { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class UpdateUserRequest
{
    [Required, EmailAddress, MaxLength(160)]
    public required string Email { get; set; }

    /// <summary>Must be exactly "medical" or "admin" -- RBAC depends on an exact match.</summary>
    [Required]
    public required string RolePermissions { get; set; }
    public bool IsActive { get; set; }
}
