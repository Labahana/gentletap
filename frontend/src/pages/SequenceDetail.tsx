import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Mail, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { SequenceTimeline } from '@/components/SequenceTimeline';

export const SequenceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: sequence, isLoading } = useQuery({
    queryKey: ['sequenceDetail', id],
    queryFn: async () => {
      const res = await api.get(`/sequences/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 text-sm">Loading sequence timeline...</div>;
  }

  if (!sequence) {
    return <div className="p-8 text-center text-gray-500 text-sm">Sequence not found.</div>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/sequences')}
        className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Sequences</span>
      </button>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{sequence.name}</h1>
            <StatusBadge status={sequence.status} />
          </div>
          <p className="text-xs text-gray-500">
            Automatically sends reminders and stops after {sequence.stop_after_days || 30} days or upon payment mark.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-base font-bold text-gray-900 mb-4">Sequence Step Timeline</h3>
        <SequenceTimeline steps={sequence.steps || []} />
      </div>
    </div>
  );
};
