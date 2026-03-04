import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiJson, apiFetch, getWsUrl, getServerUrl } from '../api';
import type { Staff } from '../App';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'pos' | 'menu' | 'tables' | 'staff' | 'reports';
type POSView = 'tables' | 'menu' | 'cart';

interface SalesSummary { total_sales: number; total_orders: number; avg_order: number }
interface Order {
  id: number; table_id: number | null; status: string;
  total: number; created_at: string;
  staff_name?: string; table_name?: string;
}
interface TableRow { id: number; name: string; status: string }
interface Category { id: number; name: string }
interface MenuItem { id: number; name: string; price: number; category_id: number; image_url?: string }
interface StaffMember { id: number; name: string; role: string; hourly_rate: number }
interface Shift { id: number; staff_id: number; staff_name: string; hourly_rate: number; start_time: string; end_time?: string | null }
interface CartItem { item: MenuItem; qty: number }
interface ReportData { totalRevenue: number; orderCount: number; orders: { id: number; total: number; created_at: string }[] }

// ─── Colours ──────────────────────────────────────────────────────────────────
const C = {
  navy: '#0E2A47',
  terra: '#C65A2E',
  cream: '#F4EFEA',
  bg: '#f4f4f5',
  card: '#ffffff',
  border: '#e5e7eb',
  muted: '#6b7280',
  danger: '#ef4444',
  green: '#16a34a',
};

// ─── Shared small components ──────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{ background: C.card, borderRadius: 16, padding: '14px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flex: 1, minWidth: 80 }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <p style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 800, color }}>{value}</p>
    </div>
  );
}

function Btn({ label, onClick, variant = 'primary', small, disabled, full }: {
  label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  small?: boolean; disabled?: boolean; full?: boolean;
}) {
  const bg: Record<string, string> = { primary: C.navy, secondary: '#e5e7eb', danger: C.danger, ghost: 'transparent' };
  const col: Record<string, string> = { primary: '#fff', secondary: '#374151', danger: '#fff', ghost: C.muted };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: bg[variant], color: col[variant], border: variant === 'ghost' ? `1.5px solid ${C.border}` : 'none',
        borderRadius: 12, padding: small ? '7px 14px' : '11px 18px',
        fontSize: small ? 13 : 15, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1, width: full ? '100%' : undefined,
      }}
    >
      {label}
    </button>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: C.card, borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '90svh', overflowY: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: C.navy }}>{title}</h3>
          <button onClick={onClose} style={{ fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', color: C.muted, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ placeholder, value, onChange, type = 'text', required }: {
  placeholder: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <input
      required={required}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 15, outline: 'none', background: '#f9fafb' }}
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', boxSizing: 'border-box', border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 15, outline: 'none', background: '#f9fafb' }}
    >
      <option value="">Select…</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Toast({ msg }: { msg: string }) {
  return (
    <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: C.green, color: '#fff', padding: '12px 24px', borderRadius: 14, fontWeight: 700, fontSize: 14, zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
      {msg}
    </div>
  );
}

// ─── Dashboard Section ────────────────────────────────────────────────────────
function DashboardSection({ orders, summary, onRefresh }: {
  orders: Order[]; summary: SalesSummary | null; onRefresh: () => void;
}) {
  const fmt = (n: number) => `${n.toFixed(2)} DH`;
  return (
    <div style={sec.wrap}>
      <h2 style={sec.title}>Today's Overview</h2>
      {summary && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          <StatCard icon="💰" label="Sales" value={fmt(summary.total_sales)} color={C.terra} />
          <StatCard icon="🧾" label="Orders" value={String(summary.total_orders)} color={C.navy} />
          <StatCard icon="📊" label="Avg" value={fmt(summary.avg_order)} color={C.green} />
        </div>
      )}

      <h2 style={{ ...sec.title, marginTop: 16 }}>Active Orders ({orders.length})</h2>
      {orders.length === 0
        ? <p style={sec.empty}>No active orders right now</p>
        : orders.map(o => <OrderCard key={o.id} order={o} onRefresh={onRefresh} />)
      }
    </div>
  );
}

