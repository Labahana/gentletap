import React, { useState } from 'react';
import { Bell, ChevronDown, User as UserIcon, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export const Header: React.FC = () => {
  const { orgName, user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

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
        <button
          onClick={() => alert('No new notifications')}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="w-2 h-2 bg-blue-600 rounded-full absolute top-1.5 right-1.5 ring-2 ring-white"></span>
        </button>

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
