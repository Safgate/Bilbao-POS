import React, { useState } from 'react';
import { setServerUrl, apiFetch } from '../api';

export function SetupPage({ onConnect }: { onConnect: () => void }) {
  const [ip, setIp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    const trimmed = ip.trim();
    if (!trimmed) return;
    // Build a valid URL:
    //  "192.168.2.3"       → http://192.168.2.3:3000
    //  "192.168.2.3:3000"  → http://192.168.2.3:3000  (don't double-add port)
    //  "http://..."        → use as-is
    let url: string;
    if (trimmed.startsWith('http')) {
      url = trimmed;
    } else if (trimmed.includes(':')) {
      url = `http://${trimmed}`;           // port already present
    } else {
      url = `http://${trimmed}:3000`;      // default port
    }
    setLoading(true);
    setError('');
    try {
      setServerUrl(url);
      const res = await apiFetch('/api/network-info');
      if (!res.ok) throw new Error('Server not reachable');
      onConnect();
    } catch {
      setError('Could not connect. Make sure you are on the same WiFi and the POS desktop app is running.');
      setServerUrl('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.screen}>
      {/* Logo */}
      <div style={styles.logoWrap}>
        <svg viewBox="0 0 120 120" width="72" height="72">
          <circle cx="60" cy="60" r="58" fill="#F4EFEA" />
          <rect x="27" y="20" width="6" height="80" rx="3" fill="#C65A2E" />
          <rect x="19" y="20" width="5" height="24" rx="2.5" fill="#C65A2E" />
          <rect x="36" y="20" width="5" height="24" rx="2.5" fill="#C65A2E" />
          <path d="M 33 24 C 58 14,96 20,100 40 C 104 54,90 64,33 63 Z" fill="#C65A2E" />
          <path d="M 38 31 C 60 22,90 28,92 42 C 94 54,80 58,38 57 Z" fill="#F4EFEA" />
          <path d="M 33 65 C 66 58,100 66,104 80 C 108 93,88 106,33 100 Z" fill="#0E2A47" />
          <path d="M 42 73 C 56 69,72 73,87 70" stroke="#F4EFEA" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.65" />
          <path d="M 41 82 C 55 78,72 82,88 79" stroke="#F4EFEA" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.42" />
          <path d="M 41 91 C 56 87,73 91,89 88" stroke="#F4EFEA" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.22" />
        </svg>
        <h1 style={styles.appName}>BILBAO POS</h1>
        <p style={styles.tagline}>Enter the server address to connect</p>
      </div>

      {/* Card */}
      <div style={styles.card}>
        <label style={styles.label}>Desktop IP Address</label>
        <input
          style={styles.input}
          type="text"
          placeholder="e.g.  192.168.2.3  or  192.168.2.3:3000"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        {error && <p style={styles.error}>{error}</p>}
        <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} onClick={handleConnect} disabled={loading}>
          {loading ? 'Connecting…' : 'Connect'}
        </button>
      </div>

      <p style={styles.hint}>
        Find the IP in the desktop app under <strong>Settings → Mobile Access</strong>
      </p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  screen: { minHeight: '100svh', background: '#0E2A47', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 32 },
  logoWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  appName: { color: '#F4EFEA', fontSize: 26, fontWeight: 800, letterSpacing: '0.18em' },
  tagline: { color: '#7fa8c9', fontSize: 14 },
  card: { background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: { border: '1.5px solid #d1d5db', borderRadius: 12, padding: '14px 16px', fontSize: 16, outline: 'none', width: '100%' },
  btn: { background: '#C65A2E', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
  error: { color: '#dc2626', fontSize: 13, lineHeight: 1.4 },
  hint: { color: '#7fa8c9', fontSize: 13, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 },
};
