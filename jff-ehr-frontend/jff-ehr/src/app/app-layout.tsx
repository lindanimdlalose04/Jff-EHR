import { useState } from "react";
import {
  HeartPulse,
  House,
  LogOut,
  Menu,
  Pill,
  ShieldCheck,
  Stethoscope,
  Tent,
  TriangleAlert,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { AppHeader } from "@/components/layout/app-header";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { useMe } from "@/features/auth/use-me";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Home", icon: House },
  { to: "/camps", label: "Camps", icon: Tent },
  { to: "/campers", label: "Campers", icon: Users },
  { to: "/crew", label: "Crew", icon: UserCog },
  { to: "/medications", label: "Medications", icon: Pill },
  { to: "/medshack", label: "MedShack", icon: Stethoscope },
  { to: "/incidents", label: "Incidents", icon: TriangleAlert },
  { to: "/admin/users", label: "Admin", icon: ShieldCheck, adminOnly: true },
];

function SidebarNav({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  return (
    <nav className="space-y-0.5">
      {navItems
        .filter((item) => !item.adminOnly || isAdmin)
        .map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-control px-3 py-2 text-[13px] font-medium transition",
                isActive
                  ? "bg-accent-tint text-accent"
                  : "text-secondary hover:bg-field hover:text-primary",
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
    </nav>
  );
}

/** Shared chrome for every authenticated screen: top header + left sidebar. */
export function AppLayout() {
  const { session, signOut } = useAuth();
  const me = useMe();
  const isAdmin = me.data?.role === "admin";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const email = session?.user.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-page">
      <AppHeader
        icon={<HeartPulse size={18} />}
        title="JFF EHR"
        subtitle="Camp health records"
        userInitials={initials}
        actions={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Open navigation"
              className="flex h-8 w-8 items-center justify-center rounded-control text-secondary hover:bg-field min-[900px]:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu size={18} />
            </button>
            <Button variant="secondary" className="h-8 px-3" onClick={() => void signOut()}>
              <LogOut size={14} />
              Sign out
            </Button>
          </div>
        }
      />

      <div className="flex">
        <aside className="sticky top-0 hidden h-[calc(100vh-61px)] w-[210px] shrink-0 overflow-y-auto border-r border-card bg-surface p-3 min-[900px]:block">
          <SidebarNav isAdmin={isAdmin} />
        </aside>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 min-[900px]:hidden">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden
            />
            <div className="absolute left-0 top-0 h-full w-[240px] border-r border-card bg-surface p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-[13px] font-semibold text-primary">Menu</span>
                <button
                  type="button"
                  aria-label="Close navigation"
                  className="flex h-7 w-7 items-center justify-center rounded-control text-secondary hover:bg-field"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <SidebarNav isAdmin={isAdmin} onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[980px] px-4 pb-12 pt-5">
            <OfflineBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
