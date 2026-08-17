import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { UsageBar } from '@/components/billing/UsageBar';

export const Team: React.FC = () => {
  const [email, setEmail] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: async () => (await api.get('/team')).data,
  });

  const invite = useMutation({
    mutationFn: async () => api.post('/team/invite', { email, role: 'member' }),
    onSuccess: () => {
      setInviteOpen(false);
      setEmail('');
      qc.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (err: any) => alert(err?.response?.data?.detail || 'Invite failed'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/team/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });

  const isTeam = data?.plan === 'team';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Team</h1>
          <p className="text-sm text-gray-500 mt-1">Invite colleagues and manage seats</p>
        </div>
        {isTeam && (
          <button
            onClick={() => setInviteOpen(true)}
            className="bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-lg"
          >
            Invite member
          </button>
        )}
      </div>

      {!isTeam && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-900">
          Team seats require the Team plan. Upgrade in Billing to invite up to 2 additional members.
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <UsageBar
          label="Seats used"
          used={data?.seats_used || 1}
          quota={data?.seats_limit || 1}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-100">
              <th className="py-3 px-4">Member</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {(data?.members || []).map((m: any) => (
              <tr key={m.id} className="border-b border-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <Users className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{m.full_name || m.email || m.invited_email}</div>
                      <div className="text-xs text-gray-500">{m.email || m.invited_email}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-xs capitalize font-medium text-gray-700">{m.role}</td>
                <td className="py-3 px-4 text-xs capitalize text-gray-600">{m.status}</td>
                <td className="py-3 px-4 text-right">
                  {m.role !== 'owner' && (
                    <button
                      onClick={() => remove.mutate(m.id)}
                      className="text-xs text-rose-600 font-medium"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && !(data?.members || []).length && (
              <tr>
                <td colSpan={4} className="py-10 text-center">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-gray-900">No team members yet</div>
                  <div className="text-xs text-gray-500">Invite colleagues on the Team plan</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setInviteOpen(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Invite member</h3>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
            <div className="relative mb-4">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm"
                placeholder="colleague@company.com"
              />
            </div>
            <button
              onClick={() => invite.mutate()}
              disabled={!email || invite.isPending}
              className="w-full bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg"
            >
              {invite.isPending ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
