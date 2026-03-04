import React from 'react';
import { Coffee, LayoutDashboard, Menu as MenuIcon, Users, Grid, LogOut, User, Settings, FileText, PanelLeftClose } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAppStore } from '../store';
import { t } from '../i18n';
import { getApiBaseUrl } from '../api';
import { BilbaoLogo } from './BilbaoLogo';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab, onCollapse }) => {
  const { currentUser, setCurrentUser, settings, realtimeConnected } = useAppStore();
  const lang = settings.language;
  const logoUrl = settings.logoUrl ? (settings.logoUrl.startsWith('http') || settings.logoUrl.startsWith('data:') ? settings.logoUrl : getApiBaseUrl() + settings.logoUrl) : null;

  const navItems = [
    { id: 'pos', label: t(lang, 'nav.pos'), icon: Coffee, roles: ['Manager', 'Admin', 'Barista', 'Staff'] },
    { id: 'dashboard', label: t(lang, 'nav.dashboard'), icon: LayoutDashboard, roles: ['Manager', 'Admin'] },
    { id: 'menu', label: t(lang, 'nav.menu'), icon: MenuIcon, roles: ['Manager', 'Admin'] },
    { id: 'tables', label: t(lang, 'nav.tables'), icon: Grid, roles: ['Manager', 'Admin'] },
    { id: 'staff', label: t(lang, 'nav.staff'), icon: Users, roles: ['Manager', 'Admin'] },
    { id: 'reports', label: t(lang, 'nav.reports'), icon: FileText, roles: ['Manager', 'Admin'] },
    { id: 'settings', label: t(lang, 'nav.settings'), icon: Settings, roles: ['Manager', 'Admin'] },
  ];

  const visibleNavItems = navItems.filter(item => 
    !currentUser || item.roles.includes(currentUser.role) || currentUser.role === 'Admin' || currentUser.role === 'Manager'
  );

  return (
    <div className="bg-zinc-900 text-zinc-300 flex flex-col w-full md:w-64 md:h-full border-b md:border-b-0 md:border-r border-zinc-800">
      <div className="p-6 flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Bilbao logo"
              className="w-8 h-8 rounded-lg object-contain bg-white"
            />
          ) : (
            <BilbaoLogo />
          )}
        </div>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left",
                isActive 
                  ? "bg-emerald-500/10 text-emerald-400 font-medium" 
                  : "hover:bg-zinc-800 hover:text-white"
              )}
            >
              <Icon size={20} className={isActive ? "text-emerald-400" : "text-zinc-400"} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-4 pb-2">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium",
            realtimeConnected
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-zinc-800 text-zinc-500"
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              realtimeConnected ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
            )}
          />
          {realtimeConnected ? t(lang, "realtime.live") : t(lang, "realtime.connecting")}
        </div>
      </div>
      
      {currentUser && (
        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center justify-between bg-zinc-800/50 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-zinc-300">
                <User size={16} />
              </div>
              <div>
                <div className="text-sm font-medium text-white">{currentUser.name}</div>
                <div className="text-xs text-zinc-400">{currentUser.role}</div>
              </div>
            </div>
            <button 
              onClick={() => setCurrentUser(null)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
