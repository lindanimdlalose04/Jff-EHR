using Microsoft.AspNetCore.Authorization;

namespace JffEhr.Api.Auth;

/// <summary>
/// Succeeds a <see cref="RoleRequirement"/> when the principal carries a
/// role_permissions claim matching any of the requirement's roles, exactly
/// (ordinal, case-sensitive) -- the C# role name and the users.role_permissions
/// / RLS-policy literal must be the identical string.
/// </summary>
public sealed class RoleAuthorizationHandler : AuthorizationHandler<RoleRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        RoleRequirement requirement)
    {
        var role = context.User.FindFirst(AppClaimTypes.RolePermissions)?.Value;
        if (role is not null && requirement.Roles.Contains(role, StringComparer.Ordinal))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
