using System.Data.Common;
using JffEhr.Api.Auth;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Npgsql;

namespace JffEhr.Api.Data;

/// <summary>
/// The layer-2/layer-3 seam. Every EF Core query runs over a raw Npgsql
/// connection; this interceptor runs the moment that physical connection
/// opens and stamps the current request's identity onto it as a Postgres
/// session variable, app.current_user_id -- which is exactly what layer 2's
/// app_current_user_id() (see Data/Sql/001_enable_rls.sql) reads to resolve
/// RLS. Without this, every RLS policy in the database would see no identity
/// at all and deny everything (or, if the connection role happens to own the
/// tables, RLS would be silently bypassed instead -- see the DB role note in
/// the layer-3 plan).
///
/// Session-level, not transaction-level: set_config's third argument is
/// `false` (not `is_local`), because EF Core does not always wrap work in an
/// explicit transaction, and a transaction-scoped SET LOCAL would revert
/// before the next statement in some code paths. Session-level state must
/// therefore not leak across pooled physical connections reused by later,
/// different requests -- see Program.cs (NoResetOnClose is forced to false so
/// Npgsql always resets session state when a connection returns to the pool)
/// and ConnectionClosing below (belt-and-braces: clear it ourselves too).
/// </summary>
public sealed class UserIdentityConnectionInterceptor(ICurrentUserService currentUser) : DbConnectionInterceptor
{
    public override void ConnectionOpened(DbConnection connection, ConnectionEndEventData eventData)
    {
        SetSessionIdentity((NpgsqlConnection)connection);
        base.ConnectionOpened(connection, eventData);
    }

    public override async Task ConnectionOpenedAsync(
        DbConnection connection,
        ConnectionEndEventData eventData,
        CancellationToken cancellationToken = default)
    {
        await SetSessionIdentityAsync((NpgsqlConnection)connection, cancellationToken);
        await base.ConnectionOpenedAsync(connection, eventData, cancellationToken);
    }

    public override InterceptionResult ConnectionClosing(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result)
    {
        ClearSessionIdentity((NpgsqlConnection)connection);
        return base.ConnectionClosing(connection, eventData, result);
    }

    public override async ValueTask<InterceptionResult> ConnectionClosingAsync(
        DbConnection connection,
        ConnectionEventData eventData,
        InterceptionResult result)
    {
        await ClearSessionIdentityAsync((NpgsqlConnection)connection);
        return await base.ConnectionClosingAsync(connection, eventData, result);
    }

    private void SetSessionIdentity(NpgsqlConnection connection)
    {
        using var cmd = BuildSetConfigCommand(connection, currentUser.UserId?.ToString() ?? string.Empty);
        cmd.ExecuteNonQuery();
    }

    private async Task SetSessionIdentityAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        await using var cmd = BuildSetConfigCommand(connection, currentUser.UserId?.ToString() ?? string.Empty);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private void ClearSessionIdentity(NpgsqlConnection connection)
    {
        if (connection.State != System.Data.ConnectionState.Open)
        {
            return;
        }

        using var cmd = BuildSetConfigCommand(connection, string.Empty);
        cmd.ExecuteNonQuery();
    }

    private async Task ClearSessionIdentityAsync(NpgsqlConnection connection)
    {
        if (connection.State != System.Data.ConnectionState.Open)
        {
            return;
        }

        await using var cmd = BuildSetConfigCommand(connection, string.Empty);
        await cmd.ExecuteNonQueryAsync();
    }

    private static NpgsqlCommand BuildSetConfigCommand(NpgsqlConnection connection, string userId)
    {
        var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT set_config('app.current_user_id', $1, false);";
        cmd.Parameters.Add(new NpgsqlParameter { Value = userId });
        return cmd;
    }
}
