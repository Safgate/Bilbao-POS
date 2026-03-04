import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { MenuItem, OrderItem, Table } from '../types';
import { apiFetch } from '../api';
import { getApiBaseUrl } from '../api';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, XCircle, Coffee } from 'lucide-react';
import { t } from '../i18n';

export const POS: React.FC = () => {
  const { categories, menuItems, tables, activeOrders, settings } = useAppStore();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const lang = settings.language;
  const receiptLogoUrl = settings.logoUrl ? (settings.logoUrl.startsWith('http') || settings.logoUrl.startsWith('data:') ? settings.logoUrl : getApiBaseUrl() + settings.logoUrl) : '';

  const filteredItems = useMemo(() => {
    if (selectedCategory === null) return menuItems;
    return menuItems.filter(item => item.category_id === selectedCategory);
  }, [menuItems, selectedCategory]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menu_item_id === item.id);
      if (existing) {
        return prev.map(i => i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menu_item_id: item.id, quantity: 1, price: item.price, name: item.name }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.menu_item_id === id) {
        const newQuantity = i.quantity + delta;
        return newQuantity > 0 ? { ...i, quantity: newQuantity } : i;
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.menu_item_id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const printReceipt = (orderData: any, orderNumber: number) => {
    const tableName = selectedTable 
      ? tables.find(t => t.id === selectedTable)?.name 
      : 'Takeaway';

    const date = new Date().toLocaleString();

    const html = `
      <html>
        <head>
          <title>Receipt</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: monospace; margin: 0; padding: 4px 8px; width: 240px; }
            @page { margin: 0; size: auto; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .mb-2 { margin-bottom: 8px; }
            .mb-4 { margin-bottom: 16px; }
            .flex { display: flex; justify-content: space-between; }
            .border-b { border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="text-center mb-4">
            ${receiptLogoUrl ? `<img src="${receiptLogoUrl}" alt="" style="max-width: 120px; max-height: 48px; object-fit: contain; margin-bottom: 8px;" />` : ''}
            <h2 style="margin: 0;">Bilbao Coffee</h2>
            <div>123 Coffee Street</div>
            <div>Order #${orderNumber}</div>
            <div>${date}</div>
            <div class="bold" style="margin-top: 8px;">${tableName}</div>
          </div>
          
          <div class="border-b">
            ${orderData.items.map((item: any) => `
              <div class="flex mb-2">
                <div>${item.quantity}x ${item.name}</div>
                <div>${(item.price * item.quantity).toFixed(2)} DH</div>
              </div>
            `).join('')}
          </div>
          
          <div class="flex bold border-b">
            <div>TOTAL</div>
            <div>${orderData.total.toFixed(2)} DH</div>
          </div>
          
          <div class="text-center" style="margin-top: 24px;">
            Thank you for your visit!
          </div>
        </body>
      </html>
    `;

    // Prefer Electron main-process printing (reliable, no popups).
    if (window.electronAPI?.printReceipt) {
      const deviceName = settings.printer || undefined;
      window.electronAPI.printReceipt(html, { silent: true, deviceName, copies: 1 }).then((result) => {
        if (!result?.success) {
          console.error('Print failed', result?.error);
        }
      });
      return;
    }

    // Fallback for web/dev mode.
    const receiptWindow = window.open('', '_blank', 'width=400,height=600');
    if (!receiptWindow) return;
    receiptWindow.document.write(html);
    receiptWindow.document.close();
    receiptWindow.onload = () => {
      receiptWindow.print();
      setTimeout(() => receiptWindow.close(), 500);
    };
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      const res = await apiFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_id: selectedTable,
          items: cart,
          total: cartTotal
        })
      });
      
      const data = await res.json();
      
      // Print receipt
      printReceipt({ items: cart, total: cartTotal }, data.id);

      setCart([]);
      setSelectedTable(null);
    } catch (error) {
      console.error('Failed to place order', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const completeOrder = async (orderId: number, tableId: number | null) => {
    await apiFetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', table_id: tableId })
    });
  };

  const cancelOrder = async (orderId: number, tableId: number | null) => {
    await apiFetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled', table_id: tableId })
    });
  };

  return (
    <div className="flex h-full bg-zinc-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Categories */}
        <div className="bg-white border-b border-zinc-200 p-4 flex gap-3 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-6 py-2.5 rounded-full font-medium whitespace-nowrap transition-colors ${
              selectedCategory === null 
                ? 'bg-zinc-900 text-white' 
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            All Items
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-2.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category.id 
                  ? 'bg-zinc-900 text-white' 
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col items-center text-center group"
              >
                <div className="w-24 h-24 rounded-full overflow-hidden mb-4 bg-zinc-100">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      <Coffee size={32} />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-zinc-800 mb-1">{item.name}</h3>
                <p className="text-emerald-600 font-bold">{(item.price).toFixed(2)} DH</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Cart & Active Orders */}
      <div className="w-96 bg-white border-l border-zinc-200 flex flex-col h-full shadow-xl z-10">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <ShoppingCart size={24} className="text-emerald-500" />
            Current Order
          </h2>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} items
          </span>
        </div>

        {/* Table Selection */}
        <div className="p-4 border-b border-zinc-100 bg-zinc-50">
          <label className="block text-sm font-medium text-zinc-700 mb-2">Select Table (Optional)</label>
          <select
            value={selectedTable || ''}
            onChange={(e) => setSelectedTable(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          >
            <option value="">Takeaway / No Table</option>
            {tables.filter(t => t.status === 'available').map(table => (
              <option key={table.id} value={table.id}>{table.name}</option>
            ))}
          </select>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
              <ShoppingCart size={48} className="opacity-20" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.menu_item_id} className="flex items-center justify-between bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                <div className="flex-1">
                  <h4 className="font-medium text-zinc-900">{item.name}</h4>
                  <p className="text-emerald-600 font-semibold">{(item.price * item.quantity).toFixed(2)} DH</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateQuantity(item.menu_item_id, -1)} className="p-1.5 bg-white rounded-full text-zinc-500 hover:text-zinc-900 shadow-sm border border-zinc-200">
                    <Minus size={16} />
                  </button>
                  <span className="w-6 text-center font-medium">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.menu_item_id, 1)} className="p-1.5 bg-white rounded-full text-zinc-500 hover:text-zinc-900 shadow-sm border border-zinc-200">
                    <Plus size={16} />
                  </button>
                  <button onClick={() => removeFromCart(item.menu_item_id)} className="p-1.5 ml-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Checkout */}
        <div className="p-5 bg-zinc-50 border-t border-zinc-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-zinc-500 font-medium">{t(lang, 'pos.total')}</span>
            <span className="text-3xl font-bold text-zinc-900">{(cartTotal).toFixed(2)} DH</span>
          </div>
          <button
            onClick={placeOrder}
            disabled={cart.length === 0 || isProcessing}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-[0.98]"
          >
            {isProcessing ? t(lang, 'pos.processing') : t(lang, 'pos.placeOrder')}
          </button>
        </div>

        {/* Active Orders Quick View */}
        {activeOrders.length > 0 && (
          <div className="p-4 border-t border-zinc-200 bg-white">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">{t(lang, 'pos.activeOrders')} ({activeOrders.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activeOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                  <div>
                    <span className="font-medium text-zinc-900">Order #{order.id}</span>
                    <p className="text-xs text-zinc-500">
                      {order.table_id ? tables.find(t => t.id === order.table_id)?.name : 'Takeaway'} • {(order.total).toFixed(2)} DH
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => completeOrder(order.id, order.table_id)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full" title="Complete">
                      <CheckCircle size={20} />
                    </button>
                    <button onClick={() => cancelOrder(order.id, order.table_id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full" title="Cancel">
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
