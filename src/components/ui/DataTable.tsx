import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  numeric?: boolean;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  keyOf,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-surface-secondary text-left text-xs text-muted">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`whitespace-nowrap border-b border-border px-4 py-3 font-medium ${column.numeric ? "text-right" : ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={keyOf(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-separator last:border-0 hover:bg-surface-secondary ${onRowClick ? "cursor-pointer" : ""}`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3.5 align-middle ${column.numeric ? "amount text-right" : ""} ${column.className ?? ""}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-separator md:hidden">
        {rows.map((row) => (
          <li key={keyOf(row)} className="p-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {columns.map((column) => (
                <div key={column.key} className={column.key === columns[0]?.key ? "col-span-2" : ""}>
                  <dt className="text-xs text-muted">{column.header}</dt>
                  <dd className={`mt-0.5 ${column.numeric ? "amount text-right" : ""}`}>{column.render(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
