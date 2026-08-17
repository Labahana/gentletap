import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Plus, Upload, FileText, Send, CheckCircle, Pause, Play, Eye, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/DataTable';
import { SearchBar } from '@/components/SearchBar';
import { StatusBadge } from '@/components/StatusBadge';
import { SendPreviewModal } from '@/components/SendPreviewModal';
import { useAuthStore } from '@/stores/authStore';

export const Invoices: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoiceForSend, setSelectedInvoiceForSend] = useState<any>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Form states for manual creation
  const [number, setNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // CSV Import preview state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { plan } = useAuthStore();
  const { openUpgradeModal } = useOutletContext<{ openUpgradeModal: () => void }>();

  // Fetch Invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, search],
    queryFn: async () => {
      const res = await api.get('/invoices', {
        params: { status: statusFilter, q: search },
      });
      return res.data;
    },
  });

  // Fetch Clients for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ['clientsDropdown'],
    queryFn: async () => {
      const res = await api.get('/clients');
      return res.data;
    },
  });

  // Fetch Templates for reminder modal
  const { data: templates = [] } = useQuery({
    queryKey: ['templatesDropdown'],
    queryFn: async () => {
      const res = await api.get('/templates');
      return res.data;
    },
  });

  // Mark Paid mutation
  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/invoices/${id}/mark-paid`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  // Pause / Resume mutation
  const togglePauseMutation = useMutation({
    mutationFn: async ({ id, stop }: { id: string; stop: boolean }) => {
      if (stop) {
        await api.post(`/invoices/${id}/resume`);
      } else {
        await api.post(`/invoices/${id}/pause`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  // Handle Manual Create
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (plan === 'free' && invoices.length >= 3) {
      setCreateModalOpen(false);
      openUpgradeModal();
      return;
    }

    try {
      await api.post('/invoices', {
        number,
        client_id: clientId,
        amount: parseFloat(amount),
        currency: 'USD',
        due_date: dueDate || null,
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setCreateModalOpen(false);
      setNumber('');
      setAmount('');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setCreateModalOpen(false);
        openUpgradeModal();
      } else {
        setFormError(err.response?.data?.detail || 'Failed to create invoice');
      }
    }
  };

  // Handle CSV Upload preview
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/invoices/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setCsvPreview(res.data);
    } catch (err) {
      alert('Failed to parse CSV file');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!csvPreview) return;
    try {
      await api.post('/invoices/confirm-import', { rows: csvPreview.preview });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setImportModalOpen(false);
      setCsvPreview(null);
      setCsvFile(null);
    } catch (err) {
      alert('Failed to confirm import');
    }
  };

  // Table Columns
  const columns: Column<any>[] = [
    {
      header: 'CLIENT',
      accessorKey: 'client_id',
      sortable: true,
      cell: (row) => (
        <div>
          <div className="font-semibold text-gray-900">{row.client?.name || 'Unnamed Client'}</div>
          <div className="text-xs text-gray-500">{row.client?.email || 'No email'}</div>
        </div>
      ),
    },
    {
      header: 'INVOICE ID',
      accessorKey: 'number',
      sortable: true,
      cell: (row) => <span className="font-mono text-xs font-semibold text-blue-600">#{row.number}</span>,
    },
    {
      header: 'AMOUNT',
      accessorKey: 'amount',
      sortable: true,
      cell: (row) => (
        <span className="font-bold text-gray-900">
          ${row.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'ISSUE DATE',
      accessorKey: 'issue_date',
      sortable: true,
      cell: (row) => row.issue_date || '—',
    },
    {
      header: 'DUE DATE',
      accessorKey: 'due_date',
      sortable: true,
      cell: (row) => row.due_date || '—',
    },
    {
      header: 'STATUS',
      accessorKey: 'status',
      sortable: true,
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'ACTIONS',
      cell: (row) => (
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/invoices/${row.id}`)}
            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {row.status === 'unpaid' && (
            <>
              <button
                onClick={() => {
                  setSelectedInvoiceForSend(row);
                  setSendModalOpen(true);
                }}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold rounded-md text-xs flex items-center space-x-1 transition-colors"
              >
                <Send className="w-3 h-3" />
                <span>Send Reminder</span>
              </button>
              <button
                onClick={() => markPaidMutation.mutate(row.id)}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-md text-xs flex items-center space-x-1 transition-colors"
              >
                <CheckCircle className="w-3 h-3" />
                <span>Mark Paid</span>
              </button>
              <button
                onClick={() => togglePauseMutation.mutate({ id: row.id, stop: row.stop_reminders })}
                className="p-1.5 text-gray-400 hover:text-amber-600 rounded-md hover:bg-amber-50"
                title={row.stop_reminders ? 'Resume Reminders' : 'Pause Reminders'}
              >
                {row.stop_reminders ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track all of your invoices</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setImportModalOpen(true)}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 shadow-xs"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={() => {
              if (plan === 'free' && invoices.length >= 3) {
                openUpgradeModal();
              } else {
                setCreateModalOpen(true);
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by invoice # or client name..." />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="disputed">Disputed</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Invoices Table */}
      <DataTable
        columns={columns}
        data={invoices}
        keyExtractor={(row) => row.id}
        emptyText="No invoices found. Create a new invoice or import via CSV to get started."
        onRowClick={(row) => navigate(`/invoices/${row.id}`)}
      />

      {/* Manual Send Modal */}
      <SendPreviewModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        invoice={selectedInvoiceForSend}
        templates={templates}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          alert('Reminder sent successfully!');
        }}
      />

      {/* Create Invoice Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Invoice</h3>
            {formError && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg mb-4">{formError}</div>}
            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  required
                  placeholder="INV-2026-001"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Client</label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Select a Client...</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email || 'No email'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="1500.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors shadow-xs"
                >
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Import Invoices via CSV</h3>
            <p className="text-xs text-gray-500 mb-4">
              Upload a CSV file containing columns: <code className="bg-gray-100 px-1 py-0.5 rounded text-blue-600">invoice_number, client_name, client_email, amount, due_date</code>
            </p>

            {!csvPreview ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-slate-50 my-4">
                <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2 rounded-lg inline-block shadow-xs">
                  {uploading ? 'Processing CSV...' : 'Select CSV File'}
                  <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                </label>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto flex-1 my-2">
                <div className="flex items-center space-x-4 text-xs font-semibold">
                  <span className="text-gray-700">Total Rows: {csvPreview.total_rows}</span>
                  <span className="text-emerald-600">Valid: {csvPreview.valid_rows_count}</span>
                  <span className="text-rose-600">Invalid: {csvPreview.invalid_rows_count}</span>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 font-semibold">
                      <tr>
                        <th className="p-2">INVOICE #</th>
                        <th className="p-2">CLIENT</th>
                        <th className="p-2">AMOUNT</th>
                        <th className="p-2">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {csvPreview.preview.map((r: any, idx: number) => (
                        <tr key={idx} className={r.is_valid ? 'bg-white' : 'bg-rose-50/50'}>
                          <td className="p-2 font-mono">{r.invoice_number}</td>
                          <td className="p-2">{r.client_name}</td>
                          <td className="p-2">${r.amount}</td>
                          <td className="p-2">
                            {r.is_valid ? (
                              <span className="text-emerald-600 font-semibold">Valid</span>
                            ) : (
                              <span className="text-rose-600 font-semibold">{r.error_message}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 mt-2">
              <button
                onClick={() => {
                  setImportModalOpen(false);
                  setCsvPreview(null);
                }}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 rounded-lg"
              >
                Cancel
              </button>
              {csvPreview && (
                <button
                  onClick={handleConfirmImport}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs shadow-xs"
                >
                  Confirm & Import ({csvPreview.valid_rows_count})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
