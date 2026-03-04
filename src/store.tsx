import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Category, MenuItem, Table, Order, Staff, Shift } from './types';
import { apiFetch, createAppWebSocket } from './api';
import type { Lang } from './i18n';

export interface AppSettings {
  language: Lang;
  printer: string;
  logoUrl: string;
}

const defaultSettings: AppSettings = {
  language: 'en',
  printer: '',
  logoUrl: '',
};

interface AppState {
  categories: Category[];
  menuItems: MenuItem[];
  tables: Table[];
  activeOrders: Order[];
  staff: Staff[];
  shifts: Shift[];
  currentUser: Staff | null;
  setCurrentUser: (user: Staff | null) => void;
  refreshData: () => void;
  settings: AppSettings;
  setSettings: (s: Partial<AppSettings>) => void;
  fetchSettings: () => Promise<void>;
  /** True when WebSocket is connected for real-time updates */
  realtimeConnected: boolean;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  const [settings, setSettingsState] = useState<AppSettings>(defaultSettings);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch('/api/settings');
      const raw = await res.json();
      setSettingsState({
        language: (raw.language as Lang) || 'en',
        printer: raw.printer || '',
        logoUrl: raw.logo_url || '',
      });
    } catch {
      setSettingsState(defaultSettings);
    }
  };

  const setSettings = async (s: Partial<AppSettings>) => {
    const next = { ...settings, ...s };
    setSettingsState(next);
    await apiFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: next.language,
        printer: next.printer,
        logo_url: next.logoUrl || undefined,
      }),
    });
  };

  const fetchCategories = async () => {
    const res = await apiFetch('/api/categories');
    setCategories(await res.json());
  };

  const fetchMenuItems = async () => {
    const res = await apiFetch('/api/menu-items');
    setMenuItems(await res.json());
  };

  const fetchTables = async () => {
    const res = await apiFetch('/api/tables');
    setTables(await res.json());
  };

  const fetchActiveOrders = async () => {
    const res = await apiFetch('/api/orders/active');
    setActiveOrders(await res.json());
  };

  const fetchStaff = async () => {
    const res = await apiFetch('/api/staff');
    setStaff(await res.json());
  };

  const fetchShifts = async () => {
    const res = await apiFetch('/api/shifts');
    setShifts(await res.json());
  };

  const refreshData = () => {
    fetchCategories();
    fetchMenuItems();
    fetchTables();
    fetchActiveOrders();
    fetchStaff();
    fetchShifts();
    fetchSettings();
  };

  useEffect(() => {
    refreshData();

    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = createAppWebSocket();

      ws.onopen = () => {
        setRealtimeConnected(true);
        console.log('[Bilbao POS] Real-time updates connected');
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onclose = () => {
        setRealtimeConnected(false);
        console.log('WebSocket disconnected, reconnecting in 3s...');
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'categories_updated':
            fetchCategories();
            break;
          case 'menu_updated':
            fetchMenuItems();
            break;
          case 'tables_updated':
            fetchTables();
            break;
          case 'orders_updated':
            fetchActiveOrders();
            break;
          case 'staff_updated':
            fetchStaff();
            break;
          case 'shifts_updated':
            fetchShifts();
            break;
          case 'settings_updated':
            fetchSettings();
            break;
        }
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  return (
    <AppContext.Provider value={{ categories, menuItems, tables, activeOrders, staff, shifts, currentUser, setCurrentUser, refreshData, settings, setSettings, fetchSettings, realtimeConnected }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
