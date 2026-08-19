import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  GitMerge,
  History,
  DollarSign,
  Mail,
  Settings,
  HelpCircle,
  LogOut,
  Zap,
  Plug,
  AlertTriangle,
  CreditCard,
  UsersRound,
  BarChart3,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface SidebarProps {
  onUpgradeClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onUpgradeClick }) => {
  const { logout, plan } = useAuthStore();
  const navigate = useNavigate();

  const mainNav = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Escalations', path: '/escalations', icon: AlertTriangle },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Sequences', path: '/sequences', icon: GitMerge },
    { name: 'Send History', path: '/history', icon: History },
    { name: 'Payouts', path: '/payouts', icon: DollarSign },
    { name: 'Templates', path: '/templates', icon: Mail },
    { name: 'Billing', path: '/billing', icon: CreditCard },
    { name: 'Team', path: '/team', icon: UsersRound },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col justify-between h-screen fixed left-0 top-0 z-30 select-none">
      <div>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/logo192.png" alt="GentleTap Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold text-blue-600 tracking-tight">GentleTap</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {mainNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'border-l-4 border-blue-600 bg-blue-50 text-blue-600 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          <div className="pt-4 pb-1 px-3">
            <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Settings</span>
          </div>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 text-sm rounded-md transition-colors ${
                isActive ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
              }`
            }
          >
            <Settings className="w-4 h-4" />
            <span>Account Settings</span>
          </NavLink>
          <NavLink
            to="/integrations"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 text-sm rounded-md transition-colors ${
                isActive ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
              }`
            }
          >
            <Plug className="w-4 h-4" />
            <span>Integrations</span>
          </NavLink>

          <div className="pt-4 pb-1 px-3">
            <span className="text-xs font-bold text-gray-400 tracking-wider uppercase">Support</span>
          </div>
          <a
            href="#help"
            onClick={(e) => {
              e.preventDefault();
              alert('GentleTap Support: support@gentletap.com');
            }}
            className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md font-medium"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help & Docs</span>
          </a>
        </nav>
      </div>

      {/* Bottom Card & Signout */}
      <div className="p-3 border-t border-gray-100 space-y-3">
        <div className="bg-slate-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-gray-200 text-gray-700 rounded-full capitalize">
              {plan} plan
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            3 invoice limit. Upgrade to unlock unlimited invoices, FreshBooks/QBO sync, and more.
          </p>
          <button
            onClick={onUpgradeClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2 rounded-md transition-colors shadow-sm"
          >
            Upgrade Now
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-medium text-sm px-3 py-1.5 w-full rounded-md hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