function OrderCard({ order, onRefresh }: { order: Order; onRefresh: () => void }) {
  const [busy, setBusy] = useState(false);
  const complete = async () => {
    setBusy(true);
    await apiJson(`/api/orders/${order.id}/complete`, { method: 'PUT' }).catch(() => {});
    onRefresh();
    setBusy(false);
  };
  return (
    <div style={{ background: C.card, borderRadius: 14, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, color: '#111', fontSize: 14 }}>
          Order #{order.id}{order.table_name ? ` · ${order.table_name}` : ''}
        </p>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
          {order.staff_name || '–'} · {new Date(order.created_at).toLocaleTimeString()}
        </p>
        <p style={{ fontSize: 16, fontWeight: 800, color: C.terra, marginTop: 4 }}>
          {Number(order.total).toFixed(2)} DH
        </p>
      </div>
      <button
        onClick={complete}
        disabled={busy}
        style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1, flexShrink: 0 }}
      >
        ✓ Done
      </button>
    </div>
  );
}

// ─── POS Section ─────────────────────────────────────────────────────────────
function POSSection({ user, tables, onRefresh }: { user: Staff; tables: TableRow[]; onRefresh: () => void }) {
  const [view, setPOSView] = useState<POSView>('tables');
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableRow | null>(null);
  const [selCat, setSelCat] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    apiJson<Category[]>('/api/categories').then(setCategories).catch(() => {});
    apiJson<MenuItem[]>('/api/menu-items').then(setMenuItems).catch(() => {});
  }, []);

  const addToCart = (item: MenuItem) =>
    setCart(prev => {
      const found = prev.find(c => c.item.id === item.id);
      return found ? prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c) : [...prev, { item, qty: 1 }];
    });

  const updateQty = (id: number, delta: number) =>
    setCart(prev => prev.map(c => c.item.id === id ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));

  const cartTotal = cart.reduce((s, c) => s + c.item.price * c.qty, 0);
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const submitOrder = async () => {
    if (!cart.length || !selectedTable) return;
    setSubmitting(true);
    try {
      await apiJson('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: selectedTable.id,
          staff_id: user.id,
          total: cartTotal,
          items: cart.map(c => ({ menu_item_id: c.item.id, quantity: c.qty, price: c.item.price })),
        }),
      });
      setCart([]);
      setToast(`Order placed for ${selectedTable.name}!`);
      setTimeout(() => { setToast(''); setPOSView('tables'); setSelectedTable(null); }, 2000);
      onRefresh();
    } catch {
      alert('Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = selCat ? menuItems.filter(m => m.category_id === selCat) : menuItems;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {toast && <Toast msg={toast} />}

      {/* Sub-header breadcrumb */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 16px 4px', background: '#fff', borderBottom: `1px solid ${C.border}` }}>
        {(['tables', 'menu', 'cart'] as POSView[]).map((v, i) => (
          <React.Fragment key={v}>
            {i > 0 && <span style={{ color: C.muted, alignSelf: 'center' }}>›</span>}
            <button
              onClick={() => { if (v === 'menu' && !selectedTable) return; setPOSView(v); }}
              disabled={v === 'menu' && !selectedTable}
              style={{ fontSize: 13, fontWeight: view === v ? 700 : 500, color: view === v ? C.terra : C.muted, background: 'none', border: 'none', cursor: (v === 'menu' && !selectedTable) ? 'default' : 'pointer', opacity: (v === 'menu' && !selectedTable) ? 0.4 : 1, padding: '2px 4px' }}
            >
              {v === 'tables' ? '🪑 Tables' : v === 'menu' ? '🍽 Menu' : `🛒 Cart${cartCount > 0 ? ` (${cartCount})` : ''}`}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {/* Tables */}
        {view === 'tables' && (
          <div>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>Select a table to start an order</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {tables.map(t => (
                <button key={t.id}
                  style={{ background: C.card, borderRadius: 14, padding: 16, border: `2px solid ${t.status === 'occupied' ? C.terra : t.status === 'reserved' ? '#d97706' : '#d1d5db'}`, cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6 }}
                  onClick={() => { setSelectedTable(t); setPOSView('menu'); }}
                >
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#111' }}>{t.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: t.status === 'occupied' ? C.terra : t.status === 'reserved' ? '#d97706' : C.green }}>{t.status}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Menu */}
        {view === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {selectedTable && <p style={{ fontSize: 13, color: C.terra, fontWeight: 700 }}>📍 {selectedTable.name}</p>}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              <button
                style={{ border: 'none', borderRadius: 20, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', background: !selCat ? C.navy : '#e5e7eb', color: !selCat ? '#fff' : '#374151' }}
                onClick={() => setSelCat(null)}
              >All</button>
              {categories.map(c => (
                <button key={c.id}
                  style={{ border: 'none', borderRadius: 20, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', background: selCat === c.id ? C.navy : '#e5e7eb', color: selCat === c.id ? '#fff' : '#374151' }}
                  onClick={() => setSelCat(c.id)}
                >{c.name}</button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {filteredItems.map(item => (
                <button key={item.id}
                  style={{ background: C.card, borderRadius: 14, padding: '14px 12px', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                  onClick={() => addToCart(item)}
                >
                  {item.image_url && (
                    <img src={item.image_url.startsWith('http') ? item.image_url : getServerUrl() + item.image_url} alt={item.name}
                      style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8 }} />
                  )}
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>{item.name}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: C.terra }}>{Number(item.price).toFixed(2)} DH</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cart */}
        {view === 'cart' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cart.length === 0
              ? <p style={{ color: C.muted, textAlign: 'center', padding: '40px 0', fontSize: 15 }}>Cart is empty</p>
              : <>
                {cart.map(c => (
                  <div key={c.item.id} style={{ background: C.card, borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, color: '#111', fontSize: 14 }}>{c.item.name}</p>
                      <p style={{ fontSize: 12, color: C.muted }}>{Number(c.item.price).toFixed(2)} DH each</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button style={qtyBtnStyle} onClick={() => updateQty(c.item.id, -1)}>−</button>
                      <span style={{ fontSize: 15, fontWeight: 700, minWidth: 22, textAlign: 'center' }}>{c.qty}</span>
                      <button style={qtyBtnStyle} onClick={() => updateQty(c.item.id, 1)}>+</button>
                    </div>
                    <p style={{ fontWeight: 700, color: C.terra, fontSize: 14, minWidth: 56, textAlign: 'right' }}>{(c.item.price * c.qty).toFixed(2)}</p>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 4px' }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
                  <span style={{ fontWeight: 800, fontSize: 22, color: C.terra }}>{cartTotal.toFixed(2)} DH</span>
                </div>
                <button
                  onClick={submitOrder}
                  disabled={submitting}
                  style={{ background: C.terra, color: '#fff', border: 'none', borderRadius: 14, padding: '15px 0', fontSize: 16, fontWeight: 700, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? 'Placing Order…' : `Place Order · ${cartTotal.toFixed(2)} DH`}
                </button>
              </>
            }
          </div>
        )}
      </div>

      {/* POS bottom sub-nav */}
      <div style={{ background: '#fff', borderTop: `1px solid ${C.border}`, display: 'flex' }}>
        {([['tables', '🪑', 'Tables'], ['menu', '🍽️', 'Menu'], ['cart', '🛒', cartCount > 0 ? `Cart (${cartCount})` : 'Cart']] as [POSView, string, string][]).map(([v, icon, label]) => (
          <button key={v}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '9px 0', background: 'none', border: 'none', cursor: (v === 'menu' && !selectedTable) ? 'default' : 'pointer', color: view === v ? C.terra : C.muted, opacity: (v === 'menu' && !selectedTable) ? 0.4 : 1 }}
            onClick={() => { if (v === 'menu' && !selectedTable) return; setPOSView(v); }}
          >
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Menu Section ─────────────────────────────────────────────────────────────
function MenuSection() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selCat, setSelCat] = useState<number | null>(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newItem, setNewItem] = useState({ name: '', price: '', category_id: '', image_url: '' });
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [cats, items] = await Promise.all([
      apiJson<Category[]>('/api/categories').catch(() => [] as Category[]),
      apiJson<MenuItem[]>('/api/menu-items').catch(() => [] as MenuItem[]),
    ]);
    setCategories(cats);
    setMenuItems(items);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    await apiFetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCatName }) });
    setNewCatName(''); setShowAddCat(false); load();
    setToast('Category added'); setTimeout(() => setToast(''), 2000);
  };

  const deleteCategory = async (id: number) => {
    if (!confirm('Delete this category and all its items?')) return;
    await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
    load();
  };

  const handleImagePick = () => fileRef.current?.click();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const res = await apiFetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64, filename: file.name }) });
      const data = await res.json();
      if (data.url) setNewItem(p => ({ ...p, image_url: data.url }));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const addItem = async () => {
    if (!newItem.name || !newItem.price || !newItem.category_id) return alert('Fill in name, price and category');
    await apiFetch('/api/menu-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newItem.name, price: parseFloat(newItem.price), category_id: parseInt(newItem.category_id), image_url: newItem.image_url }),
    });
    setNewItem({ name: '', price: '', category_id: '', image_url: '' }); setShowAddItem(false); load();
    setToast('Item added'); setTimeout(() => setToast(''), 2000);
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Delete this menu item?')) return;
    await apiFetch(`/api/menu-items/${id}`, { method: 'DELETE' });
    load();
  };

  const displayedItems = selCat ? menuItems.filter(m => m.category_id === selCat) : menuItems;

  return (
    <div style={sec.wrap}>
      {toast && <Toast msg={toast} />}

      {/* Categories row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={sec.title}>Categories</h2>
        <button onClick={() => setShowAddCat(true)} style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
        <button
          onClick={() => setSelCat(null)}
          style={{ border: 'none', borderRadius: 20, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', background: !selCat ? C.navy : '#e5e7eb', color: !selCat ? '#fff' : '#374151' }}
        >All ({menuItems.length})</button>
        {categories.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <button
              onClick={() => setSelCat(selCat === c.id ? null : c.id)}
              style={{ border: 'none', borderRadius: '20px 0 0 20px', padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', background: selCat === c.id ? C.navy : '#e5e7eb', color: selCat === c.id ? '#fff' : '#374151' }}
            >{c.name}</button>
            <button
              onClick={() => deleteCategory(c.id)}
              style={{ border: 'none', borderRadius: '0 20px 20px 0', padding: '7px 8px', fontSize: 13, cursor: 'pointer', background: selCat === c.id ? '#0a1f36' : '#d1d5db', color: selCat === c.id ? '#fca5a5' : '#9ca3af' }}
            >✕</button>
          </div>
        ))}
      </div>

      {/* Items grid */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={sec.title}>Items ({displayedItems.length})</h2>
        <button onClick={() => setShowAddItem(true)} style={{ background: C.terra, color: '#fff', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add Item</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {displayedItems.map(item => (
          <div key={item.id} style={{ background: C.card, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            {item.image_url ? (
              <img src={item.image_url.startsWith('http') ? item.image_url : getServerUrl() + item.image_url} alt={item.name}
                style={{ width: '100%', height: 90, objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: 60, background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>☕</div>
            )}
            <div style={{ padding: '10px 12px' }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#111', marginBottom: 2 }}>{item.name}</p>
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{categories.find(c => c.id === item.category_id)?.name}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: C.terra, fontSize: 15 }}>{Number(item.price).toFixed(2)} DH</span>
                <button onClick={() => deleteItem(item.id)} style={{ background: '#fee2e2', color: C.danger, border: 'none', borderRadius: 8, padding: '5px 8px', fontSize: 12, cursor: 'pointer' }}>🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {displayedItems.length === 0 && <p style={sec.empty}>No items{selCat ? ' in this category' : ''}</p>}

      {/* Add Category Sheet */}
      {showAddCat && (
        <Sheet title="New Category" onClose={() => setShowAddCat(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input placeholder="Category name" value={newCatName} onChange={setNewCatName} />
            <Btn label="Save Category" onClick={addCategory} full />
          </div>
        </Sheet>
      )}

      {/* Add Item Sheet */}
      {showAddItem && (
        <Sheet title="New Menu Item" onClose={() => setShowAddItem(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input placeholder="Item name" value={newItem.name} onChange={v => setNewItem(p => ({ ...p, name: v }))} />
            <Input placeholder="Price (DH)" type="number" value={newItem.price} onChange={v => setNewItem(p => ({ ...p, price: v }))} />
            <Select
              value={newItem.category_id}
              onChange={v => setNewItem(p => ({ ...p, category_id: v }))}
              options={categories.map(c => ({ value: String(c.id), label: c.name }))}
            />
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
            {newItem.image_url && (
              <img src={newItem.image_url.startsWith('http') ? newItem.image_url : getServerUrl() + newItem.image_url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10 }} />
            )}
            <button onClick={handleImagePick} disabled={uploading}
              style={{ border: `1.5px dashed ${C.border}`, borderRadius: 10, padding: 12, background: '#f9fafb', color: C.muted, fontSize: 14, cursor: 'pointer' }}>
              {uploading ? '⏳ Uploading…' : '📷 Upload Image (optional)'}
            </button>
            <Btn label="Save Item" onClick={addItem} full />
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ─── Tables Section ───────────────────────────────────────────────────────────
function TablesSection() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setTables(await apiJson<TableRow[]>('/api/tables').catch(() => [] as TableRow[]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const addTable = async () => {
    if (!newName.trim()) return;
    await apiFetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
    setNewName(''); setShowAdd(false); load();
    setToast('Table added'); setTimeout(() => setToast(''), 2000);
  };

  const deleteTable = async (id: number) => {
    if (!confirm('Delete this table?')) return;
    await apiFetch(`/api/tables/${id}`, { method: 'DELETE' });
    load();
  };

  const statusColor = (s: string) => s === 'occupied' ? C.terra : s === 'reserved' ? '#d97706' : C.green;

  return (
    <div style={sec.wrap}>
      {toast && <Toast msg={toast} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={sec.title}>Tables ({tables.length})</h2>
        <button onClick={() => setShowAdd(true)} style={{ background: C.terra, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {tables.map(t => (
          <div key={t.id} style={{ background: C.card, borderRadius: 14, padding: 16, border: `2px solid ${statusColor(t.status)}22`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#111', marginBottom: 4 }}>{t.name}</p>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: statusColor(t.status), background: statusColor(t.status) + '18', borderRadius: 20, padding: '3px 8px' }}>
                  {t.status}
                </span>
              </div>
              <button onClick={() => deleteTable(t.id)} style={{ background: '#fee2e2', color: C.danger, border: 'none', borderRadius: 8, padding: '6px 8px', fontSize: 13, cursor: 'pointer' }}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      {tables.length === 0 && <p style={sec.empty}>No tables yet</p>}

      {showAdd && (
        <Sheet title="New Table" onClose={() => setShowAdd(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input placeholder="Table name (e.g. Table 5)" value={newName} onChange={setNewName} />
            <Btn label="Save Table" onClick={addTable} full />
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ─── Staff Section ────────────────────────────────────────────────────────────
function StaffSection() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', role: '', hourly_rate: '', pin: '' });
  const [showShifts, setShowShifts] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    const [s, sh] = await Promise.all([
      apiJson<StaffMember[]>('/api/staff').catch(() => [] as StaffMember[]),
      apiJson<Shift[]>('/api/shifts').catch(() => [] as Shift[]),
    ]);
    setStaffList(s); setShifts(sh);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeShiftFor = (id: number) => shifts.find(s => s.staff_id === id && !s.end_time);

  const clockIn = async (id: number) => {
    await apiFetch('/api/shifts/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staff_id: id }) });
    load();
  };

  const clockOut = async (shiftId: number) => {
    await apiFetch(`/api/shifts/${shiftId}/close`, { method: 'PUT' });
    load();
  };

  const addStaff = async () => {
    const { name, role, hourly_rate, pin } = newStaff;
    if (!name || !role || !hourly_rate || !pin) return alert('All fields are required');
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) return alert('PIN must be exactly 4 digits');
    await apiFetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, role, hourly_rate: parseFloat(hourly_rate), pin }) });
    setNewStaff({ name: '', role: '', hourly_rate: '', pin: '' }); setShowAdd(false); load();
    setToast('Staff member added'); setTimeout(() => setToast(''), 2000);
  };

  const deleteStaff = async (id: number) => {
    if (!confirm('Delete this staff member?')) return;
    await apiFetch(`/api/staff/${id}`, { method: 'DELETE' });
    load();
  };

  const calcPay = (s: Shift) => {
    if (!s.end_time) return null;
    const mins = (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000;
    return (mins / 60) * s.hourly_rate;
  };

  const recentShifts = [...shifts].slice(0, 20);

  return (
    <div style={sec.wrap}>
      {toast && <Toast msg={toast} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={sec.title}>Team ({staffList.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowShifts(!showShifts)} style={{ background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {showShifts ? '👥 Staff' : '🕐 Shifts'}
          </button>
          <button onClick={() => setShowAdd(true)} style={{ background: C.terra, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Add</button>
        </div>
      </div>

      {!showShifts && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {staffList.map(m => {
            const active = activeShiftFor(m.id);
            return (
              <div key={m.id} style={{ background: C.card, borderRadius: 14, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{m.name}</p>
                  <p style={{ fontSize: 12, color: C.muted }}>{m.role} · {Number(m.hourly_rate).toFixed(2)} DH/hr</p>
                  {active && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.green, background: '#dcfce7', borderRadius: 20, padding: '2px 8px', display: 'inline-block', marginTop: 4 }}>
                      ● Clocked In
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {active
                    ? <button onClick={() => clockOut(active.id)} style={{ background: '#fee2e2', color: C.danger, border: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Out</button>
                    : <button onClick={() => clockIn(m.id)} style={{ background: '#dcfce7', color: C.green, border: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>In</button>
                  }
                  <button onClick={() => deleteStaff(m.id)} style={{ background: '#fee2e2', color: C.danger, border: 'none', borderRadius: 8, padding: '8px', fontSize: 14, cursor: 'pointer' }}>🗑</button>
                </div>
              </div>
            );
          })}
          {staffList.length === 0 && <p style={sec.empty}>No staff members yet</p>}
        </div>
      )}

      {showShifts && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recentShifts.map(s => {
            const pay = calcPay(s);
            return (
              <div key={s.id} style={{ background: C.card, borderRadius: 14, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{s.staff_name}</p>
                    <p style={{ fontSize: 12, color: C.muted }}>{new Date(s.start_time).toLocaleDateString()}</p>
                  </div>
                  {pay !== null
                    ? <span style={{ fontWeight: 800, color: C.green, fontSize: 16 }}>{pay.toFixed(2)} DH</span>
                    : <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: 13 }}>Active</span>
                  }
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                  <p style={{ fontSize: 12, color: C.green }}>In: {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  {s.end_time && <p style={{ fontSize: 12, color: C.danger }}>Out: {new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                </div>
              </div>
            );
          })}
          {recentShifts.length === 0 && <p style={sec.empty}>No shift history yet</p>}
        </div>
      )}

      {showAdd && (
        <Sheet title="Add Staff Member" onClose={() => setShowAdd(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input placeholder="Full name" value={newStaff.name} onChange={v => setNewStaff(p => ({ ...p, name: v }))} />
            <Input placeholder="Role (e.g. Barista, Waiter)" value={newStaff.role} onChange={v => setNewStaff(p => ({ ...p, role: v }))} />
            <Input placeholder="Hourly rate (DH)" type="number" value={newStaff.hourly_rate} onChange={v => setNewStaff(p => ({ ...p, hourly_rate: v }))} />
            <Input placeholder="4-digit PIN" type="number" value={newStaff.pin} onChange={v => setNewStaff(p => ({ ...p, pin: v.replace(/\D/g, '').slice(0, 4) }))} />
            <Btn label="Save Staff Member" onClick={addStaff} full />
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ─── Reports Section ──────────────────────────────────────────────────────────
type ReportPeriod = 'today' | 'week' | 'month' | 'custom';

function ReportsSection() {
  const [period, setPeriod] = useState<ReportPeriod>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const getRange = (): { from: string; to: string } => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (period === 'today') return { from: fmt(now), to: fmt(now) };
    if (period === 'week') {
      const start = new Date(now); start.setDate(now.getDate() - now.getDay());
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return { from: fmt(start), to: fmt(end) };
    }
    if (period === 'month') {
      return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, to: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
    }
    return { from: customFrom || fmt(now), to: customTo || fmt(now) };
  };

  useEffect(() => {
    const { from, to } = getRange();
    setLoading(true);
    apiFetch(`/api/reports/summary?from=${from}&to=${to}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period, customFrom, customTo]);

  const { from, to } = getRange();
  const exportUrl = getServerUrl() + '/api/export/orders.csv';
  const backupUrl = getServerUrl() + '/api/backup';

  return (
    <div style={sec.wrap}>
      <h2 style={sec.title}>Reports</h2>

      {/* Period picker */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
        {(['today', 'week', 'month', 'custom'] as ReportPeriod[]).map(p => (
          <button key={p}
            onClick={() => setPeriod(p)}
            style={{ border: 'none', borderRadius: 20, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', background: period === p ? C.navy : '#e5e7eb', color: period === p ? '#fff' : '#374151' }}
          >
            {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'Custom'}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
            style={{ flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '9px 10px', fontSize: 14, outline: 'none' }} />
          <span style={{ color: C.muted }}>–</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
            style={{ flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '9px 10px', fontSize: 14, outline: 'none' }} />
        </div>
      )}

      {loading && <p style={{ color: C.muted, textAlign: 'center', padding: '30px 0' }}>Loading…</p>}

      {!loading && data && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <StatCard icon="💰" label="Revenue" value={`${data.totalRevenue.toFixed(2)} DH`} color={C.terra} />
            <StatCard icon="🧾" label="Orders" value={String(data.orderCount)} color={C.navy} />
            {data.orderCount > 0 && (
              <StatCard icon="📊" label="Avg Order" value={`${(data.totalRevenue / data.orderCount).toFixed(2)} DH`} color={C.green} />
            )}
          </div>

          <p style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{from} → {to}</p>

          {/* Recent orders list */}
          <div style={{ background: C.card, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 14 }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>Recent Orders</span>
              <span style={{ fontSize: 12, color: C.muted }}>{data.orders.length} total</span>
            </div>
            {data.orders.length === 0 ? (
              <p style={{ ...sec.empty, padding: 16 }}>No orders in this period</p>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {[...data.orders].reverse().slice(0, 30).map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>#{o.id}</p>
                      <p style={{ fontSize: 11, color: C.muted }}>{new Date(o.created_at).toLocaleString()}</p>
                    </div>
                    <span style={{ fontWeight: 700, color: C.terra, fontSize: 14, alignSelf: 'center' }}>{o.total.toFixed(2)} DH</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Export / Backup */}
      <div style={{ background: C.card, borderRadius: 14, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 10 }}>Data & Backups</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href={exportUrl} target="_blank" rel="noreferrer"
            style={{ flex: 1, display: 'block', background: C.navy, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
            📥 Export CSV
          </a>
          <a href={backupUrl} target="_blank" rel="noreferrer"
            style={{ flex: 1, display: 'block', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 13, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}>
            💾 DB Backup
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Shared section layout helpers ───────────────────────────────────────────
const sec = {
  wrap: { display: 'flex', flexDirection: 'column' as const, gap: 10, padding: '14px 14px 24px' },
  title: { fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 } as React.CSSProperties,
  empty: { color: '#9ca3af', textAlign: 'center' as const, padding: '28px 0', fontSize: 14 },
};
const qtyBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#f9fafb',
  fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151',
};

// ─── Nav tab definition ───────────────────────────────────────────────────────
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '📊', label: 'Home' },
  { id: 'pos',       icon: '🛒', label: 'POS' },
  { id: 'menu',      icon: '🍽️', label: 'Menu' },
  { id: 'tables',    icon: '🪑', label: 'Tables' },
  { id: 'staff',     icon: '👥', label: 'Staff' },
  { id: 'reports',   icon: '📈', label: 'Reports' },
];

// ─── Main ManagerApp ──────────────────────────────────────────────────────────
export function ManagerApp({ user, onLogout }: { user: Staff; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const fetchCore = useCallback(async () => {
    try {
      const [s, o, t] = await Promise.all([
        apiJson<SalesSummary>('/api/reports/sales-summary'),
        apiJson<Order[]>('/api/orders/active'),
        apiJson<TableRow[]>('/api/tables'),
      ]);
      setSummary(s); setOrders(o); setTables(t);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCore(); }, [fetchCore]);

  useEffect(() => {
    const ws = new WebSocket(getWsUrl());
    ws.onopen = () => setRealtimeConnected(true);
    ws.onclose = () => setRealtimeConnected(false);
    ws.onmessage = () => fetchCore();
    return () => ws.close();
  }, [fetchCore]);

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', background: C.bg }}>
      {/* Header */}
      <div style={{ background: C.navy, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: C.cream, fontSize: 17, fontWeight: 800, letterSpacing: '0.14em' }}>BILBAO POS</span>
          <span style={{ fontSize: 11, color: '#fff', padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: realtimeConnected ? C.green : '#6b7280' }}>
            {realtimeConnected ? '● Live' : '○ Offline'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: '#93c5fd', fontWeight: 600 }}>{user.name}</span>
          <button onClick={onLogout} style={{ background: C.terra, border: 'none', color: '#fff', borderRadius: 10, padding: '7px 13px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Tab title bar */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, padding: '10px 16px 8px', flexShrink: 0 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: C.navy, margin: 0 }}>
          {TABS.find(t => t.id === tab)?.icon} {TABS.find(t => t.id === tab)?.label === 'Home' ? 'Dashboard' : TABS.find(t => t.id === tab)?.label}
        </h1>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: tab === 'pos' ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column' }}>
        {tab === 'dashboard' && <DashboardSection orders={orders} summary={summary} onRefresh={fetchCore} />}
        {tab === 'pos'       && <POSSection user={user} tables={tables} onRefresh={fetchCore} />}
        {tab === 'menu'      && <MenuSection />}
        {tab === 'tables'    && <TablesSection />}
        {tab === 'staff'     && <StaffSection />}
        {tab === 'reports'   && <ReportsSection />}
      </div>

      {/* Bottom navigation */}
      <div style={{ background: '#fff', borderTop: `1px solid ${C.border}`, display: 'flex', flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {TABS.map(({ id, icon, label }) => (
          <button key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '8px 2px', background: 'none', border: 'none', cursor: 'pointer',
              color: tab === id ? C.terra : C.muted,
              borderTop: tab === id ? `2.5px solid ${C.terra}` : '2.5px solid transparent',
            }}
          >
            <span style={{ fontSize: 19 }}>{icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
