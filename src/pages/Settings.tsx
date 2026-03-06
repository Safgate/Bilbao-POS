import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import { Settings as SettingsIcon, Lock, Globe, Printer, Image, Smartphone, Copy, Check, BellRing, QrCode } from 'lucide-react';
import { apiFetch, getApiBaseUrl } from '../api';
import { QRCodeSVG } from 'qrcode.react';

export const Settings: React.FC = () => {
  const { settings, setSettings, staff, fetchSettings } = useAppStore();
  const [editingPinFor, setEditingPinFor] = useState<number | null>(null);
  const [newPin, setNewPin] = useState('');
  const [printers, setPrinters] = useState<Array<{ name: string; displayName?: string }>>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [localIp, setLocalIp] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const lang = settings.language;
  const mobileUrl = localIp ? `http://${localIp}:3000/mobile` : '';
  const orderUrl  = localIp ? `http://${localIp}:3000/order`  : '';
  const [copiedOrder, setCopiedOrder] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const fetchIp = async () => {
      if (window.electronAPI?.getLocalIp) {
        const ip = await window.electronAPI.getLocalIp();
        setLocalIp(ip);
      }
    };
    fetchIp();
  }, []);

  const handleCopyUrl = () => {
    if (!mobileUrl) return;
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const loadPrinters = async () => {
      if (!window.electronAPI?.listPrinters) return;
      try {
        const list = await window.electronAPI.listPrinters();
        setPrinters((list || []).map((p: any) => ({ name: p.name, displayName: p.displayName || p.name })));
      } catch {
        // ignore
      }
    };
    loadPrinters();
  }, []);

  const handleSavePin = async (staffId: number) => {
    if (newPin.length !== 4) return;
    setSaving(true);
    try {
      await apiFetch(`/api/staff/${staffId}/pin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      });
      setEditingPinFor(null);
      setNewPin('');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      if (!base64) return;
      try {
        const res = await apiFetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, filename: file.name }),
        });
        const data = await res.json();
        if (data.url) {
          const base = getApiBaseUrl();
          await setSettings({ logoUrl: base + data.url });
        }
      } catch (err) {
        console.error('Logo upload failed', err);
      }
      setLogoFile(null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
          <SettingsIcon size={28} />
          {t(lang, 'settings.title')}
        </h1>
        <p className="text-zinc-500 mt-1">{t(lang, 'settings.subtitle')}</p>
      </div>

      {/* Language */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
        <h2 className="text-lg font-bold text-zinc-900 mb-2 flex items-center gap-2">
          <Globe size={20} className="text-emerald-600" />
          {t(lang, 'settings.language')}
        </h2>
        <div className="flex gap-3 flex-wrap">
          {(['en', 'fr', 'ar'] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setSettings({ language: l })}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                settings.language === l
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {l === 'en' ? 'English' : l === 'ar' ? 'العربية' : 'Français'}
            </button>
          ))}
        </div>
      </div>

      {/* Printer */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
        <h2 className="text-lg font-bold text-zinc-900 mb-2 flex items-center gap-2">
          <Printer size={20} className="text-emerald-600" />
          {t(lang, 'settings.printer')}
        </h2>
        <p className="text-sm text-zinc-500 mb-3">{t(lang, 'settings.printerDesc')}</p>
        <select
          value={settings.printer}
          onChange={(e) => setSettings({ printer: e.target.value })}
          className="w-full max-w-md bg-zinc-50 border border-zinc-300 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">{t(lang, 'settings.printerDefault')}</option>
          {printers.map((p) => (
            <option key={p.name} value={p.name}>
              {p.displayName || p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Logo */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
        <h2 className="text-lg font-bold text-zinc-900 mb-2 flex items-center gap-2">
          <Image size={20} className="text-emerald-600" />
          {t(lang, 'settings.logo')}
        </h2>
        <p className="text-sm text-zinc-500 mb-3">{t(lang, 'settings.logoDesc')}</p>
        <div className="flex items-center gap-4 flex-wrap">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl.startsWith('http') || settings.logoUrl.startsWith('data:') ? settings.logoUrl : getApiBaseUrl() + settings.logoUrl}
              alt="Logo"
              className="w-24 h-24 object-contain rounded-xl border border-zinc-200"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center text-zinc-400 text-sm">
              No logo
            </div>
          )}
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
              disabled={!!logoFile}
            />
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600">
              {logoFile ? '...' : t(lang, 'settings.uploadLogo')}
            </span>
          </label>
        </div>
      </div>

      {/* Auto-print mobile orders */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
        <h2 className="text-lg font-bold text-zinc-900 mb-2 flex items-center gap-2">
          <BellRing size={20} className="text-emerald-600" />
          Mobile Order Printing
        </h2>
        <p className="text-sm text-zinc-500 mb-4">
          Automatically print a receipt on this desktop whenever an order is placed from a mobile device.
        </p>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setSettings({ autoPrintMobile: !settings.autoPrintMobile })}
            className={`relative w-12 h-6 rounded-full transition-colors ${settings.autoPrintMobile ? 'bg-emerald-500' : 'bg-zinc-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.autoPrintMobile ? 'translate-x-7' : 'translate-x-1'}`} />
          </div>
          <span className="font-medium text-zinc-700">
            {settings.autoPrintMobile ? 'Auto-print enabled' : 'Auto-print disabled'}
          </span>
        </label>
      </div>

      {/* Receipt layout */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
        <h2 className="text-lg font-bold text-zinc-900 mb-2 flex items-center gap-2">
          <Printer size={20} className="text-emerald-600" />
          Receipt layout
        </h2>
        <p className="text-sm text-zinc-500 mb-4">
          Customize what appears on printed tickets: business name, header, footer and currency.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                Business name
              </label>
              <input
                type="text"
                value={settings.receiptBusinessName}
                onChange={(e) => setSettings({ receiptBusinessName: e.target.value })}
                className="w-full max-w-md bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                Header lines
              </label>
              <textarea
                rows={3}
                value={settings.receiptHeader}
                onChange={(e) => setSettings({ receiptHeader: e.target.value })}
                className="w-full max-w-md bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="Address, phone, tax ID..."
              />
              <p className="text-xs text-zinc-400 mt-1">
                Shown under the business name (one line per row).
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                  Footer lines
                </label>
                <textarea
                  rows={3}
                  value={settings.receiptFooter}
                  onChange={(e) => setSettings({ receiptFooter: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Thank you message, website, socials..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={settings.receiptCurrency}
                    onChange={(e) => setSettings({ receiptCurrency: e.target.value })}
                    className="w-24 bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                    Wi‑Fi on receipt
                  </label>
                  <input
                    type="text"
                    value={settings.receiptWifiSsid}
                    onChange={(e) => setSettings({ receiptWifiSsid: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 mb-2"
                    placeholder="Network name (SSID)"
                  />
                  <input
                    type="text"
                    value={settings.receiptWifiPassword}
                    onChange={(e) => setSettings({ receiptWifiPassword: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Password"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                Display options
              </label>
              <div className="space-y-2 mt-1">
                <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={settings.receiptShowTable}
                    onChange={(e) => setSettings({ receiptShowTable: e.target.checked })}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Show table name</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={settings.receiptShowStaff}
                    onChange={(e) => setSettings({ receiptShowStaff: e.target.checked })}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Show staff name</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={settings.receiptShowWifi}
                    onChange={(e) => setSettings({ receiptShowWifi: e.target.checked })}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Show Wi‑Fi block</span>
                </label>
              </div>
            </div>

            {/* Tiny visual preview */}
            <div>
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                Preview
              </div>
              <div className="bg-zinc-50 border border-dashed border-zinc-300 rounded-xl p-3 text-[11px] font-mono text-zinc-800 w-48">
                <div className="text-center font-bold">
                  {settings.receiptBusinessName || 'Bilbao Coffee'}
                </div>
                {settings.receiptHeader
                  .split('\n')
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((line, idx) => (
                    <div key={idx} className="text-center">
                      {line}
                    </div>
                  ))}
                <div className="mt-1 text-center text-zinc-500">
                  Order #123 · 01/01 12:34
                </div>
                {settings.receiptShowTable && (
                  <div className="mt-1 text-center font-semibold">Table 1</div>
                )}
                {settings.receiptShowStaff && (
                  <div className="text-center text-zinc-500 text-[10px]">Alice</div>
                )}
                <div className="mt-2 border-t border-dashed border-zinc-400 pt-1">
                  <div className="flex justify-between items-end">
                    <span>2x Latte</span>
                    <span>
                      40.00 {settings.receiptCurrency || 'DH'}
                    </span>
                  </div>
                </div>
                <div className="mt-1 border-t border-dashed border-zinc-400 pt-1 flex justify-between items-end font-bold">
                  <span>TOTAL</span>
                  <span className="pl-1">
                    40.00 {settings.receiptCurrency || 'DH'}
                  </span>
                </div>
                {settings.receiptShowWifi && (settings.receiptWifiSsid || settings.receiptWifiPassword) && (
                  <div className="mt-2 text-center text-zinc-500">
                    {settings.receiptWifiSsid && <div>Wi‑Fi: {settings.receiptWifiSsid}</div>}
                    {settings.receiptWifiPassword && <div>Password: {settings.receiptWifiPassword}</div>}
                  </div>
                )}
                <div className="mt-3 border-t border-dashed border-zinc-300 pt-1 text-center text-zinc-500">
                  {(settings.receiptFooter || 'Thank you for your visit!')
                    .split('\n')
                    .filter(Boolean)[0] || 'Thank you for your visit!'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Access */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
        <h2 className="text-lg font-bold text-zinc-900 mb-2 flex items-center gap-2">
          <Smartphone size={20} className="text-emerald-600" />
          Mobile Access
        </h2>
        <p className="text-sm text-zinc-500 mb-4">
          Scan the QR code or open the URL on any phone or tablet connected to the same WiFi network.
        </p>

        {localIp ? (
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* QR Code */}
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex flex-col items-center gap-2">
              <QRCodeSVG
                value={mobileUrl}
                size={160}
                bgColor="#fafafa"
                fgColor="#0E2A47"
                level="M"
              />
              <span className="text-xs text-zinc-400">Scan to open</span>
            </div>

            {/* URL + instructions */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Mobile URL</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-mono text-zinc-800 break-all">
                    {mobileUrl}
                  </code>
                  <button
                    onClick={handleCopyUrl}
                    className="p-3 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors flex-shrink-0"
                    title="Copy URL"
                  >
                    {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-zinc-600" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-zinc-600">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                  <span>Make sure your phone is on the <strong>same WiFi</strong> as this computer.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                  <span>Scan the QR code or type the URL into your phone's browser.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                  <span>Log in with your staff PIN — managers get full access, staff get the order view.</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Server running on <strong className="text-zinc-600">{localIp}:3000</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-zinc-400 text-sm py-4">
            <div className="w-2 h-2 bg-zinc-300 rounded-full animate-pulse" />
            Detecting local IP address...
          </div>
        )}
      </div>

      {/* Customer Self-Ordering */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
        <h2 className="text-lg font-bold text-zinc-900 mb-2 flex items-center gap-2">
          <QrCode size={20} className="text-emerald-600" />
          Customer Self-Ordering
        </h2>
        <p className="text-sm text-zinc-500 mb-4">
          Customers scan this QR code with their phone to browse the menu and place orders directly from their table — no app download needed.
        </p>

        {localIp ? (
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex flex-col items-center gap-2">
              <QRCodeSVG
                value={orderUrl}
                size={160}
                bgColor="#fafafa"
                fgColor="#0E2A47"
                level="M"
              />
              <span className="text-xs text-zinc-400">Customer menu</span>
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Customer Order URL</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-mono text-zinc-800 break-all">
                    {orderUrl}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(orderUrl); setCopiedOrder(true); setTimeout(() => setCopiedOrder(false), 2000); }}
                    className="p-3 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors flex-shrink-0"
                    title="Copy URL"
                  >
                    {copiedOrder ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} className="text-zinc-600" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-zinc-600">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-[#C65A2E]/10 text-[#C65A2E] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                  <span>Print or display this QR code on each table.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-[#C65A2E]/10 text-[#C65A2E] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                  <span>Customers scan it, browse the menu, and tap <strong>Place Order</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-[#C65A2E]/10 text-[#C65A2E] rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                  <span>The order appears instantly in your POS active orders.</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                <strong>Tip:</strong> Requires the app to be running and the customer's phone to be on the same WiFi network.
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-zinc-400 text-sm py-4">
            <div className="w-2 h-2 bg-zinc-300 rounded-full animate-pulse" />
            Detecting local IP address…
          </div>
        )}
      </div>

      {/* PINs */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
        <h2 className="text-lg font-bold text-zinc-900 mb-2 flex items-center gap-2">
          <Lock size={20} className="text-emerald-600" />
          {t(lang, 'settings.pins')}
        </h2>
        <p className="text-sm text-zinc-500 mb-4">{t(lang, 'settings.pinsDesc')}</p>
        <div className="space-y-3">
          {staff.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100"
            >
              <div>
                <span className="font-medium text-zinc-900">{s.name}</span>
                <span className="text-zinc-500 text-sm ml-2">({s.role})</span>
              </div>
              {editingPinFor === s.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    className="w-24 px-2 py-1 border border-zinc-300 rounded-lg text-center"
                    placeholder="••••"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSavePin(s.id)}
                    disabled={newPin.length !== 4 || saving}
                    className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {t(lang, 'settings.save')}
                  </button>
                  <button
                    onClick={() => { setEditingPinFor(null); setNewPin(''); }}
                    className="px-3 py-1 bg-zinc-200 text-zinc-700 rounded-lg text-sm"
                  >
                    {t(lang, 'menu.cancel')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingPinFor(s.id)}
                  className="text-sm text-emerald-600 font-medium hover:underline"
                >
                  {t(lang, 'settings.changePin')}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
