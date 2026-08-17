import React, { useState, useEffect } from 'react';
import { X, Send, Eye, Sparkles, CheckCircle2, AlertTriangle, Mail } from 'lucide-react';
import { api } from '@/lib/api';

interface SendPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  templates: any[];
  onSuccess: () => void;
}

export const SendPreviewModal: React.FC<SendPreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  templates,
  onSuccess,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [sendVia, setSendVia] = useState<string>('resend'); // 'resend' or 'gmail'
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoice && templates.length > 0) {
      const defaultTpl = templates.find((t) => t.is_default) || templates[0];
      if (defaultTpl) {
        setSelectedTemplateId(defaultTpl.id);
        setSubject(defaultTpl.subject);
        setBody(defaultTpl.body);
      }
    }
  }, [invoice, templates]);

  if (!isOpen || !invoice) return null;

  const handleTemplateChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
  };

  const renderPreview = (text: string) => {
    if (!text) return '';
    let res = text;
    res = res.replace(/{client_name}/g, invoice.client?.name || 'Valued Client');
    res = res.replace(/{invoice_number}/g, invoice.number || 'INV-001');
    res = res.replace(/{amount}/g, `$${invoice.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}`);
    res = res.replace(/{due_date}/g, invoice.due_date || 'Due Date');
    res = res.replace(/{days_overdue}/g, '14');
    return res;
  };

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      await api.post('/messages/send', {
        invoice_id: invoice.id,
        template_id: selectedTemplateId || null,
        subject,
        body,
        send_via: sendVia,
        preview: false,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send reminder email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 relative max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Send Invoice Reminder</h3>
            <p className="text-xs text-gray-500">
              Invoice #{invoice.number} • {invoice.client?.name} (${invoice.amount?.toLocaleString()})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          {/* Sending Channel Method */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Sending Channel</label>
            <select
              value={sendVia}
              onChange={(e) => setSendVia(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="resend">GentleTap Domain (Default - noreply@gentletap.co)</option>
              <option value="gmail">My Connected Gmail Account (via Google OAuth)</option>
            </select>
          </div>

          {/* Template Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Select Template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.tone})
                </option>
              ))}
            </select>
          </div>

          {/* Subject Line Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Subject Line</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Message Body</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-xs"
            ></textarea>
          </div>

          {/* Live Preview Pane */}
          <div className="bg-slate-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Live Rendered Preview</span>
            </div>
            <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-xs">
              <div className="text-xs font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-2">
                Subject: {renderPreview(subject)}
              </div>
              <div className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                {renderPreview(body)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs flex items-center space-x-2 transition-colors shadow-xs disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? 'Sending...' : `Send via ${sendVia === 'gmail' ? 'Gmail' : 'Resend'}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
