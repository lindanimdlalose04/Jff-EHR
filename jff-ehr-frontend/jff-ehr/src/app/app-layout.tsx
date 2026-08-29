import { useState } from "react";
import { HeartPulse, LogOut, Menu, X } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { ActiveCampProvider } from "@/app/active-camp-context";
import { AppHeader } from "@/components/layout/app-header";
import { OfflineBanner } from "@/components/layout/offline-banner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-context";
import { useMe } from "@/features/auth/use-me";
import { cn } from "@/lib/utils";

/**
 * Text navigation, grouped by what the section is for. Deliberately no icons:
 * an icon per item is decoration here, not meaning. See
 * spec/design/design-system.md, rule 3.
 */
const navGroups = [
  {
    heading: "Records",
    items: [
      { to: "/", label: "Home" },
      { to: "/camps", label: "Camps" },
      { to: "/campers", label: "Campers" },
      { to: "/crew", label: "Crew" },
    ],
  },
  {
    heading: "Clinical",
    items: [
      { to: "/medications", label: "Medications" },
      { to: "/medshack", label: "MedShack" },
      { to: "/incidents", label: "Incidents" },
    ],
  },
  {
    heading: "Administration",
    adminOnly: true,
    items: [
      { to: "/admin/intake", label: "Registration intake" },
      { to: "/admin/users", label: "Users" },
    ],
  },
];

function SidebarNav({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  return (
    <nav>
      {navGroups
        .filter((group) => !group.adminOnly || isAdmin)
        .map((group) => (
          <div key={group.heading}>
            <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-[0.1em] text-muted">
              {group.heading}
            </p>
            {group.items.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "block border-l-[3px] px-3 py-2 text-base transition",
                    isActive
                      ? "border-accent bg-surface font-bold text-accent-strong"
                      : "border-transparent font-medium text-secondary hover:bg-page hover:text-primary",
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
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
    <ActiveCampProvider>
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
          <aside className="sticky top-0 hidden h-[calc(100vh-61px)] w-[210px] shrink-0 overflow-y-auto border-r border-card bg-page px-0 py-1 min-[900px]:block">
            <SidebarNav isAdmin={isAdmin} />
          </aside>

          {mobileNavOpen && (
            <div className="fixed inset-0 z-40 min-[900px]:hidden">
              <div
                className="absolute inset-0 bg-black/30"
                onClick={() => setMobileNavOpen(false)}
                aria-hidden
              />
              <div className="absolute left-0 top-0 h-full w-[240px] border-r border-card bg-page px-0 py-1">
                <div className="mb-1 flex items-center justify-between px-3 pt-2">
                  <span className="text-base font-semibold text-primary">Menu</span>
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
    </ActiveCampProvider>
  );
}
