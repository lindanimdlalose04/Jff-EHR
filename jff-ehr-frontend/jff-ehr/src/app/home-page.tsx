import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CampScopePicker } from "@/components/layout/camp-scope-picker";
import { StatusPill } from "@/components/ui/status-pill";
import type { PillTone } from "@/components/ui/status-pill";
import {
  RecordBanner,
  SectionHead,
  StatStrip,
  Stat,
  DataTable,
  thClass,
  tdClass,
  type BannerFlag,
} from "@/components/ui/record-chrome";
import { formatDate } from "@/lib/display";
import { useActiveCamp } from "@/app/active-camp-context";
import { useMe } from "@/features/auth/use-me";
import { fetchDashboard, type Dashboard, type Exception } from "./dashboard.api";

/**
 * Route "/". The Report home layout (spec/design/design-system.md): one
 * headline figure, one chart, one short list of exceptions, and then it stops.
 *
 * It answers "how is this camp doing" rather than listing everything in it.
 * Anything that needs a person to act is in the exceptions table, most serious
 * first, so nothing important sits below a wall of tiles.
 */
export function HomePage() {
  const me = useMe();
  const { selectedCampId } = useActiveCamp();
  const [now] = useState(() => new Date());
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", selectedCampId],
    queryFn: () => fetchDashboard(selectedCampId, now),
  });

  const firstName = me.data?.name ?? "";

  if (isLoading) return <div className="p-6 text-base text-muted">Loading your day…</div>;
  if (isError || !data) {
    return (
      <div className="p-6 text-base text-danger">
        Couldn&rsquo;t load the dashboard. Refresh to try again.
      </div>
    );
  }

  const { camp } = data;

  if (!camp) {
    return (
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-bold text-primary">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </h1>
          <CampScopePicker />
        </div>
        <div className="border border-card bg-surface px-4 py-10 text-center text-base text-muted">
          There is no active camp right now. Open Camps to plan or activate one.
        </div>
      </div>
    );
  }

  const adherence =
    data.scheduledToday > 0 ? Math.round((data.givenToday / data.scheduledToday) * 100) : null;
  const missedToday = data.round.filter((r) => r.slot.state === "missed").length;
  const flags: BannerFlag[] = [{ label: "Active", tone: "success" }];
  if (data.exceptions.some((e) => e.kind === "no consent")) {
    const n = data.exceptions.filter((e) => e.kind === "no consent").length;
    flags.push({ label: `${n} consent missing`, tone: "danger" });
  }

  return (
    <div className="border border-card bg-surface">
      <RecordBanner
        title={`Camp ${camp.campNumber}, ${camp.venue}`}
        flags={flags}
        actions={<CampScopePicker />}
        meta={
          <>
            {camp.province} &middot; <span className="mono">{formatDate(camp.startDate)}</span> to{" "}
            <span className="mono">{formatDate(camp.endDate)}</span>
            {data.dayNumber ? ` · day ${data.dayNumber} of ${data.totalDays}` : " · starts soon"}
          </>
        }
      />

      {/* The headline: one figure, with what it is made of underneath. */}
      <div className="flex flex-wrap border-b border-card">
        <div className="min-w-[280px] flex-none border-r border-divider px-4 py-5">
          <span className="block text-xs font-bold uppercase tracking-[0.08em] text-muted">
            Medication adherence {data.isToday ? "today" : "that day"}
          </span>
          <span className="mt-1.5 block text-hero font-bold tabular-nums text-primary">
            {adherence === null ? "-" : `${adherence}%`}
          </span>
          <span className="mt-1.5 block text-base text-secondary">
            {data.givenToday} of {data.scheduledToday} scheduled doses given
            {missedToday > 0 && (
              <>
                {" · "}
                <b className="text-danger-text">
                  {missedToday} missed
                </b>
              </>
            )}
          </span>
        </div>
        <div className="flex flex-1">
          <StatStrip>
            <Stat label="Campers on camp" value={data.rosterCount} />
            <Stat label="Arrival checks signed" value={`${data.assessedCount} of ${data.rosterCount}`} />
            <Stat
              label="MedShack visits"
              value={data.recentVisits.length}
              tone={data.recentVisits.length > 0 ? "warning" : "plain"}
            />
          </StatStrip>
        </div>
      </div>

      <SectionHead
        title="Doses by camp day"
        hint={
          data.byDay.length < data.totalDays
            ? `Days ${data.byDay.length + 1} to ${data.totalDays} not yet reached`
            : undefined
        }
      />
      <DosesByDayChart data={data} />

      <SectionHead title="Exceptions" hint="Only what needs action" />
      {data.exceptions.length === 0 ? (
        <div className="px-4 py-8 text-center text-base text-muted">
          Nothing outstanding. Every camper has consent on file and a signed arrival check.
        </div>
      ) : (
        <DataTable
          head={
            <>
              <th className={thClass}>Item</th>
              <th className={thClass}>Camper</th>
              <th className={thClass}>Detail</th>
              <th className={thClass} />
            </>
          }
        >
          {data.exceptions.slice(0, 8).map((e, i) => (
            <ExceptionRow key={`${e.registrationId}-${e.kind}-${i}`} exception={e} />
          ))}
        </DataTable>
      )}
      {data.exceptions.length > 8 && (
        <p className="border-t border-divider px-4 py-2.5 text-sm text-muted">
          Showing 8 of {data.exceptions.length}. Open the camp for the full roster.
        </p>
      )}
    </div>
  );
}

const exceptionTone: Record<Exception["kind"], PillTone> = {
  "no consent": "danger",
  missed: "danger",
  "draft check": "warning",
  "not checked in": "warning",
};

