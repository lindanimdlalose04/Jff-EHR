import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The shared breadcrumb trail. It replaces the ad-hoc single "Back to X" links
 * so every detail and form page shows where it sits in the hierarchy and lets
 * the user jump to any level above, not just one step back. The last item is
 * the current page and is never a link.
 */

export interface Crumb {
  label: string;
  /** A link target for every level except the current page. */
  to?: string;
}

export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("mb-3 flex flex-wrap items-center gap-1 text-sm", className)}
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <Fragment key={i}>
            {item.to && !last ? (
              <Link
                to={item.to}
                className="font-medium text-secondary transition hover:text-primary"
              >
                {item.label}
              </Link>
            ) : (
              <span className={last ? "font-medium text-primary" : "text-secondary"}>
                {item.label}
              </span>
            )}
            {!last && <ChevronRight size={13} className="text-muted" />}
          </Fragment>
        );
      })}
    </nav>
  );
}
