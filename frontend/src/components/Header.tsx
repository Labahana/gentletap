import React, { useState, useEffect, useRef } from 'react';
import { Bell, ChevronDown, User as UserIcon, Settings as SettingsIcon, LogOut, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export const Header: React.FC = () => {
  const { orgName, user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications?limit=15')).data,
    refetchInterval: 60000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => api.post('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const unread = notifications?.unread ?? 0;
  const items = notifications?.items ?? [];

  const typeColor: Record<string, string> = {
    payment_detected: 'bg-green-50 text-green-600',
    escalation: 'bg-amber-50 text-amber-600',
    sync_error: 'bg-rose-50 text-rose-600',
    billing: 'bg-blue-50 text-blue-600',
    system: 'bg-slate-100 text-slate-600',
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Org Name */}
      <div className="flex items-center space-x-2">
        <span className="font-semibold text-gray-900 text-lg">{orgName || 'labahana'}</span>
        <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">
          Workspace
        </span>
      </div>

      {/* Right: Notifications & User Dropdown */}
      <div className="flex items-center space-x-4">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="min-w-[16px] h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full absolute -top-0.5 -right-0.5 ring-2 ring-white flex items-center justify-center px-1">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-900">Notifications</span>
                {unread > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {items.length === 0 && (
                  <p className="px-4 py-8 text-sm text-gray-400 text-center">No notifications yet</p>
                )}
                {items.map((n: any) => (
                  <button
                    key={n.id}
                    onClick={async () => {
                      await api.post(`/notifications/${n.id}/read`).catch(() => {});
                      queryClient.invalidateQueries({ queryKey: ['notifications'] });
                      if (n.link) navigate(n.link);
                      setNotifOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex gap-3 ${
                      !n.read ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <span
                      className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs ${
                        typeColor[n.type] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-900 truncate">{n.title}</span>
                      {n.body && <span className="block text-xs text-gray-500 line-clamp-2">{n.body}</span>}
                      <span className="block text-[11px] text-gray-400 mt-0.5">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </span>
                    {!n.read && <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-1.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2.5 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center text-sm border border-blue-200">
              {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium text-gray-900 leading-tight">
                {user?.full_name || 'Demo User'}
              </div>
              <div className="text-xs text-gray-500 leading-tight">{user?.email || 'user@gentletap.com'}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 text-sm">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/settings');
                }}
                className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <SettingsIcon className="w-4 h-4 text-gray-400" />
                <span>Account Settings</span>
              </button>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
