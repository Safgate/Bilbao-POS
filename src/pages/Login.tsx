import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Lock, User } from 'lucide-react';
import { t } from '../i18n';
import { apiFetch } from '../api';

export const Login: React.FC = () => {
  const { staff, setCurrentUser, settings } = useAppStore();
  const lang = settings.language;
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedStaffId) {
      setError(t(lang, 'login.errorUser'));
      return;
    }

    const user = staff.find(s => s.id === selectedStaffId);
    if (!user) {
      setError(t(lang, 'login.errorUser'));
      return;
    }

    if (user.pin === pin) {
      // Auto-open shift on login (idempotent — won't duplicate an already-open shift)
      apiFetch('/api/shifts/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: user.id }),
      }).catch(() => {});
      setCurrentUser(user);
    } else {
      setError(t(lang, 'login.errorPin'));
      setPin('');
    }
  };

  const appendPin = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
    }
  };

  const clearPin = () => {
    setPin('');
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-zinc-200 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">{t(lang, 'login.title')}</h1>
          <p className="text-zinc-500 mt-1">{t(lang, 'login.subtitle')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">{t(lang, 'login.selectUser')}</label>
            <div className="grid grid-cols-2 gap-3">
              {staff.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setSelectedStaffId(user.id);
                    setPin('');
                    setError('');
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    selectedStaffId === user.id 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900' 
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    selectedStaffId === user.id ? 'bg-emerald-200 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    <User size={16} />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-sm">{user.name}</div>
                    <div className="text-xs opacity-70">{user.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedStaffId && (
            <div className="space-y-4">
              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2, 3].map(i => (
                  <div 
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all ${
                      i < pin.length ? 'bg-emerald-500 scale-110' : 'bg-zinc-200'
                    }`}
                  />
                ))}
              </div>

              {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}

              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => appendPin(num.toString())}
                    className="bg-zinc-50 hover:bg-zinc-100 text-zinc-900 text-2xl font-semibold py-4 rounded-2xl transition-colors"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearPin}
                  className="bg-zinc-50 hover:bg-zinc-100 text-zinc-500 font-medium py-4 rounded-2xl transition-colors"
                >
                  {t(lang, 'login.clear')}
                </button>
                <button
                  type="button"
                  onClick={() => appendPin('0')}
                  className="bg-zinc-50 hover:bg-zinc-100 text-zinc-900 text-2xl font-semibold py-4 rounded-2xl transition-colors"
                >
                  0
                </button>
                <button
                  type="submit"
                  disabled={pin.length !== 4}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-200 disabled:text-zinc-400 text-white font-bold py-4 rounded-2xl transition-colors"
                >
                  {t(lang, 'login.go')}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
