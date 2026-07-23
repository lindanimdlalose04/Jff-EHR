using System.Security.Claims;
using JffEhr.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;

namespace JffEhr.Api.Auth;

/// <summary>
/// Runs once per authenticated request, after JWT signature/issuer/audience/
/// lifetime validation succeeds. Resolves the JWT's `sub` claim (Supabase
/// auth.uid()) against this app's own Users table and, if a matching active
/// row exists, enriches the ClaimsPrincipal with role_permissions and crew_id.
///
/// Fails closed by design: if there's no matching Users row, or is_active is
/// false, no role/crew claims are added. Every RBAC policy (RoleRequirement)
/// requires one of these claims to have a specific value, so an unenriched
/// principal is denied by every policy without any extra checks here.
///
/// A valid Supabase JWT alone is therefore necessary but not sufficient: the
/// user must also exist, be active, and be linked to a CrewMember, in our own
/// data -- exactly mirroring the User<->CrewMember 1:1 FK design.
/// </summary>
public sealed class ClinicalRoleClaimsTransformation(JffEhrDbContext db) : IClaimsTransformation
{
    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity?.IsAuthenticated != true)
        {
            return principal;
        }

        // IClaimsTransformation can run more than once per request; make this idempotent.
        if (principal.HasClaim(c => c.Type == AppClaimTypes.RolePermissions))
        {
            return principal;
        }

        var subClaim = principal.FindFirst("sub")?.Value;
        if (subClaim is null || !Guid.TryParse(subClaim, out var userId))
        {
            return principal;
        }

        // This lookup runs DURING authentication, before HttpContext.User is
        // assigned, so UserIdentityConnectionInterceptor stamps an empty
        // identity onto the session and RLS would hide every users row from
        // this very query (fail-closed 403 for all policy-gated endpoints).
        // Stamp the just-validated sub explicitly on the same open session
        // before the lookup; ConnectionClosing clears it again as usual.
        var connection = db.Database.GetDbConnection();
        var wasOpen = connection.State == System.Data.ConnectionState.Open;
        if (!wasOpen)
        {
            await db.Database.OpenConnectionAsync();
        }

        try
        {
            await db.Database.ExecuteSqlAsync(
                $"select set_config('app.current_user_id', {userId.ToString()}, false)");

            var user = await db.Users
                .Where(u => u.UserId == userId && u.IsActive)
                .Select(u => new { u.RolePermissions, u.CrewId })
                .FirstOrDefaultAsync();

            if (user is null)
            {
                // No active Users row for this JWT subject: leave the principal as-is.
                // Authenticated (valid JWT), but every role policy will deny.
                return principal;
            }

            var identity = (ClaimsIdentity)principal.Identity;
            identity.AddClaim(new Claim(AppClaimTypes.RolePermissions, user.RolePermissions));
            identity.AddClaim(new Claim(AppClaimTypes.CrewId, user.CrewId.ToString()));

            return principal;
        }
        finally
        {
            if (!wasOpen)
            {
                await db.Database.CloseConnectionAsync();
            }
        }
    }
}
