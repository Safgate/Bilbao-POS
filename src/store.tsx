import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Category, MenuItem, Table, Order, Staff, Shift } from './types';
import { apiFetch, createAppWebSocket, getApiBaseUrl } from './api';
import type { Lang } from './i18n';
import { printReceipt } from './utils/print';

export interface AppSettings {
  language: Lang;
  printer: string;
  logoUrl: string;
  autoPrintMobile: boolean;
  /** Display name at the top of printed receipts */
  receiptBusinessName: string;
  /** Multiline header text (address, phone, tax ID, etc.) */
  receiptHeader: string;
  /** Multiline footer text (thanks message, Wi‑Fi, socials, etc.) */
  receiptFooter: string;
  /** Currency code/symbol used on receipts (e.g. DH, MAD, €, $) */
  receiptCurrency: string;
  /** Whether to show the table name on receipts */
  receiptShowTable: boolean;
  /** Whether to show the staff member name on receipts */
  receiptShowStaff: boolean;
  /** Optional Wi‑Fi network name to print on receipts */
  receiptWifiSsid: string;
  /** Optional Wi‑Fi password to print on receipts */
  receiptWifiPassword: string;
  /** Whether to include the Wi‑Fi block on receipts */
  receiptShowWifi: boolean;
}

const defaultSettings: AppSettings = {
  language: 'en',
  printer: '',
  logoUrl: '',
  autoPrintMobile: true,
  receiptBusinessName: 'Bilbao Coffee',
  receiptHeader: '',
  receiptFooter: 'Thank you for your visit!',
  receiptCurrency: 'DH',
  receiptShowTable: true,
  receiptShowStaff: true,
  receiptWifiSsid: '',
  receiptWifiPassword: '',
  receiptShowWifi: false,
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
  const settingsRef = useRef<AppSettings>(defaultSettings);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Keep a ref in sync so the WS callback always sees fresh settings
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch('/api/settings');
      const raw = await res.json();
      setSettingsState({
        ...defaultSettings,
        language: (raw.language as Lang) || defaultSettings.language,
        printer: raw.printer || defaultSettings.printer,
        logoUrl: raw.logo_url || defaultSettings.logoUrl,
        autoPrintMobile: raw.auto_print_mobile !== 'false',
        receiptBusinessName: raw.receipt_business_name || defaultSettings.receiptBusinessName,
        receiptHeader: raw.receipt_header || defaultSettings.receiptHeader,
        receiptFooter: raw.receipt_footer || defaultSettings.receiptFooter,
        receiptCurrency: raw.receipt_currency || defaultSettings.receiptCurrency,
        receiptShowTable: raw.receipt_show_table !== 'false',
        receiptShowStaff: raw.receipt_show_staff !== 'false',
        receiptWifiSsid: raw.receipt_wifi_ssid || defaultSettings.receiptWifiSsid,
        receiptWifiPassword: raw.receipt_wifi_password || defaultSettings.receiptWifiPassword,
        receiptShowWifi: raw.receipt_show_wifi === 'true',
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
        auto_print_mobile: String(next.autoPrintMobile),
        receipt_business_name: next.receiptBusinessName,
        receipt_header: next.receiptHeader,
        receipt_footer: next.receiptFooter,
        receipt_currency: next.receiptCurrency,
        receipt_show_table: String(next.receiptShowTable),
        receipt_show_staff: String(next.receiptShowStaff),
        receipt_wifi_ssid: next.receiptWifiSsid,
        receipt_wifi_password: next.receiptWifiPassword,
        receipt_show_wifi: String(next.receiptShowWifi),
      }),
    });
  };

  const fetchCategories = async () => {
    try {
      const res = await apiFetch('/api/categories');
      if (!res.ok) return;
      setCategories(await res.json());
    } catch { /* backend not ready yet */ }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await apiFetch('/api/menu-items');
      if (!res.ok) return;
      setMenuItems(await res.json());
    } catch { /* backend not ready yet */ }
  };

  const fetchTables = async () => {
    try {
      const res = await apiFetch('/api/tables');
      if (!res.ok) return;
      setTables(await res.json());
    } catch { /* backend not ready yet */ }
  };

  const fetchActiveOrders = async () => {
    try {
      const res = await apiFetch('/api/orders/active');
      if (!res.ok) return;
      setActiveOrders(await res.json());
    } catch { /* backend not ready yet */ }
  };

  const fetchStaff = async () => {
    try {
      const res = await apiFetch('/api/staff');
      if (!res.ok) return;
      setStaff(await res.json());
    } catch { /* backend not ready yet */ }
  };

  const fetchShifts = async () => {
    try {
      const res = await apiFetch('/api/shifts');
      if (!res.ok) return;
      setShifts(await res.json());
    } catch { /* backend not ready yet */ }
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
        let data: { type: string; payload?: any };
        try {
          data = JSON.parse(event.data);
          if (typeof data?.type !== 'string') return;
        } catch {
          return;
        }
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
          case 'new_order': {
            // Auto-print receipt for orders placed from mobile devices
            const s = settingsRef.current;
            if (s.autoPrintMobile && data.payload) {
              const logoUrl = s.logoUrl
                ? (s.logoUrl.startsWith('http') || s.logoUrl.startsWith('data:')
                    ? s.logoUrl
                    : getApiBaseUrl() + s.logoUrl)
                : undefined;
              printReceipt(data.payload, {
                printerName: s.printer || undefined,
                logoUrl,
                businessName: s.receiptBusinessName,
                headerText: s.receiptHeader,
                footerText: s.receiptFooter,
                currency: s.receiptCurrency,
                showTable: s.receiptShowTable,
                showStaff: s.receiptShowStaff,
                wifiSsid: s.receiptWifiSsid,
                wifiPassword: s.receiptWifiPassword,
                showWifi: s.receiptShowWifi,
              });
            }
            fetchActiveOrders();
            break;
          }
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
