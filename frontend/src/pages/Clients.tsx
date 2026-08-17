import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Eye, Mail, Phone, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/DataTable';
import { SearchBar } from '@/components/SearchBar';

export const Clients: React.FC = () => {
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: async () => {
      const res = await api.get('/clients', { params: { q: search } });
      return res.data;
    },
  });

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/clients', { name, email: email || null, phone: phone || null, address: address || null });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setCreateModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
    } catch (err) {
      alert('Failed to create client');
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'CLIENT',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => <span className="font-bold text-gray-900">{row.name}</span>,
    },
    {
      header: 'EMAIL',
      accessorKey: 'email',
      sortable: true,
      cell: (row) => row.email || '—',
    },
    {
      header: 'RELIABILITY',
      accessorKey: 'reliability_score',
      sortable: true,
      cell: (row) => {
        const score = row.reliability_score;
        if (score == null) return <span className="text-gray-400">—</span>;
        const color =
          score >= 80 ? 'text-emerald-700 bg-emerald-50' : score >= 50 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50';
        return (
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${color}`}>{score}</span>
        );
      },
    },
    {
      header: 'RELATIONSHIP',
      accessorKey: 'relationship_started_at',
      sortable: true,
      cell: (row) => (row.relationship_started_at ? new Date(row.relationship_started_at).toLocaleDateString() : 'Active'),
    },
    {
      header: 'PHONE',
      accessorKey: 'phone',
      cell: (row) => row.phone || '—',
    },
    {
      header: 'ADDRESS',
      accessorKey: 'address',
      cell: (row) => row.address || '—',
    },
    {
      header: 'ACTIONS',
      cell: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/clients/${row.id}`);
          }}
          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
          title="View Client Detail"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your client information and contact details</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Client</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <SearchBar value={search} onChange={setSearch} placeholder="Search clients by name or email..." />
      </div>

      <DataTable
        columns={columns}
        data={clients}
        keyExtractor={(row) => row.id}
        emptyText="No clients found. Add your first client to get started."
        onRowClick={(row) => navigate(`/clients/${row.id}`)}
      />

      {/* Create Client Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Client</h3>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Client Name</label>
                <input
                  type="text"
                  required
                  placeholder="Acme Corp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="billing@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (555) 019-2834"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Billing Address</label>
                <input
                  type="text"
                  placeholder="123 Tech Boulevard, Suite 400"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
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
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
