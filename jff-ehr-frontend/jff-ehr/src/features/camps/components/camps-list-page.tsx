import { useState } from "react";
import { ChevronRight, Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDate, statusLabel, statusTone } from "@/lib/display";
import { useCamps } from "../hooks/use-camps";

/** Route "/camps". Camps list with search; camps are Tier 1, fully maintainable. */
export function CampsListPage() {
  const { data: camps, isLoading, isError } = useCamps();
  const [search, setSearch] = useState("");

  if (isLoading) return <div className="p-6 text-sm text-muted">Loading camps…</div>;
  if (isError || !camps) {
    return (
      <div className="p-6 text-sm text-danger">
        Couldn&rsquo;t load camps. Check that the API is running, then refresh.
      </div>
    );
  }

  const needle = search.trim().toLowerCase();
  const visible = camps
    .filter(
      (c) =>
        !needle ||
        `camp ${c.campNumber}`.includes(needle) ||
        c.venue.toLowerCase().includes(needle) ||
        c.province.toLowerCase().includes(needle),
    )
    .sort((a, b) => b.campNumber - a.campNumber);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-[17px] font-semibold text-primary">Camps</h1>
        <StatusPill tone="neutral">{visible.length}</StatusPill>
        <div className="relative ml-auto w-full max-w-[260px]">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            className="pl-8"
            placeholder="Search venue, number, province…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Link to="/camps/new">
          <Button variant="primary" className="h-9 px-3">
            <Plus size={14} /> New camp
          </Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-card border border-card bg-surface">
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-divider bg-header-tint px-4 py-2 text-[11.5px] font-medium uppercase tracking-wide text-muted sm:grid-cols-[1.4fr_1fr_0.8fr_auto_auto]">
          <span>Camp</span>
          <span className="hidden sm:block">Dates</span>
          <span className="hidden sm:block">Province</span>
          <span className="hidden sm:block">Type</span>
          <span className="text-right">Status</span>
        </div>
        {visible.map((camp) => (
          <Link
            key={camp.campId}
            to={`/camps/${camp.campId}`}
            className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-divider px-4 py-3 transition last:border-b-0 hover:bg-field sm:grid-cols-[1.4fr_1fr_0.8fr_auto_auto]"
          >
            <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-primary">
              Camp {camp.campNumber} — {camp.venue}
              <ChevronRight size={14} className="text-muted" />
            </span>
            <span className="hidden text-[12.5px] text-secondary sm:block">
              {formatDate(camp.startDate)} – {formatDate(camp.endDate)}
            </span>
            <span className="hidden text-[12.5px] text-secondary sm:block">{camp.province}</span>
            <span className="hidden text-[12.5px] text-secondary sm:block">{camp.campType}</span>
            <span className="text-right">
              <StatusPill tone={statusTone(camp.status)}>{statusLabel(camp.status)}</StatusPill>
            </span>
          </Link>
        ))}
        {visible.length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] text-muted">
            No camps match &ldquo;{search}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
