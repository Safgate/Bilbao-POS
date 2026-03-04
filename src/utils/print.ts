export interface PrintItem {
  name: string;
  quantity: number;
  price: number;
}

export interface PrintOrderData {
  id: number | string;
  table_name?: string;
  staff_name?: string;
  items: PrintItem[];
  total: number;
  created_at?: string;
}

export function buildReceiptHtml(order: PrintOrderData, logoUrl?: string): string {
  const date = order.created_at
    ? new Date(order.created_at).toLocaleString()
    : new Date().toLocaleString();
  const tableName = order.table_name || 'Takeaway';

  return `
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
          ${logoUrl ? `<img src="${logoUrl}" alt="" style="max-width:120px;max-height:48px;object-fit:contain;margin-bottom:8px;" />` : ''}
          <h2 style="margin:0;">Bilbao Coffee</h2>
          <div>Order #${order.id}</div>
          <div>${date}</div>
          <div class="bold" style="margin-top:8px;">${tableName}</div>
          ${order.staff_name ? `<div style="font-size:0.85em;">${order.staff_name}</div>` : ''}
        </div>

        <div class="border-b">
          ${order.items.map(item => `
            <div class="flex mb-2">
              <div>${item.quantity}x ${item.name}</div>
              <div>${(item.price * item.quantity).toFixed(2)} DH</div>
            </div>
          `).join('')}
        </div>

        <div class="flex bold border-b">
          <div>TOTAL</div>
          <div>${Number(order.total).toFixed(2)} DH</div>
        </div>

        <div class="text-center" style="margin-top:24px;">
          Thank you for your visit!
        </div>
      </body>
    </html>
  `;
}

export function printReceipt(
  order: PrintOrderData,
  opts: { printerName?: string; logoUrl?: string }
) {
  const html = buildReceiptHtml(order, opts.logoUrl);

  if (window.electronAPI?.printReceipt) {
    window.electronAPI
      .printReceipt(html, { silent: true, deviceName: opts.printerName, copies: 1 })
      .then((result) => {
        if (!result?.success) console.error('Auto-print failed:', result?.error);
      });
    return;
  }

  // Fallback: pop-up window
  const w = window.open('', '_blank', 'width=400,height=600');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => { w.print(); setTimeout(() => w.close(), 500); };
}
