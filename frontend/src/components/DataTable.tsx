import React, { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyText?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyText = 'No records found.',
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key?: keyof T) => {
    if (!key) return;
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      return sortOrder === 'asc' ? 1 : -1;
    });
  }, [data, sortKey, sortOrder]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  onClick={() => col.sortable && handleSort(col.accessorKey)}
                  className={`px-6 py-3.5 ${
                    col.sortable ? 'cursor-pointer hover:text-gray-900 transition-colors' : ''
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <span className="text-gray-400">
                        {sortKey === col.accessorKey ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500 text-sm">
                  {emptyText}
                </td>
              </tr>
            ) : (
              sortedData.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col, idx) => (
                    <td key={idx} className="px-6 py-4 text-gray-700 font-normal whitespace-nowrap">
                      {col.cell
                        ? col.cell(row)
                        : col.accessorKey
                        ? String(row[col.accessorKey] ?? '')
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
