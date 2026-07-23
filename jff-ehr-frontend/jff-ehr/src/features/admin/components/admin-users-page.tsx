import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { apiClient } from "@/api/client";
import type { CrewMemberDto, UserDto } from "@/api/types";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDate, initialsOf } from "@/lib/display";
import { useMe } from "@/features/auth/use-me";

/**
 * Route "/admin/users", admin-only at BOTH layers: this component refuses to
 * render the page for non-admins (and doesn't fetch), and the API itself
 * returns 403 for GET /users without the admin role — the UI gate is
 * convenience, the API gate is the enforcement.
 */
export function AdminUsersPage() {
  const me = useMe();
  const isAdmin = me.data?.role === "admin";

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await apiClient.get<UserDto[]>("/users")).data,
    enabled: isAdmin,
  });
  const crew = useQuery({
    queryKey: ["crew-members"],
    queryFn: async () => (await apiClient.get<CrewMemberDto[]>("/crewmembers")).data,
    enabled: isAdmin,
  });

  if (me.isLoading) return <div className="p-6 text-sm text-muted">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="rounded-card border border-card bg-surface px-6 py-12 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-admin-tint text-admin">
          <ShieldCheck size={20} />
        </span>
        <h1 className="mt-3 text-[14px] font-medium text-primary">Admin access required</h1>
        <p className="mx-auto mt-1 max-w-[380px] text-[12.5px] text-muted">
          Your account has the medical role. User management is limited to administrators.
        </p>
      </div>
    );
  }

  if (users.isLoading || crew.isLoading) {
    return <div className="p-6 text-sm text-muted">Loading users…</div>;
  }
  if (users.isError || !users.data || !crew.data) {
    return (
      <div className="p-6 text-sm text-danger">
        Couldn&rsquo;t load users. Refresh to try again.
      </div>
    );
  }

  const crewById = new Map(crew.data.map((c) => [c.crewId, c]));
  const rows = [...users.data].sort((a, b) => a.email.localeCompare(b.email));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-[17px] font-semibold text-primary">Users</h1>
        <StatusPill tone="neutral">{rows.length}</StatusPill>
      </div>

      <div className="overflow-hidden rounded-card border border-card bg-surface">
        <div className="hidden grid-cols-[1.3fr_1.5fr_auto_auto_auto] items-center gap-3 border-b border-divider bg-header-tint px-4 py-2 text-[11.5px] font-medium uppercase tracking-wide text-muted sm:grid">
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Status</span>
          <span className="text-right">Since</span>
        </div>
        {rows.map((user) => {
          const member = crewById.get(user.crewId);
          const fullName = member ? `${member.name} ${member.surname}` : "Unlinked crew member";
          return (
            <div
              key={user.userId}
              className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-divider px-4 py-3 last:border-b-0 sm:grid-cols-[1.3fr_1.5fr_auto_auto_auto]"
            >
              <span className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-accent-tint text-[11px] font-medium text-accent">
                  {member ? initialsOf(member.name, member.surname) : "?"}
                </span>
                <span>
                  <span className="block text-[13px] font-medium text-primary">{fullName}</span>
                  <span className="block text-[11.5px] text-muted sm:hidden">{user.email}</span>
                </span>
              </span>
              <span className="hidden text-[12.5px] text-secondary sm:block">{user.email}</span>
              <span>
                <StatusPill tone={user.rolePermissions === "admin" ? "admin" : "success"}>
                  {user.rolePermissions}
                </StatusPill>
              </span>
              <span className="hidden sm:block">
                <StatusPill tone={user.isActive ? "success" : "neutral"}>
                  {user.isActive ? "active" : "inactive"}
                </StatusPill>
              </span>
              <span className="hidden text-right text-[12px] text-muted sm:block">
                {formatDate(user.createdAt)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
