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
import { Login } from './pages/Login';

const MainApp = () => {
  const { currentUser, settings } = useAppStore();
  const [currentTab, setCurrentTab] = useState('pos');

  React.useEffect(() => {
    if (currentUser) {
      setCurrentTab('pos');
    }
  }, [currentUser]);

  React.useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('dir', settings.language === 'ar' ? 'rtl' : 'ltr');
    root.setAttribute('lang', settings.language === 'ar' ? 'ar' : settings.language === 'fr' ? 'fr' : 'en');
  }, [settings.language]);

  if (!currentUser) {
    return <Login />;
  }

  const isManagerOrAdmin = currentUser.role === 'Manager' || currentUser.role === 'Admin';

  return (
    <div className="flex h-screen bg-zinc-100 font-sans overflow-hidden flex-col md:flex-row">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <main className="flex-1 overflow-y-auto">
        {currentTab === 'pos' && <POS />}
        {currentTab === 'dashboard' && isManagerOrAdmin && <Dashboard />}
        {currentTab === 'menu' && isManagerOrAdmin && <Menu />}
        {currentTab === 'tables' && isManagerOrAdmin && <Tables />}
        {currentTab === 'staff' && isManagerOrAdmin && <Staff />}
        {currentTab === 'reports' && isManagerOrAdmin && <Reports />}
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

