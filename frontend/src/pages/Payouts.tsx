import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, CheckCircle2, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/DataTable';
import { EmptyState } from '@/components/EmptyState';

export const Payouts: React.FC = () => {
  const { data: summary } = useQuery({
    queryKey: ['payoutSummary'],
    queryFn: async () => {
      const res = await api.get('/payouts/summary');
      return res.data;
    },
  });

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ['payoutsList'],
    queryFn: async () => {
      const res = await api.get('/payouts');
      return res.data;
    },
  });

  const columns: Column<any>[] = [
    {
      header: 'INVOICE ID',
      accessorKey: 'invoice_number',
      sortable: true,
      cell: (row) => <span className="font-mono text-xs font-semibold text-blue-600">#{row.invoice_number || 'INV'}</span>,
    },
    {
      header: 'CLIENT',
      accessorKey: 'client_name',
      sortable: true,
      cell: (row) => <span className="font-bold text-gray-900">{row.client_name || 'Client'}</span>,
    },
    {
      header: 'COLLECTED AMOUNT',
      accessorKey: 'amount',
      sortable: true,
      cell: (row) => (
        <span className="font-extrabold text-emerald-600">
          +${row.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'PAID DATE',
      accessorKey: 'paid_at',
      sortable: true,
      cell: (row) => new Date(row.paid_at).toLocaleDateString(),
    },
    {
      header: 'METHOD',
      accessorKey: 'method',
      cell: (row) => <span className="capitalize text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{row.method}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payouts & Payments</h1>
        <p className="text-sm text-gray-500 mt-1">Track your payment collections and earnings</p>
      </div>

      {/* Summary KPI Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Collected</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">
            ${(summary?.total_collected || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Paid Invoices</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{summary?.paid_invoices_count || 0}</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Loading payout records...</div>
      ) : payouts.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No Payments Yet"
          description="When your invoices are paid, payment information will appear here."
        />
      ) : (
        <DataTable
          columns={columns}
          data={payouts}
          keyExtractor={(row) => row.id}
        />
      )}
    </div>
  );
};
