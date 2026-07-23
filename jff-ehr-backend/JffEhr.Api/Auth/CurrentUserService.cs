using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace JffEhr.Api.Auth;

/// <inheritdoc cref="ICurrentUserService"/>
public sealed class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    private ClaimsPrincipal? Principal => httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;

    public Guid? UserId =>
        Guid.TryParse(Principal?.FindFirst("sub")?.Value, out var id) ? id : null;

    public Guid? CrewId =>
        Guid.TryParse(Principal?.FindFirst(AppClaimTypes.CrewId)?.Value, out var id) ? id : null;

    public string? Role => Principal?.FindFirst(AppClaimTypes.RolePermissions)?.Value;
}
