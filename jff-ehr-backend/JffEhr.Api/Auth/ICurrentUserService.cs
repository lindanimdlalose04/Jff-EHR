namespace JffEhr.Api.Auth;

/// <summary>
/// The current request's identity, resolved from the validated JWT plus the
/// claim enrichment done by <see cref="ClinicalRoleClaimsTransformation"/>.
/// This is the single place that knows how to read identity off
/// <c>HttpContext.User</c> -- both <see cref="Data.UserIdentityConnectionInterceptor"/>
/// (writes it into the Postgres session) and layer-4 controllers (writes it as
/// nurse_id/assessed_by/etc.) should depend on this, not parse claims directly.
/// </summary>
public interface ICurrentUserService
{
    bool IsAuthenticated { get; }

    /// <summary>The JWT `sub` claim -- Supabase's auth.uid(), which equals users.user_id.</summary>
    Guid? UserId { get; }

    /// <summary>The linked CrewMember's id (crew_members.crew_id), via users.crew_id.</summary>
    Guid? CrewId { get; }

    /// <summary>"medical" or "admin" -- identical string to users.role_permissions.</summary>
    string? Role { get; }
}
