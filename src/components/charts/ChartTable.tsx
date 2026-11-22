export function ChartTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-surface-secondary text-left text-xs text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col" className="whitespace-nowrap px-3 py-2.5 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-separator last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={`px-3 py-2.5 ${cellIndex > 0 ? "amount text-right" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
