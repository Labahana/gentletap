import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, GitMerge, Mail, Clock, Eye, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';

export const Sequences: React.FC = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [stopAfterDays, setStopAfterDays] = useState(30);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['sequences', activeTab],
    queryFn: async () => {
      const res = await api.get('/sequences', { params: { status: activeTab } });
      return res.data;
    },
  });

  const createSequenceMutation = useMutation({
    mutationFn: async () => {
      const defaultSteps = [
        { day_offset: 3, tone: 'warm', enabled: true },
        { day_offset: 7, tone: 'friendly', enabled: true },
        { day_offset: 14, tone: 'firm', enabled: true },
        { day_offset: 21, tone: 'urgent', enabled: true },
      ];
      await api.post('/sequences', {
        name,
        steps: defaultSteps,
        stop_after_days: stopAfterDays,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      setCreateModalOpen(false);
      setName('');
    },
  });

  const deleteSequenceMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sequences/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Title & Header CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sequences</h1>
          <p className="text-sm text-gray-500 mt-1">Manage automated follow-up email sequences for your invoices</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Create Sequence</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 space-x-6 text-sm font-semibold">
        {['active', 'completed', 'paused', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 capitalize transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Sequence List / Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Loading sequences...</div>
      ) : sequences.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No email sequences found"
          description="You don't have any active email sequences. Create a new sequence to automate your invoice follow-ups."
          actionLabel="Create your first sequence"
          onAction={() => setCreateModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sequences.map((seq: any) => (
            <div
              key={seq.id}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-gray-900">{seq.name}</h3>
                  <StatusBadge status={seq.status} />
                </div>

                <div className="bg-slate-50 border border-gray-100 rounded-lg p-3 mb-4 flex items-center justify-between text-xs text-gray-600">
                  <span className="flex items-center gap-1 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-blue-600" /> {seq.steps?.length || 0} Step Cadence
                  </span>
                  <span>Stops after {seq.stop_after_days || 30} days</span>
                </div>

                <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                  {seq.steps?.map((step: any, idx: number) => (
                    <span
                      key={idx}
                      className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-100 shrink-0"
                    >
                      Day {step.day_offset}: {step.tone}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4 text-xs">
                <button
                  onClick={() => navigate(`/sequences/${seq.id}`)}
                  className="text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Timeline</span>
                </button>
                <button
                  onClick={() => deleteSequenceMutation.mutate(seq.id)}
                  className="p-1 text-red-400 hover:text-red-600 rounded"
                  title="Delete Sequence"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Sequence Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create Sequence</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Sequence Name</label>
                <input
                  type="text"
                  placeholder="Standard Freelancer 4-Step Followup"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Stop Sequence After (Days)</label>
                <input
                  type="number"
                  value={stopAfterDays}
                  onChange={(e) => setStopAfterDays(parseInt(e.target.value) || 30)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 leading-relaxed">
                Will auto-generate 4 calibrated steps (Day 3 Warm, Day 7 Friendly, Day 14 Firm, Day 21 Urgent).
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => createSequenceMutation.mutate()}
                  disabled={!name}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs shadow-xs disabled:opacity-50"
                >
                  Create Sequence
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
