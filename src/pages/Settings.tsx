import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { t } from '../i18n';
import type { Lang } from '../i18n';
import { Settings as SettingsIcon, Lock, Globe, Printer, Image, Save } from 'lucide-react';
import { apiFetch, getApiBaseUrl } from '../api';

export const Settings: React.FC = () => {
  const { settings, setSettings, staff, fetchSettings } = useAppStore();
  const [editingPinFor, setEditingPinFor] = useState<number | null>(null);
  const [newPin, setNewPin] = useState('');
  const [printers, setPrinters] = useState<Array<{ name: string; displayName?: string }>>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const lang = settings.language;

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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
