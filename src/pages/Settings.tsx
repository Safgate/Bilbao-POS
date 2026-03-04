import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import { Settings as SettingsIcon, Lock, Globe, Printer, Image, Smartphone, Copy, Check, BellRing } from 'lucide-react';
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
