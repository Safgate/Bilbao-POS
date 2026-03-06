/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useAppStore } from './store';
import { Sidebar } from './components/Sidebar';
import { POS } from './pages/POS';
import { Dashboard } from './pages/Dashboard';
import { Menu } from './pages/Menu';
import { Tables } from './pages/Tables';
import { Staff } from './pages/Staff';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';
import { Finance } from './pages/Finance';
import { Login } from './pages/Login';
import { PanelLeftOpen } from 'lucide-react';

const MainApp = () => {
  const { currentUser, settings } = useAppStore();
  const [currentTab, setCurrentTab] = useState('pos');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isManagerOrAdmin =
    currentUser?.role === 'Manager' || currentUser?.role === 'Admin';

  // Reset tab and sidebar visibility whenever the logged-in user changes
  React.useEffect(() => {
    if (currentUser) {
      setCurrentTab('pos');
      // Waiters/staff: sidebar always hidden; managers: open by default
      setSidebarOpen(isManagerOrAdmin);
    }
  }, [currentUser?.id]);

  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('dir', settings.language === 'ar' ? 'rtl' : 'ltr');
    root.setAttribute('lang',
      settings.language === 'ar' ? 'ar' : settings.language === 'fr' ? 'fr' : 'en');
  }, [settings.language]);

  if (!currentUser) {
    return <Login />;
  }

  const showSidebar = isManagerOrAdmin && sidebarOpen;

  return (
    <div className="flex h-screen bg-zinc-100 font-sans overflow-hidden flex-col md:flex-row">
      {/* Sidebar — only rendered for managers, and only when open */}
      {showSidebar && (
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onCollapse={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-y-auto relative">
        {/* Re-open button — visible only for managers when sidebar is collapsed */}
        {isManagerOrAdmin && !sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-20 p-2 bg-zinc-900 hover:bg-zinc-700 text-white rounded-xl shadow-lg transition-colors"
            title="Open navigation"
          >
            <PanelLeftOpen size={20} />
          </button>
        )}

        {currentTab === 'pos' && <POS />}
        {currentTab === 'dashboard' && isManagerOrAdmin && <Dashboard />}
        {currentTab === 'menu' && isManagerOrAdmin && <Menu />}
        {currentTab === 'tables' && isManagerOrAdmin && <Tables />}
        {currentTab === 'staff' && isManagerOrAdmin && <Staff />}
        {currentTab === 'reports' && isManagerOrAdmin && <Reports />}
        {currentTab === 'finance' && isManagerOrAdmin && <Finance />}
        {currentTab === 'settings' && isManagerOrAdmin && <Settings />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

