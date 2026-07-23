using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace JffEhr.Api.Controllers;

/// <summary>
/// Classifies a DbUpdateException by the underlying Postgres SQLSTATE, so
/// controllers can turn constraint violations into the right HTTP status
/// (409 Conflict) instead of an unhandled 500.
/// </summary>
internal static class DbExceptionExtensions
{
    public static bool IsUniqueViolation(this DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };

    public static bool IsForeignKeyViolation(this DbUpdateException ex) =>
        ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation };
}
