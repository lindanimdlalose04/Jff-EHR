namespace JffEhr.Api.Auth;

/// <summary>
/// Claim types added by <see cref="ClinicalRoleClaimsTransformation"/> after JWT
/// validation succeeds. These are app-specific enrichments, not part of the
/// Supabase-issued JWT itself.
/// </summary>
public static class AppClaimTypes
{
    /// <summary>Value is the <c>users.role_permissions</c> string: "medical" or "admin".</summary>
    public const string RolePermissions = "role_permissions";

    /// <summary>Value is the current user's <c>crew_members.crew_id</c> (as a GUID string).</summary>
    public const string CrewId = "crew_id";
}
