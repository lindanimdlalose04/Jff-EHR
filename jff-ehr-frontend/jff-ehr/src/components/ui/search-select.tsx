import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A searchable single-select: a dropdown you can type into. Focusing it shows
 * the whole list like a plain select, and typing narrows that list by name,
 * number or any other keyword the caller attaches. Built for the camp roster,
 * where a camp can hold 20-50 campers and a scroll-only dropdown is unworkable.
 */

export interface SearchSelectOption {
  value: string;
  /** Primary line, and the text shown once the option is chosen. */
  label: string;
  /** Secondary line in the list (file number, diagnosis, cabin…). */
  hint?: string;
  /** Extra text to match against that is not shown, if any. */
  keywords?: string;
}

interface SearchSelectProps {
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  /** Message when a search matches nothing. */
  emptyText?: string;
  /** Cap on how many matches to render at once. */
  maxVisible?: number;
}

export function SearchSelect({
  options,
  value,
  onChange,
  id,
  placeholder = "Search…",
  emptyText = "No matches",
  maxVisible = 50,
}: SearchSelectProps) {
  const selected = options.find((o) => o.value === value) ?? null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // The input mirrors the chosen label when closed, and free text while open.
  const inputText = open ? query : (selected?.label ?? "");

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    // An empty query, or a query still equal to the chosen label, shows the
    // full list so the control reopens like an ordinary dropdown.
    const showAll = !needle || needle === selected?.label.toLowerCase();
    const filtered = showAll
      ? options
      : options.filter((o) =>
          `${o.label} ${o.hint ?? ""} ${o.keywords ?? ""}`.toLowerCase().includes(needle),
        );
    return filtered.slice(0, maxVisible);
  }, [options, query, selected, maxVisible]);

  const active = Math.min(activeIndex, Math.max(0, matches.length - 1));

  const choose = (option: SearchSelectOption) => {
    onChange(option.value);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((i) => Math.min(matches.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      if (open && matches[active]) {
        e.preventDefault();
        choose(matches[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setOpen(false);
          setQuery("");
        }
      }}
    >
      <Search
        size={14}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        className={cn(
          "h-[38px] w-full rounded-control border border-field-border bg-field pl-8 pr-2.5 text-sm text-primary",
          "outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 placeholder:text-muted",
        )}
        placeholder={placeholder}
        value={inputText}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(0);
          if (!e.target.value) onChange("");
        }}
        onKeyDown={onKeyDown}
      />

      {open && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-[280px] w-full overflow-y-auto rounded-control border border-card bg-surface py-1 shadow-lg"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-[12.5px] text-muted">{emptyText}</li>
          ) : (
            matches.map((option, i) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => choose(option)}
                className={cn(
                  "cursor-pointer px-3 py-1.5",
                  i === active ? "bg-accent-tint" : "hover:bg-field",
                )}
              >
                <div className="text-[13px] font-medium text-primary">{option.label}</div>
                {option.hint && (
                  <div className="truncate text-[11.5px] text-muted">{option.hint}</div>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
