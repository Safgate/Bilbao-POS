import React, { useState, useEffect } from 'react';
import { apiJson, apiFetch, setServerUrl } from '../api';
import type { Staff } from '../App';

interface StaffMember { id: number; name: string; role: string }

export function LoginPage({ onLogin, onDisconnect }: { onLogin: (s: Staff) => void; onDisconnect: () => void }) {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiJson<StaffMember[]>('/api/staff').then(setStaffList).catch(() => setError('Cannot reach server'));
  }, []);

  const handlePinKey = (key: string) => {
    if (key === 'del') { setPin(p => p.slice(0, -1)); return; }
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) submitPin(next);
  };

  const submitPin = async (p: string) => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiJson<{ success: boolean; staff?: StaffMember }>('/api/staff/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, pin: p }),
      });
      if (res.success && res.staff) {
        // Auto-open shift on login (idempotent — won't duplicate an already-open shift)
        apiFetch('/api/shifts/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staff_id: res.staff.id }),
        }).catch(() => {});
        onLogin(res.staff);
      } else {
        setError('Wrong PIN');
        setPin('');
      }
    } catch {
      setError('Connection error');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <h1 style={styles.title}>BILBAO POS</h1>
        <button style={styles.disconnectBtn} onClick={() => { setServerUrl(''); onDisconnect(); }}>
          Change Server
        </button>
      </div>

      {!selected ? (
        <div style={styles.content}>
          <p style={styles.subtitle}>Who's logging in?</p>
          <div style={styles.staffGrid}>
            {staffList.map(s => (
              <button key={s.id} style={styles.staffCard} onClick={() => { setSelected(s); setPin(''); setError(''); }}>
                <div style={styles.avatar}>{s.name[0].toUpperCase()}</div>
                <span style={styles.staffName}>{s.name}</span>
                <span style={styles.staffRole}>{s.role}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={styles.content}>
          <button style={styles.backBtn} onClick={() => { setSelected(null); setPin(''); setError(''); }}>← Back</button>
          <div style={styles.avatar2}>{selected.name[0].toUpperCase()}</div>
          <p style={styles.subtitle}>Enter PIN for <strong>{selected.name}</strong></p>

          {/* PIN dots */}
          <div style={styles.dots}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ ...styles.dot, background: i < pin.length ? '#C65A2E' : '#d1d5db' }} />
            ))}
          </div>

          {error && <p style={styles.error}>{error}</p>}

          {/* Number pad */}
          <div style={styles.numpad}>
            {['1','2','3','4','5','6','7','8','9','','0','del'].map((k, i) => (
              <button
                key={i}
                style={{ ...styles.numKey, ...(k === '' ? styles.numKeyEmpty : {}), opacity: loading ? 0.5 : 1 }}
                onClick={() => k && handlePinKey(k)}
                disabled={!k || loading}
              >
                {k === 'del' ? '⌫' : k}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  screen: { minHeight: '100svh', background: '#0E2A47', display: 'flex', flexDirection: 'column' },
  header: { padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#F4EFEA', fontSize: 20, fontWeight: 800, letterSpacing: '0.16em' },
  disconnectBtn: { background: 'transparent', border: '1px solid #3a6080', color: '#7fa8c9', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  content: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 24px 32px', gap: 16 },
  subtitle: { color: '#F4EFEA', fontSize: 18, fontWeight: 600, textAlign: 'center' },
  staffGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, width: '100%', maxWidth: 380 },
  staffCard: { background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '20px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' },
  avatar: { width: 52, height: 52, borderRadius: '50%', background: '#C65A2E', color: '#fff', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  staffName: { color: '#F4EFEA', fontSize: 15, fontWeight: 600 },
  staffRole: { color: '#7fa8c9', fontSize: 12 },
  backBtn: { alignSelf: 'flex-start', background: 'transparent', border: 'none', color: '#7fa8c9', fontSize: 15, cursor: 'pointer', padding: '4px 0' },
  avatar2: { width: 64, height: 64, borderRadius: '50%', background: '#C65A2E', color: '#fff', fontSize: 26, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dots: { display: 'flex', gap: 16, marginTop: 8 },
  dot: { width: 18, height: 18, borderRadius: '50%', transition: 'background 0.15s' },
  error: { color: '#fca5a5', fontSize: 14 },
  numpad: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 300, marginTop: 8 },
  numKey: { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 14, height: 68, fontSize: 24, fontWeight: 600, color: '#F4EFEA', cursor: 'pointer' },
  numKeyEmpty: { background: 'transparent', cursor: 'default' },
};
