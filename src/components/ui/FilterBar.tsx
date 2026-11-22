import { Search } from "lucide-react";
import type { ReactNode } from "react";

export function FilterBar({
  search,
  onSearch,
  placeholder = "Search",
  children,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
}) {
  return (
    <div className="card mb-4 flex flex-col gap-3 p-4 md:flex-row md:items-center">
      <label className="relative flex-1">
        <span className="sr-only">{placeholder}</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
      </label>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
