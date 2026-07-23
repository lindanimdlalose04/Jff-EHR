import { ArrowRight, Tent, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { StatusPill } from "@/components/ui/status-pill";
import { useAuth } from "@/features/auth/auth-context";
import { useCampers, useCamps } from "@/features/camps/hooks/use-camps";
import { formatDate } from "@/lib/display";

/** Route "/". Landing view: headline stats and the way into the camps path. */
export function HomePage() {
  const { session } = useAuth();
  const camps = useCamps();
  const campers = useCampers();

  const activeCamp = camps.data?.find((c) => c.status.toLowerCase() === "active");

  return (
    <div>
      <h1 className="text-[17px] font-semibold text-primary">
        Welcome back{session?.user.email ? `, ${session.user.email}` : ""}
      </h1>
      <p className="mt-0.5 text-[12.5px] text-muted">
        Read-only demo build: camps, registrations and camper records are live from the database.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-card bg-surface p-4">
          <div className="flex items-center gap-2 text-[12.5px] text-secondary">
            <Tent size={15} className="text-accent" /> Camps
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-primary">
            {camps.data?.length ?? "–"}
          </div>
        </div>
        <div className="rounded-card border border-card bg-surface p-4">
          <div className="flex items-center gap-2 text-[12.5px] text-secondary">
            <Users size={15} className="text-accent" /> Campers on file
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-primary">
            {campers.data?.length ?? "–"}
          </div>
        </div>
        <div className="rounded-card border border-card bg-surface p-4">
          <div className="text-[12.5px] text-secondary">Camp in progress</div>
          {activeCamp ? (
            <div className="mt-1.5">
              <div className="text-[14px] font-medium text-primary">
                Camp {activeCamp.campNumber} — {activeCamp.venue}
              </div>
              <div className="mt-0.5 text-[12px] text-muted">
                {formatDate(activeCamp.startDate)} – {formatDate(activeCamp.endDate)}
              </div>
            </div>
          ) : (
            <div className="mt-1.5 text-[13px] text-muted">None right now</div>
          )}
        </div>
      </div>

      {activeCamp && (
        <Link
          to={`/camps/${activeCamp.campId}`}
          className="mt-4 flex items-center justify-between rounded-card border border-accent-border bg-accent-tint px-4 py-3.5 transition hover:brightness-[0.98]"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-medium text-primary">
                Camp {activeCamp.campNumber} — {activeCamp.venue}
              </span>
              <StatusPill tone="success">active</StatusPill>
            </div>
            <div className="mt-0.5 text-[12.5px] text-secondary">
              Open the live camp roster
            </div>
          </div>
          <ArrowRight size={17} className="text-accent" />
        </Link>
      )}

      <Link
        to="/camps"
        className="mt-3 flex items-center justify-between rounded-card border border-card bg-surface px-4 py-3.5 transition hover:bg-field"
      >
        <div>
          <div className="text-[14px] font-medium text-primary">All camps</div>
          <div className="mt-0.5 text-[12.5px] text-secondary">
            Browse every camp, its registrations and camper records
          </div>
        </div>
        <ArrowRight size={17} className="text-muted" />
      </Link>
    </div>
  );
}
