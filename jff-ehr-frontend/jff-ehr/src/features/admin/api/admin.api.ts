import { apiClient } from "@/api/client";
import type { CrewMemberDto, UserDto } from "@/api/types";

/**
 * Admin user management. Every call here is admin-gated at the API (the whole
 * UsersController is [Authorize(Policy = "Admin")]); the UI gate is
 * convenience, the API gate is the enforcement.
 *
 * Role and active status are the live, editable half of the RBAC story: an
 * admin decides who may edit (medical) versus administer (admin), and can
 * revoke access (deactivate). Provisioning a brand-new login is a separate
 * concern that needs the Supabase service key server-side, so it is not done
 * from the browser (see the note on the admin page).
 */

async function get<T>(url: string): Promise<T> {
  return (await apiClient.get<T>(url)).data;
}

export interface AdminUserRow {
  user: UserDto;
  crew: CrewMemberDto | null;
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const [users, crew] = await Promise.all([
    get<UserDto[]>("/users"),
    get<CrewMemberDto[]>("/crewmembers"),
  ]);
  const crewById = new Map(crew.map((c) => [c.crewId, c]));
  return users
    .map((user) => ({ user, crew: crewById.get(user.crewId) ?? null }))
    .sort((a, b) => a.user.email.localeCompare(b.user.email));
}

/** Sends the full user shape the PUT expects, changing one field at a time. */
export async function updateUser(
  user: UserDto,
  patch: Partial<Pick<UserDto, "rolePermissions" | "isActive" | "email">>,
): Promise<void> {
  await apiClient.put(`/users/${user.userId}`, {
    email: patch.email ?? user.email,
    rolePermissions: patch.rolePermissions ?? user.rolePermissions,
    isActive: patch.isActive ?? user.isActive,
  });
}
