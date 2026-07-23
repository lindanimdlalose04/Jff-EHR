using System.Text.Json;
using JffEhr.Api.Auth;
using JffEhr.Api.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace JffEhr.Api.Data;

/// <summary>
/// Writes one AuditLog row per INSERT/UPDATE/DELETE across every other entity,
/// so controllers never need to log audit entries themselves. Runs inside
/// SavingChanges(Async), before the underlying SaveChanges call, so the new
/// AuditLog rows are persisted in the same batch/transaction as the change
/// that triggered them. AuditLog itself is never audited (would recurse).
/// </summary>
public sealed class AuditSaveChangesInterceptor(ICurrentUserService currentUser) : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        AppendAuditRows(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        AppendAuditRows(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void AppendAuditRows(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        var userId = currentUser.UserId;
        if (userId is null)
        {
            // No authenticated user in scope (e.g. a design-time/tooling operation).
            // Nothing meaningful to attribute the change to, so skip logging rather
            // than fail the whole save.
            return;
        }

        var changedEntries = context.ChangeTracker.Entries()
            .Where(e => e.Entity is not AuditLog
                && e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();

        foreach (var entry in changedEntries)
        {
            var tableName = context.Model.FindEntityType(entry.Entity.GetType())?.GetTableName()
                ?? entry.Entity.GetType().Name;

            var entityId = ResolvePrimaryKeyValue(entry);
            var action = entry.State switch
            {
                EntityState.Added => "INSERT",
                EntityState.Modified => "UPDATE",
                EntityState.Deleted => "DELETE",
                _ => throw new InvalidOperationException($"Unexpected entity state: {entry.State}"),
            };

            var beforeState = entry.State is EntityState.Modified or EntityState.Deleted
                ? SerializeProperties(entry, useOriginalValues: true)
                : null;
            var afterState = entry.State is EntityState.Added or EntityState.Modified
                ? SerializeProperties(entry, useOriginalValues: false)
                : null;

            context.Add(new AuditLog
            {
                AuditId = Guid.NewGuid(),
                UserId = userId.Value,
                EntityTable = tableName,
                EntityId = entityId,
                Action = action,
                BeforeState = beforeState,
                AfterState = afterState,
                CreatedAt = DateTimeOffset.UtcNow,
            });
        }
    }

    private static Guid ResolvePrimaryKeyValue(EntityEntry entry)
    {
        var pkProperty = entry.Metadata.FindPrimaryKey()!.Properties[0];
        var property = entry.Property(pkProperty.Name);
        var value = entry.State == EntityState.Deleted ? property.OriginalValue : property.CurrentValue;
        return value is Guid guid ? guid : Guid.Empty;
    }

    private static string SerializeProperties(EntityEntry entry, bool useOriginalValues)
    {
        var snapshot = entry.Properties.ToDictionary(
            p => p.Metadata.Name,
            p => useOriginalValues ? p.OriginalValue : p.CurrentValue);

        return JsonSerializer.Serialize(snapshot);
    }
}
