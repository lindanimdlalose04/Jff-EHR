using Microsoft.AspNetCore.Authorization;

namespace JffEhr.Api.Auth;

/// <summary>
/// Requires the current principal's role_permissions claim to equal one of the
/// given role literals. Three policies are registered from this: "Medical",
/// "Admin", and "MedicalOrAdmin" (see Program.cs) -- "medical" and "admin" are
/// the only two roles the access model defines; do not add a third without
/// updating the layer-2 RLS audit_logs policy too.
/// </summary>
public sealed class RoleRequirement(params string[] roles) : IAuthorizationRequirement
{
    public IReadOnlyCollection<string> Roles { get; } = roles;
}
