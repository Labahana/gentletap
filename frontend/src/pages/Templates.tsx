import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Mail, Sparkles, Copy, Edit2, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { TemplateCard } from '@/components/TemplateCard';

export const Templates: React.FC = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [name, setName] = useState('');
  const [tone, setTone] = useState('friendly');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [aiContext, setAiContext] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);

  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await api.get('/templates');
      return res.data;
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (editingTemplate) {
        await api.patch(`/templates/${editingTemplate.id}`, { name, tone, subject, body });
      } else {
        await api.post('/templates', { name, tone, subject, body });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setCreateModalOpen(false);
      resetForm();
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  const resetForm = () => {
    setEditingTemplate(null);
    setName('');
    setTone('friendly');
    setSubject('');
    setBody('');
    setAiContext('');
  };

  const handleGenerateAI = async () => {
    setGeneratingAI(true);
    try {
      const res = await api.post('/templates/generate-ai', {
        tone,
        context: aiContext,
      });
      setSubject(res.data.subject);
      setBody(res.data.body);
    } catch (err) {
      alert('AI generation failed. Static template loaded.');
    } finally {
      setGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Email Templates</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage your email templates for automated sequences and manual sends</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setCreateModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Create Template</span>
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Loading email templates...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl: any) => (
            <TemplateCard
              key={tpl.id}
              id={tpl.id}
              name={tpl.name}
              tone={tpl.tone}
              subject={tpl.subject}
              body={tpl.body}
              isDefault={tpl.is_default}
              onPreview={() => {
                alert(`Subject: ${tpl.subject}\n\n${tpl.body}`);
              }}
              onEdit={() => {
                setEditingTemplate(tpl);
                setName(tpl.name);
                setTone(tpl.tone);
                setSubject(tpl.subject);
                setBody(tpl.body);
                setCreateModalOpen(true);
              }}
              onDelete={() => deleteTemplateMutation.mutate(tpl.id)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Template Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingTemplate ? 'Edit Template' : 'Create Email Template'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Template Name</label>
                <input
                  type="text"
                  placeholder="e.g. Friendly Check-in"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 capitalize"
                >
                  {['warm', 'friendly', 'professional', 'firm', 'urgent'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Draft Generator Box */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Kimi AI Draft Assistant
                  </span>
                  <button
                    onClick={handleGenerateAI}
                    disabled={generatingAI}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3 py-1 rounded-md shadow-xs transition-colors disabled:opacity-50"
                  >
                    {generatingAI ? 'Generating...' : 'Generate Draft'}
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Optional prompt context (e.g. Second follow-up after 14 days)..."
                  value={aiContext}
                  onChange={(e) => setAiContext(e.target.value)}
                  className="w-full bg-white border border-blue-200 rounded-md px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subject Line</label>
                <input
                  type="text"
                  placeholder="Reminder: Invoice #{invoice_number} ({amount})"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Body Text</label>
                <textarea
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Use variables like {client_name}, {invoice_number}, {amount}, {due_date}, {days_overdue}"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setCreateModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveTemplateMutation.mutate()}
                  disabled={!name || !subject || !body}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors shadow-xs disabled:opacity-50"
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
