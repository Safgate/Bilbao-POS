import React, { useState, useEffect, useCallback } from 'react';
import { apiJson, getWsUrl } from '../api';
import type { Staff } from '../App';

interface TableRow { id: number; name: string; status: string }
interface Category { id: number; name: string }
interface MenuItem { id: number; name: string; price: number; category_id: number; image_url?: string }
interface CartItem { item: MenuItem; qty: number }

type View = 'tables' | 'menu' | 'cart';

export function WaiterApp({ user, onLogout }: { user: Staff; onLogout: () => void }) {
  const [view, setView] = useState<View>('tables');
  const [tables, setTables] = useState<TableRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableRow | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchTables = useCallback(async () => {
    const t = await apiJson<TableRow[]>('/api/tables').catch(() => [] as TableRow[]);
    setTables(t);
  }, []);

  useEffect(() => {
    fetchTables();
    apiJson<Category[]>('/api/categories').then(setCategories).catch(() => {});
    apiJson<MenuItem[]>('/api/menu-items').then(setMenuItems).catch(() => {});
  }, [fetchTables]);

  useEffect(() => {
    const ws = new WebSocket(getWsUrl());
    ws.onmessage = () => fetchTables();
    return () => ws.close();
  }, [fetchTables]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const found = prev.find(c => c.item.id === item.id);
      if (found) return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { item, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(c => c.item.id === id ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0));
  };

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
      setSuccessMsg(`Order placed for ${selectedTable.name}!`);
      setTimeout(() => { setSuccessMsg(''); setView('tables'); setSelectedTable(null); }, 2000);
      fetchTables();
    } catch {
      alert('Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = selectedCategory
    ? menuItems.filter(m => m.category_id === selectedCategory)
    : menuItems;

  return (
    <div style={s.screen}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={s.title}>BILBAO POS</span>
          {selectedTable && <span style={s.subtitle}>{selectedTable.name}</span>}
        </div>
        <button style={s.logoutBtn} onClick={onLogout}>{user.name[0]} ⏎</button>
      </div>

      {successMsg && (
        <div style={s.successBanner}>{successMsg}</div>
      )}

      <div style={s.content}>
        {/* Tables view */}
        {view === 'tables' && (
          <div style={s.section}>
            <p style={s.hint}>Select a table to start an order</p>
            <div style={s.tablesGrid}>
              {tables.map(t => (
                <button
                  key={t.id}
                  style={{ ...s.tableCard, borderColor: t.status === 'occupied' ? '#C65A2E' : t.status === 'reserved' ? '#d97706' : '#d1d5db', background: selectedTable?.id === t.id ? '#fff7ed' : '#fff' }}
                  onClick={() => { setSelectedTable(t); setView('menu'); }}
                >
                  <span style={s.tableName}>{t.name}</span>
                  <span style={{ ...s.tableStatus, color: t.status === 'occupied' ? '#C65A2E' : t.status === 'reserved' ? '#d97706' : '#16a34a' }}>
                    {t.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Menu view */}
        {view === 'menu' && (
          <div style={s.section}>
            {/* Category filter */}
            <div style={s.catRow}>
              <button style={{ ...s.catChip, background: !selectedCategory ? '#0E2A47' : '#e5e7eb', color: !selectedCategory ? '#fff' : '#374151' }} onClick={() => setSelectedCategory(null)}>
                All
              </button>
              {categories.map(c => (
                <button key={c.id} style={{ ...s.catChip, background: selectedCategory === c.id ? '#0E2A47' : '#e5e7eb', color: selectedCategory === c.id ? '#fff' : '#374151' }} onClick={() => setSelectedCategory(c.id)}>
                  {c.name}
                </button>
              ))}
            </div>

            <div style={s.menuGrid}>
              {filteredItems.map(item => (
                <button key={item.id} style={s.menuCard} onClick={() => addToCart(item)}>
                  <span style={s.menuName}>{item.name}</span>
                  <span style={s.menuPrice}>${Number(item.price).toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cart view */}
        {view === 'cart' && (
          <div style={s.section}>
            {cart.length === 0
              ? <p style={s.empty}>Cart is empty</p>
              : <>
                  {cart.map(c => (
                    <div key={c.item.id} style={s.cartRow}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, color: '#111' }}>{c.item.name}</p>
                        <p style={{ fontSize: 13, color: '#6b7280' }}>${Number(c.item.price).toFixed(2)} each</p>
                      </div>
                      <div style={s.qtyRow}>
                        <button style={s.qtyBtn} onClick={() => updateQty(c.item.id, -1)}>−</button>
                        <span style={s.qtyNum}>{c.qty}</span>
                        <button style={s.qtyBtn} onClick={() => updateQty(c.item.id, 1)}>+</button>
                      </div>
                      <p style={{ fontWeight: 700, color: '#C65A2E', minWidth: 56, textAlign: 'right' }}>${(c.item.price * c.qty).toFixed(2)}</p>
                    </div>
                  ))}
                  <div style={s.totalRow}>
                    <span style={{ fontWeight: 700 }}>Total</span>
                    <span style={{ fontWeight: 800, fontSize: 20, color: '#C65A2E' }}>${cartTotal.toFixed(2)}</span>
                  </div>
                  <button style={{ ...s.submitBtn, opacity: submitting ? 0.7 : 1 }} onClick={submitOrder} disabled={submitting}>
                    {submitting ? 'Placing Order…' : `Place Order · $${cartTotal.toFixed(2)}`}
                  </button>
                </>
            }
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={s.nav}>
        {([['tables','🪑','Tables'],['menu','🍽️','Menu'],['cart',`🛒${cartCount > 0 ? ` (${cartCount})` : ''}`, 'Cart']] as [View,string,string][]).map(([id, icon, label]) => (
          <button key={id} style={{ ...s.navBtn, color: view === id ? '#C65A2E' : '#6b7280' }} onClick={() => setView(id)} disabled={id === 'menu' && !selectedTable}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ ...s.navLabel, opacity: id === 'menu' && !selectedTable ? 0.4 : 1 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  screen: { minHeight: '100svh', display: 'flex', flexDirection: 'column', background: '#f4f4f5' },
  header: { background: '#0E2A47', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#F4EFEA', fontSize: 17, fontWeight: 800, letterSpacing: '0.14em' },
  subtitle: { color: '#7fa8c9', fontSize: 12, marginTop: 2 },
  logoutBtn: { background: '#C65A2E', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  content: { flex: 1, overflowY: 'auto', padding: 16 },
  section: { display: 'flex', flexDirection: 'column', gap: 10 },
  hint: { fontSize: 14, color: '#6b7280' },
  tablesGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
  tableCard: { background: '#fff', borderRadius: 14, padding: 16, border: '2px solid', display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer', textAlign: 'left' },
  tableName: { fontWeight: 700, fontSize: 16, color: '#111' },
  tableStatus: { fontSize: 13, fontWeight: 600, textTransform: 'capitalize' as const },
  catRow: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 },
  catChip: { border: 'none', borderRadius: 20, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const },
  menuGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 },
  menuCard: { background: '#fff', borderRadius: 14, padding: '16px 12px', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  menuName: { fontWeight: 600, fontSize: 14, color: '#111' },
  menuPrice: { fontWeight: 700, fontSize: 16, color: '#C65A2E' },
  cartRow: { background: '#fff', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  qtyRow: { display: 'flex', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, border: '1.5px solid #d1d5db', background: '#f9fafb', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' },
  qtyNum: { fontSize: 16, fontWeight: 700, minWidth: 24, textAlign: 'center' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 4px' },
  submitBtn: { background: '#C65A2E', color: '#fff', border: 'none', borderRadius: 14, padding: '16px 0', fontSize: 16, fontWeight: 700, cursor: 'pointer' },
  empty: { color: '#9ca3af', textAlign: 'center', padding: '32px 0' },
  successBanner: { background: '#16a34a', color: '#fff', textAlign: 'center', padding: '12px 16px', fontWeight: 700, fontSize: 15 },
  nav: { background: '#fff', borderTop: '1px solid #e5e7eb', display: 'flex', paddingBottom: 'env(safe-area-inset-bottom, 0px)' },
  navBtn: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer' },
  navLabel: { fontSize: 11, fontWeight: 600 },
};
