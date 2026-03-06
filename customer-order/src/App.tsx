import React, { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Category { id: number; name: string }
interface MenuItem  { id: number; name: string; price: number; category_id: number; image_url?: string }
interface Table     { id: number; name: string; status: string }
interface CartItem  { item: MenuItem; qty: number }

type Screen = 'menu' | 'cart' | 'confirm';

// ─── Brand colours ────────────────────────────────────────────────────────────
const C = {
  navy:   '#0E2A47',
  terra:  '#C65A2E',
  cream:  '#F4EFEA',
  bg:     '#F8F8F6',
  card:   '#FFFFFF',
  border: '#E5E7EB',
  muted:  '#9CA3AF',
  text:   '#111827',
};

// ─── API helpers ──────────────────────────────────────────────────────────────
// When served from Express at /order/*, all API paths are relative to the origin.
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Small helper components ──────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: `3px solid ${C.border}`,
        borderTopColor: C.terra,
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span style={{
      position: 'absolute', top: -6, right: -6,
      background: C.terra, color: '#fff',
      borderRadius: '50%', width: 20, height: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 800, lineHeight: 1,
    }}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export function App() {
  const [screen, setScreen]         = useState<Screen>('menu');
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems]           = useState<MenuItem[]>([]);
  const [tables, setTables]         = useState<Table[]>([]);
  const [activeCat, setActiveCat]   = useState<number | null>(null);
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [tableId, setTableId]       = useState<number | ''>('');
  const [note, setNote]             = useState('');
  const [loading, setLoading]       = useState(true);
  const [placing, setPlacing]       = useState(false);
  const [orderId, setOrderId]       = useState<number | null>(null);
  const [error, setError]           = useState('');
  const catRowRef = useRef<HTMLDivElement>(null);

  // Load menu data
  const load = useCallback(async () => {
    try {
      const [cats, menuItems, tbls] = await Promise.all([
        api<Category[]>('/api/categories'),
        api<MenuItem[]>('/api/menu-items'),
        api<Table[]>('/api/tables'),
      ]);
      setCategories(cats);
      setItems(menuItems);
      setTables(tbls);
      if (cats.length > 0) setActiveCat(null); // "All" by default
    } catch {
      setError('Unable to load menu. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Scroll active category chip into view
  useEffect(() => {
    const el = catRowRef.current?.querySelector('[data-active="true"]') as HTMLElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeCat]);

  // Cart helpers
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { item, qty: 1 }];
    });
  };

  const updateQty = (itemId: number, delta: number) => {
    setCart(prev =>
      prev.map(c => c.item.id === itemId ? { ...c, qty: c.qty + delta } : c)
          .filter(c => c.qty > 0)
    );
  };

  const removeFromCart = (itemId: number) => setCart(prev => prev.filter(c => c.item.id !== itemId));

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const cartTotal = cart.reduce((s, c) => s + c.item.price * c.qty, 0);
  const qtyOf = (itemId: number) => cart.find(c => c.item.id === itemId)?.qty ?? 0;

  const filteredItems = activeCat === null ? items : items.filter(i => i.category_id === activeCat);

  // Place order
  const placeOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    setError('');
    try {
      const res = await api<{ id: number }>('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: tableId || null,
          items: cart.map(c => ({
            menu_item_id: c.item.id,
            name: c.item.name,
            quantity: c.qty,
            price: c.item.price,
          })),
          total: cartTotal,
          note,
        }),
      });
      setOrderId(res.id);
      setCart([]);
      setTableId('');
      setNote('');
      setScreen('confirm');
    } catch {
      setError('Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: C.navy, letterSpacing: 6, marginBottom: 24 }}>BILBAO</div>
        <Spinner />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', gap: 16 }}>
        <div style={{ fontSize: 48 }}>😕</div>
        <p style={{ color: C.text, fontWeight: 600 }}>{error}</p>
        <button onClick={load} style={btnStyle(C.terra)}>Try Again</button>
      </div>
    );
  }

  // ── Confirmation screen ───────────────────────────────────────────────────
  if (screen === 'confirm') {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center', gap: 20 }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44, animation: 'pop 0.4s cubic-bezier(.34,1.56,.64,1)',
        }}>✓</div>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: C.navy, marginBottom: 8 }}>Order Placed!</h1>
          {orderId && (
            <div style={{ fontSize: 14, color: C.muted }}>Order <strong style={{ color: C.text }}>#{orderId}</strong> has been sent to the kitchen.</div>
          )}
        </div>
        <div style={{ background: C.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 380, border: `1px solid ${C.border}`, textAlign: 'left' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>What to expect</p>
          {['Your order is being prepared.', 'A staff member will bring it to you.', 'Enjoy your meal!'].map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: 14, color: C.text }}>{s}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => { setScreen('menu'); setOrderId(null); }}
          style={btnStyle(C.terra, '100%', 380)}
        >
          Place Another Order
        </button>
        <style>{`@keyframes pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
      </div>
    );
  }

  // ── Cart screen ────────────────────────────────────────────────────────────
  if (screen === 'cart') {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={header}>
          <button onClick={() => setScreen('menu')} style={backBtn}>← Menu</button>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>Your Order</h1>
          <div style={{ width: 80 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>
          {/* Table selector */}
          {tables.filter(t => t.status === 'available' || t.status === 'occupied').length > 0 && (
            <div style={{ background: C.card, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${C.border}` }}>
              <label style={fieldLabel}>Table (optional)</label>
              <select
                value={tableId}
                onChange={e => setTableId(e.target.value ? Number(e.target.value) : '')}
                style={selectStyle}
              >
                <option value="">No table / Takeaway</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Cart items */}
          <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 12 }}>
            {cart.map((c, i) => (
              <div key={c.item.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                borderBottom: i < cart.length - 1 ? `1px solid ${C.border}` : 'none',
              }}>
                {c.item.image_url && (
                  <img
                    src={c.item.image_url}
                    alt={c.item.name}
                    style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 2 }}>{c.item.name}</p>
                  <p style={{ fontSize: 13, color: C.terra, fontWeight: 700 }}>{(c.item.price * c.qty).toFixed(2)} DH</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => updateQty(c.item.id, -1)} style={qtyBtn}>−</button>
                  <span style={{ fontSize: 15, fontWeight: 700, width: 20, textAlign: 'center' }}>{c.qty}</span>
                  <button onClick={() => updateQty(c.item.id, 1)} style={qtyBtn}>+</button>
                  <button onClick={() => removeFromCart(c.item.id)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.muted, padding: '0 4px' }}>×</button>
                </div>
              </div>
            ))}
          </div>

          {/* Note */}
          <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <label style={fieldLabel}>Special instructions (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="E.g. no onions, extra sauce…"
              rows={3}
              style={{ ...selectStyle, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: 16, background: C.card, borderTop: `1px solid ${C.border}` }}>
          {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>{error}</p>}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 16, color: C.muted, fontWeight: 600 }}>Total</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: C.navy }}>{cartTotal.toFixed(2)} <span style={{ fontSize: 14, color: C.terra }}>DH</span></span>
          </div>
          <button
            onClick={placeOrder}
            disabled={placing || cart.length === 0}
            style={btnStyle(C.terra, '100%')}
          >
            {placing ? 'Placing order…' : `Place Order · ${cartTotal.toFixed(2)} DH`}
          </button>
        </div>
      </div>
    );
  }

  // ── Menu screen ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: C.navy, padding: '20px 16px 16px', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.cream, letterSpacing: 5, lineHeight: 1 }}>BILBAO</div>
            <div style={{ fontSize: 11, color: C.terra, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>Self Ordering</div>
          </div>
          {/* Cart button */}
          <button
            onClick={() => cartCount > 0 && setScreen('cart')}
            disabled={cartCount === 0}
            style={{
              position: 'relative', background: cartCount > 0 ? C.terra : 'rgba(255,255,255,0.12)',
              border: 'none', borderRadius: 14, padding: '10px 16px',
              cursor: cartCount > 0 ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', gap: 8,
              color: '#fff', fontWeight: 700, fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            🛒
            {cartCount > 0 && (
              <span style={{ fontSize: 13, fontWeight: 800 }}>{cartTotal.toFixed(2)} DH</span>
            )}
            <Badge count={cartCount} />
          </button>
        </div>

        {/* Category chips */}
        <div ref={catRowRef} style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' as any }}>
          <button
            data-active={activeCat === null}
            onClick={() => setActiveCat(null)}
            style={catChip(activeCat === null)}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              data-active={activeCat === cat.id}
              onClick={() => setActiveCat(cat.id)}
              style={catChip(activeCat === cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu items */}
      <div style={{ flex: 1, padding: 12, paddingBottom: 90 }}>
        {filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>No items in this category</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {filteredItems.map(item => {
              const qty = qtyOf(item.id);
              return (
                <div key={item.id} style={{
                  background: C.card, borderRadius: 18,
                  border: qty > 0 ? `2px solid ${C.terra}` : `1px solid ${C.border}`,
                  overflow: 'hidden', display: 'flex', flexDirection: 'column',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxShadow: qty > 0 ? `0 0 0 3px rgba(198,90,46,0.1)` : '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  {/* Image */}
                  <div style={{ aspectRatio: '4/3', background: '#f3f4f6', position: 'relative', overflow: 'hidden' }}>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                        🍽️
                      </div>
                    )}
                    {qty > 0 && (
                      <div style={{
                        position: 'absolute', top: 8, right: 8,
                        background: C.terra, color: '#fff', borderRadius: 99,
                        width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 900,
                      }}>
                        {qty}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{item.name}</p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: C.terra }}>{item.price.toFixed(2)} DH</p>

                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(item)}
                        style={{
                          marginTop: 'auto', background: C.navy, color: '#fff',
                          border: 'none', borderRadius: 10, padding: '8px 0',
                          fontWeight: 700, fontSize: 13, cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                      >
                        Add
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                        <button onClick={() => updateQty(item.id, -1)} style={inlineQtyBtn(C.navy)}>−</button>
                        <span style={{ fontSize: 14, fontWeight: 800, color: C.navy }}>{qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} style={inlineQtyBtn(C.terra)}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky bottom cart bar */}
      {cartCount > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
          padding: '12px 16px', background: C.card,
          borderTop: `1px solid ${C.border}`,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        }}>
          <button
            onClick={() => setScreen('cart')}
            style={{
              width: '100%', background: C.terra, color: '#fff', border: 'none',
              borderRadius: 16, padding: '16px 24px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: 'inherit', fontWeight: 800, fontSize: 15,
            }}
          >
            <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '2px 10px', fontSize: 13 }}>
              {cartCount} item{cartCount !== 1 ? 's' : ''}
            </span>
            <span>Review Order</span>
            <span>{cartTotal.toFixed(2)} DH</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Style helpers ─────────────────────────────────────────────────────────────
function btnStyle(bg: string, width?: string, maxWidth?: number): React.CSSProperties {
  return {
    background: bg, color: '#fff', border: 'none', borderRadius: 16,
    padding: '15px 28px', fontWeight: 800, fontSize: 15,
    cursor: 'pointer', fontFamily: 'inherit',
    width: width ?? 'auto', maxWidth: maxWidth ?? 'none',
    transition: 'opacity 0.15s',
  };
}

const header: React.CSSProperties = {
  background: C.card, borderBottom: `1px solid ${C.border}`,
  padding: '14px 16px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  position: 'sticky', top: 0, zIndex: 30,
};

const backBtn: React.CSSProperties = {
  background: 'none', border: 'none', fontWeight: 700, fontSize: 15,
  color: C.terra, cursor: 'pointer', padding: 0, fontFamily: 'inherit',
  width: 80,
};

const qtyBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`,
  background: '#f9fafb', cursor: 'pointer', fontSize: 16, fontWeight: 700,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: C.text,
};

function inlineQtyBtn(bg: string): React.CSSProperties {
  return {
    width: 30, height: 30, borderRadius: 8, border: 'none',
    background: bg, color: '#fff', cursor: 'pointer',
    fontSize: 16, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  };
}

function catChip(active: boolean): React.CSSProperties {
  return {
    padding: '7px 16px', borderRadius: 99, border: 'none', whiteSpace: 'nowrap',
    fontWeight: active ? 700 : 600, fontSize: 13, cursor: 'pointer',
    fontFamily: 'inherit', transition: 'all 0.15s', flexShrink: 0,
    background: active ? C.terra : 'rgba(255,255,255,0.15)',
    color: active ? '#fff' : 'rgba(255,255,255,0.75)',
  };
}

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700, color: C.muted,
  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
};

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 12,
  border: `1px solid ${C.border}`, background: '#f9fafb',
  fontSize: 14, color: C.text, outline: 'none', fontFamily: 'inherit',
};
