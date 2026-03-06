import React, { useEffect, useRef, useState } from 'react';
import { apiFetch, createAppWebSocket } from '../api';

interface CartItem {
  menu_item_id: number;
  name: string;
  price: number;
  quantity: number;
}

interface CartPreview {
  items: CartItem[];
  total: number;
  tableName?: string;
}

const NAVY = '#0E2A47';
const TERRA = '#C65A2E';
const CREAM = '#F4EFEA';
const CARD_BG = 'rgba(255,255,255,0.06)';

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 18, color: CREAM, opacity: 0.6 }}>
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

export function CustomerDisplay() {
  const [cart, setCart] = useState<CartPreview>({ items: [], total: 0, tableName: '' });
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Load initial state then subscribe to live updates
  useEffect(() => {
    apiFetch('/api/cart-preview')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setCart(data); })
      .catch(() => {});

    const connect = () => {
      const ws = createAppWebSocket();
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'cart_preview' && msg.payload) {
            setCart(msg.payload);
          }
        } catch { /* ignore */ }
      };
    };

    connect();
    return () => wsRef.current?.close();
  }, []);

  const isEmpty = cart.items.length === 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: NAVY,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      userSelect: 'none',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 40px',
        borderBottom: `1px solid rgba(255,255,255,0.08)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Bilbao Brand Mark */}
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: TERRA,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 900, color: CREAM, letterSpacing: -2,
          }}>B</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: CREAM, letterSpacing: 6, textTransform: 'uppercase' }}>
              BILBAO
            </div>
            <div style={{ fontSize: 11, color: TERRA, letterSpacing: 2, fontWeight: 600, textTransform: 'uppercase' }}>
              Point of Sale
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {cart.tableName && (
            <span style={{
              fontSize: 14, fontWeight: 700, color: TERRA,
              background: 'rgba(198,90,46,0.15)',
              border: `1px solid rgba(198,90,46,0.3)`,
              borderRadius: 20, padding: '4px 16px',
            }}>
              {cart.tableName}
            </span>
          )}
          <Clock />
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? '#22c55e' : '#ef4444',
            boxShadow: connected ? '0 0 8px #22c55e' : 'none',
          }} title={connected ? 'Live' : 'Reconnecting…'} />
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px', overflow: 'hidden' }}>
        {isEmpty ? (
          /* Welcome Screen */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              background: `rgba(198,90,46,0.12)`,
              border: `2px solid rgba(198,90,46,0.3)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 56,
            }}>👋</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: CREAM, marginBottom: 12 }}>
                Welcome!
              </div>
              <div style={{ fontSize: 18, color: `${CREAM}80`, fontWeight: 400 }}>
                Your order will appear here as items are added.
              </div>
            </div>
          </div>
        ) : (
          /* Cart View */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: `${CREAM}50`, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20 }}>
              Your Order
            </div>

            {/* Item list */}
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cart.items.map((item, i) => (
                <div key={`${item.menu_item_id}-${i}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: CARD_BG,
                  borderRadius: 16,
                  padding: '18px 24px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  animation: 'fadeSlide 0.25s ease',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: TERRA,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 900, color: CREAM,
                      flexShrink: 0,
                    }}>
                      {item.quantity}
                    </div>
                    <span style={{ fontSize: 20, fontWeight: 600, color: CREAM }}>
                      {item.name}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: CREAM }}>
                      {(item.price * item.quantity).toFixed(2)} <span style={{ fontSize: 14, color: `${CREAM}70`, fontWeight: 600 }}>DH</span>
                    </div>
                    {item.quantity > 1 && (
                      <div style={{ fontSize: 12, color: `${CREAM}50` }}>
                        {item.price.toFixed(2)} DH × {item.quantity}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer — Total */}
      {!isEmpty && (
        <div style={{
          borderTop: `1px solid rgba(255,255,255,0.1)`,
          background: 'rgba(0,0,0,0.25)',
          padding: '28px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: `${CREAM}50`, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
              Total
            </div>
            <div style={{ fontSize: 13, color: `${CREAM}50` }}>
              {cart.items.reduce((s, i) => s + i.quantity, 0)} item{cart.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: CREAM, lineHeight: 1 }}>
              {cart.total.toFixed(2)}
              <span style={{ fontSize: 24, color: TERRA, fontWeight: 700, marginLeft: 8 }}>DH</span>
            </div>
          </div>
        </div>
      )}

      {!isEmpty && (
        <div style={{
          padding: '16px 40px 28px',
          textAlign: 'center',
          fontSize: 14,
          color: `${CREAM}40`,
          fontWeight: 500,
        }}>
          Thank you for choosing Bilbao ✦ Please review your order
        </div>
      )}

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
