import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, ShieldCheck } from "lucide-react";
import type { UserDto } from "@/api/types";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { RecordBanner } from "@/components/ui/record-chrome";
import { formatDate, initialsOf } from "@/lib/display";
import { useMe } from "@/features/auth/use-me";
import { fetchAdminUsers, updateUser, type AdminUserRow } from "../api/admin.api";

/**
 * Route "/admin/users", admin-only at BOTH layers: this component refuses to
 * render for non-admins and does not fetch, and the API returns 403 for
 * /users without the admin role. The UI gate is convenience, the API gate is
 * the enforcement.
 *
 * Role and active status are editable here (the live RBAC story). An admin
 * cannot change their own role or deactivate themselves, which prevents
 * locking the last administrator out.
 */
export function AdminUsersPage() {
  const me = useMe();
  const isAdmin = me.data?.role === "admin";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAdminUsers,
    enabled: isAdmin,
  });

  if (me.isLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="border border-card bg-surface px-6 py-12 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center bg-admin-tint text-admin">
          <ShieldCheck size={20} />
        </span>
        <h1 className="mt-3 text-base font-medium text-primary">Admin access required</h1>
        <p className="mx-auto mt-1 max-w-[380px] text-sm text-muted">
          Your account has the medical role. User management is limited to administrators.
        </p>
      </div>
    );
  }

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading users…</div>;
  if (isError || !data) {
    return (
      <div className="p-6 text-sm text-danger">Couldn&rsquo;t load users. Refresh to try again.</div>
    );
  }

  return (
    <div>
      <div className="border border-card bg-surface">
        <RecordBanner
          title="Users and access"
          flags={[{ label: `${data.length} accounts`, tone: "neutral" }]}
          meta={
            <>
              Who may edit the clinical record and who may administer. Deactivating revokes
              access without removing the person from the records they signed.
            </>
          }
        />
        <div className="hidden grid-cols-[1.3fr_1.6fr_auto_auto] items-center gap-3 border-b border-card bg-header-tint px-4 py-2 text-xs font-bold uppercase tracking-[0.06em] text-secondary sm:grid">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span className="text-right">Access</span>
        </div>
        {data.map((row) => (
          <UserRow key={row.user.userId} row={row} currentUserId={me.data?.userId ?? ""} />
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2.5 border border-card bg-surface p-4 text-sm text-secondary">
        <Info size={16} className="mt-0.5 shrink-0 text-muted" />
        <div>
          <p className="font-medium text-primary">Adding a new staff login</p>
          <p className="mt-1 text-muted">
            A login is a Supabase Auth account whose id must match the users row, so creating
            one needs the Supabase service key and is done server-side, never from the browser.
            New staff are provisioned by the seed or the Supabase dashboard, then their role and
            access are managed here. This is the deliberate boundary of the two-backend design.
          </p>
        </div>
      </div>
    </div>
  );
}

function UserRow({ row, currentUserId }: { row: AdminUserRow; currentUserId: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { user, crew } = row;
  const isSelf = user.userId === currentUserId;
  const fullName = crew ? `${crew.name} ${crew.surname}` : "Unlinked crew member";

  const mutate = useMutation({
    mutationFn: (patch: Partial<Pick<UserDto, "rolePermissions" | "isActive">>) =>
      updateUser(user, patch),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error & { response?: { status?: number } }) =>
      setError(
        e.response?.status === 400
          ? "Role must be medical or admin."
          : e.response?.status === 403
            ? "Only administrators may manage users."
            : e.message,
      ),
  });

  const otherRole = user.rolePermissions === "admin" ? "medical" : "admin";

  return (
    <div className="border-b border-divider px-4 py-3 last:border-b-0">
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[1.3fr_1.6fr_auto_auto]">
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-accent-tint text-xs font-medium text-accent">
            {crew ? initialsOf(crew.name, crew.surname) : "?"}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-medium text-primary">
              {fullName}
              {isSelf && <span className="ml-1 text-xs text-muted">(you)</span>}
            </span>
            <span className="block truncate text-xs text-muted sm:hidden">{user.email}</span>
            <span className="block text-xs text-muted">since {formatDate(user.createdAt)}</span>
          </span>
        </span>

        <span className="hidden truncate text-sm text-secondary sm:block">{user.email}</span>

        <span className="flex items-center gap-2">
          <StatusPill tone={user.rolePermissions === "admin" ? "admin" : "success"}>
            {user.rolePermissions}
          </StatusPill>
          {!isSelf && (
            <Button
              variant="secondary"
              className="h-7 px-2 text-xs"
              disabled={mutate.isPending}
              onClick={() => mutate.mutate({ rolePermissions: otherRole })}
            >
              Make {otherRole}
            </Button>
          )}
        </span>

        <span className="flex items-center justify-end gap-2">
          <StatusPill tone={user.isActive ? "success" : "neutral"}>
            {user.isActive ? "active" : "inactive"}
          </StatusPill>
          {!isSelf && (
            <Button
              variant="secondary"
              className="h-7 px-2 text-xs"
              disabled={mutate.isPending}
              onClick={() => mutate.mutate({ isActive: !user.isActive })}
            >
              {user.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          )}
        </span>
      </div>
      {error && (
        <div className="mt-2 rounded-control border border-danger bg-danger-tint px-3 py-1.5 text-xs text-danger">
          {error}
        </div>
      )}
    </div>
  );
}
