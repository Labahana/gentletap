import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import { DataTable, Column } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { ClientProfileCard } from '@/components/ClientProfileCard';

export const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'invoices' | 'preferences' | 'messages'>('invoices');
  const [tonePref, setTonePref] = useState('');
  const [channelPref, setChannelPref] = useState('email');
  const [bestSendTime, setBestSendTime] = useState('09:00');

  const { data: client, isLoading } = useQuery({
    queryKey: ['clientDetail', id],
    queryFn: async () => (await api.get(`/clients/${id}`)).data,
    enabled: !!id,
  });

  const { data: profile } = useQuery({
    queryKey: ['clientProfile', id],
    queryFn: async () => (await api.get(`/clients/${id}/profile`)).data,
    enabled: !!id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['clientInvoices', id],
    queryFn: async () => (await api.get('/invoices', { params: { client_id: id } })).data,
    enabled: !!id,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['clientMessages', id],
    queryFn: async () => (await api.get('/messages', { params: { q: client?.email || '' } })).data,
    enabled: !!id && !!client?.email && tab === 'messages',
  });

  React.useEffect(() => {
    if (profile?.preferences) {
      setTonePref(profile.preferences.tone_pref || '');
      setChannelPref(profile.preferences.channel_pref || 'email');
      setBestSendTime(profile.preferences.best_send_time || '09:00');
    }
  }, [profile]);

  const prefsMutation = useMutation({
    mutationFn: async () =>
      api.patch(`/clients/${id}/preferences`, {
        tone_pref: tonePref || null,
        channel_pref: channelPref,
        best_send_time: bestSendTime,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clientProfile', id] }),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 text-sm">Loading client profile...</div>;
  }
  if (!client) {
    return <div className="p-8 text-center text-gray-500 text-sm">Client not found.</div>;
  }

  const columns: Column<any>[] = [
    {
      header: 'INVOICE ID',
      accessorKey: 'number',
      cell: (row) => <span className="font-mono font-semibold text-blue-600">#{row.number}</span>,
    },
    {
      header: 'AMOUNT',
      accessorKey: 'amount',
      cell: (row) => <span className="font-bold text-gray-900">${row.amount?.toLocaleString()}</span>,
    },
    {
      header: 'DUE DATE',
      accessorKey: 'due_date',
      cell: (row) => row.due_date || '—',
    },
    {
      header: 'STATUS',
      accessorKey: 'status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/clients')}
        className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </button>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{client.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-2">
            {client.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                {client.email}
              </span>
            )}
            {client.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                {client.phone}
              </span>
            )}
            {client.address && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {client.address}
              </span>
            )}
          </div>
        </div>
        <div className="w-full md:w-72">
          <ClientProfileCard
            score={profile?.reliability_score ?? 100}
            avgDaysToPay={profile?.avg_days_to_pay ?? 0}
            lateCount={profile?.late_count ?? 0}
            totalPaid={profile?.total_paid ?? 0}
            totalInvoices={profile?.total_invoices ?? 0}
          />
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {(['invoices', 'preferences', 'messages'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-semibold capitalize border-b-2 -mb-px ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'invoices' && (
        <DataTable
          columns={columns}
          data={invoices}
          keyExtractor={(row) => row.id}
          emptyText="No invoices associated with this client yet."
          onRowClick={(row) => navigate(`/invoices/${row.id}`)}
        />
      )}

      {tab === 'preferences' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tone preference</label>
            <select
              value={tonePref}
              onChange={(e) => setTonePref(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Auto (by overdue days)</option>
              {['warm', 'friendly', 'professional', 'firm', 'urgent'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Channel</label>
            <select
              value={channelPref}
              onChange={(e) => setChannelPref(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="email">Email</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Best send time</label>
            <input
              type="time"
              value={bestSendTime}
              onChange={(e) => setBestSendTime(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => prefsMutation.mutate()}
            className="bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-lg"
          >
            Save preferences
          </button>
        </div>
      )}

      {tab === 'messages' && (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {(messages || []).length === 0 && (
            <p className="p-6 text-xs text-gray-400 text-center">No messages yet.</p>
          )}
          {(messages || []).map((m: any) => (
            <div key={m.id} className="p-4">
              <div className="text-sm font-semibold text-gray-900">{m.subject}</div>
              <div className="text-xs text-gray-500 mt-1">
                {m.status} · {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