const exceptionAction: Record<Exception["kind"], { label: string; to: (e: Exception) => string }> = {
  "no consent": { label: "Capture consent", to: (e) => `/registrations/${e.registrationId}/consent` },
  missed: { label: "Account for", to: (e) => `/registrations/${e.registrationId}/medications` },
  "draft check": { label: "Open check", to: (e) => `/registrations/${e.registrationId}/arrival-check` },
  "not checked in": { label: "Start check", to: (e) => `/registrations/${e.registrationId}/arrival-check` },
};

function ExceptionRow({ exception }: { exception: Exception }) {
  const action = exceptionAction[exception.kind];
  return (
    <tr className="even:bg-page/60">
      <td className={tdClass}>
        <StatusPill tone={exceptionTone[exception.kind]}>{exception.kind}</StatusPill>
      </td>
      <td className={tdClass}>
        <Link
          to={`/campers/${exception.camperId}`}
          className="font-semibold text-accent-strong underline"
        >
          {exception.camperName}
        </Link>
      </td>
      <td className={`${tdClass} text-secondary`}>{exception.detail}</td>
      <td className={tdClass}>
        <Link to={action.to(exception)} className="text-sm font-semibold text-accent-strong hover:underline">
          {action.label}
        </Link>
      </td>
    </tr>
  );
}

/**
 * Doses given and missed for each camp day. Hand-drawn SVG rather than a chart
 * library: it is one chart and adding a dependency for it is not worth it.
 *
 * Colour here is the encoding, so it uses blue and red rather than green and
 * red. Green against red is the pair colour-blind readers cannot separate; see
 * spec/design/design-system.md, section 6.
 */
function DosesByDayChart({ data }: { data: Dashboard }) {
  const days = data.byDay;
  if (days.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-base text-muted">
        No doses recorded yet. The camp has not started.
      </div>
    );
  }

  const peak = Math.max(4, ...days.map((d) => d.given + d.missed));
  const step = 62;
  const barW = 40;
  const left = 46;
  const baseline = 168;
  const top = 26;
  const height = baseline - top;
  const width = Math.max(560, left + Math.max(days.length, data.totalDays) * step + 16);
  const y = (v: number) => baseline - (v / peak) * height;
  const ticks = [0, Math.round(peak / 2), peak];

  return (
    <div className="overflow-x-auto px-4 pb-2 pt-4">
      <svg
        viewBox={`0 0 ${width} 210`}
        width="100%"
        height="210"
        role="img"
        aria-label={`Doses given and missed for each camp day. ${days
          .map((d) => `Day ${d.dayNumber}: ${d.given} given, ${d.missed} missed`)
          .join(". ")}`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={left - 6}
              y1={y(t)}
              x2={width - 10}
              y2={y(t)}
              stroke="hsl(var(--chart-grid))"
              strokeWidth="1"
            />
            <text
              x={left - 12}
              y={y(t) + 4}
              textAnchor="end"
              fontSize="11"
              fill="hsl(var(--text-muted))"
              fontFamily="ui-monospace, Consolas, monospace"
            >
              {t}
            </text>
          </g>
        ))}

        {days.map((d, i) => {
          const x = left + i * step;
          const gh = (d.given / peak) * height;
          const mh = (d.missed / peak) * height;
          return (
            <g key={d.day}>
              <rect x={x} y={baseline - gh} width={barW} height={gh} fill="hsl(var(--chart-1))" />
              {d.missed > 0 && (
                <rect
                  x={x}
                  y={baseline - gh - mh - 2}
                  width={barW}
                  height={mh}
                  fill="hsl(var(--chart-3))"
                />
              )}
              {d.given > 0 && gh > 16 && (
                <text
                  x={x + barW / 2}
                  y={baseline - gh + 14}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="#ffffff"
                  fontFamily="ui-monospace, Consolas, monospace"
                >
                  {d.given}
                </text>
              )}
              {d.missed > 0 && (
                <text
                  x={x + barW / 2}
                  y={baseline - gh - mh - 7}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="hsl(var(--danger-text))"
                  fontFamily="ui-monospace, Consolas, monospace"
                >
                  {d.missed}
                </text>
              )}
              <text
                x={x + barW / 2}
                y={baseline + 18}
                textAnchor="middle"
                fontSize="11.5"
                fill={
                  d.dayNumber === data.dayNumber
                    ? "hsl(var(--text-primary))"
                    : "hsl(var(--text-muted))"
                }
                fontWeight={d.dayNumber === data.dayNumber ? 700 : 400}
              >
                Day {d.dayNumber}
              </text>
            </g>
          );
        })}

        {/* Days not yet reached: a tick, nothing more. */}
        {Array.from({ length: Math.max(0, data.totalDays - days.length) }, (_, i) => {
          const x = left + (days.length + i) * step + barW / 2;
          return (
            <g key={`future-${i}`}>
              <line
                x1={x}
                y1={baseline}
                x2={x}
                y2={baseline - 8}
                stroke="hsl(var(--border-card))"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={x}
                y={baseline + 18}
                textAnchor="middle"
                fontSize="11.5"
                fill="hsl(var(--text-muted))"
              >
                {days.length + i + 1}
              </text>
            </g>
          );
        })}

        <line
          x1={left - 6}
          y1={baseline}
          x2={width - 10}
          y2={baseline}
          stroke="hsl(var(--border-field))"
          strokeWidth="1"
        />
      </svg>

      <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-4" style={{ background: "hsl(var(--chart-1))" }} />
          Given
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-4" style={{ background: "hsl(var(--chart-3))" }} />
          Missed
        </span>
      </div>
    </div>
  );
}
