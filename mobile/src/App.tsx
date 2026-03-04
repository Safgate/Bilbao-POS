import React, { useState, useEffect } from 'react';
import { SetupPage } from './pages/SetupPage';
import { LoginPage } from './pages/LoginPage';
import { ManagerApp } from './pages/ManagerApp';
import { WaiterApp } from './pages/WaiterApp';
import { getServerUrl } from './api';

export type Staff = { id: number; name: string; role: string };

export function App() {
  const [serverReady, setServerReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);

  // Check if server URL is already configured
  useEffect(() => {
    if (getServerUrl()) setServerReady(true);
  }, []);

  if (!serverReady) {
    return <SetupPage onConnect={() => setServerReady(true)} />;
  }

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} onDisconnect={() => setServerReady(false)} />;
  }

  const isManager = currentUser.role === 'Manager' || currentUser.role === 'Admin';
  return isManager
    ? <ManagerApp user={currentUser} onLogout={() => setCurrentUser(null)} />
    : <WaiterApp user={currentUser} onLogout={() => setCurrentUser(null)} />;
}
