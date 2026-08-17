import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Search, Filter, RefreshCw, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/DataTable';
import { SearchBar } from '@/components/SearchBar';
import { StatusBadge } from '@/components/StatusBadge';

export const SendHistory: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['sendHistory', search, statusFilter],
    queryFn: async () => {
      const res = await api.get('/messages', {
        params: { q: search, status: statusFilter },
      });
      return res.data;
    },
  });

  const columns: Column<any>[] = [
    {
      header: 'RECIPIENT',
      accessorKey: 'client_name',
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-semibold text-gray-900">{row.client_name || 'Client'}</div>
        </div>
      ),
    },
    {
      header: 'INVOICE',
      accessorKey: 'invoice_number',
      sortable: true,
      cell: (row) => <span className="font-mono text-xs font-semibold text-blue-600">#{row.invoice_number}</span>,
    },
    {
      header: 'SUBJECT',
      accessorKey: 'subject',
      cell: (row) => <span className="text-gray-800 line-clamp-1">{row.subject}</span>,
    },
    {
      header: 'SENT DATE',
      accessorKey: 'created_at',
      sortable: true,
      cell: (row) => new Date(row.sent_at || row.created_at).toLocaleString(),
    },
    {
      header: 'STATUS',
      accessorKey: 'status',
      sortable: true,
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Send History</h1>
          <p className="text-sm text-gray-500 mt-1">View history of all sent email communications</p>
        </div>
        <button
          onClick={() => refetch()}
          className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by recipient, invoice #, or subject..." />
        <div className="flex items-center space-x-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Delivery Statuses</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="opened">Opened</option>
            <option value="failed">Failed</option>
            <option value="bounced">Bounced</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={messages}
        keyExtractor={(row) => row.id}
        emptyText="No email communications found."
      />
    </div>
  );
};
