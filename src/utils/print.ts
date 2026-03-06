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

interface ReceiptLayoutOptions {
  logoUrl?: string;
  businessName?: string;
  headerText?: string;
  footerText?: string;
  currency?: string;
  showTable?: boolean;
  showStaff?: boolean;
   wifiSsid?: string;
   wifiPassword?: string;
   showWifi?: boolean;
}

/** VULN-08: Escape user-controlled values before inserting into HTML */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function buildReceiptHtml(
  order: PrintOrderData,
  opts?: ReceiptLayoutOptions,
): string {
  const date = order.created_at
    ? new Date(order.created_at).toLocaleString()
    : new Date().toLocaleString();
  const tableName = escapeHtml(order.table_name || 'Takeaway');
  const businessName = escapeHtml(opts?.businessName?.trim() || 'Bilbao Coffee');
  const headerLines = opts?.headerText
    ? opts.headerText.split('\n').map((l) => escapeHtml(l.trim())).filter(Boolean)
    : [];
  const footerLines = opts?.footerText
    ? opts.footerText.split('\n').map((l) => escapeHtml(l.trim())).filter(Boolean)
    : ['Thank you for your visit!'];
  const currency = escapeHtml(opts?.currency || 'DH');
  const showTable = opts?.showTable !== false;
  const showStaff = opts?.showStaff !== false;
  const showWifiBlock = !!opts?.showWifi && (!!opts.wifiSsid || !!opts.wifiPassword);

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
          ${opts?.logoUrl ? `<img src="${escapeHtml(opts.logoUrl)}" alt="" style="max-width:120px;max-height:48px;object-fit:contain;margin-bottom:8px;" />` : ''}
          <h2 style="margin:0;">${businessName}</h2>
          ${headerLines.map((line) => `<div>${line}</div>`).join('')}
          <div>Order #${order.id}</div>
          <div>${date}</div>
          ${showTable ? `<div class="bold" style="margin-top:8px;">${tableName}</div>` : ''}
          ${showStaff && order.staff_name ? `<div style="font-size:0.85em;">${escapeHtml(order.staff_name)}</div>` : ''}
        </div>

        <div class="border-b">
          ${order.items.map(item => `
            <div class="flex mb-2">
              <div>${escapeHtml(String(item.quantity))}x ${escapeHtml(item.name)}</div>
              <div>${(item.price * item.quantity).toFixed(2)} ${currency}</div>
            </div>
          `).join('')}
        </div>

        <div class="flex bold border-b" style="align-items:flex-end;">
          <div>TOTAL</div>
          <div style="padding-left:8px;">${Number(order.total).toFixed(2)} ${currency}</div>
        </div>

        ${
          showWifiBlock
            ? `
        <div style="margin-top:10px;font-size:0.85em;text-align:left;">
          ${opts?.wifiSsid ? `<div>Wi&#x2011;Fi: ${escapeHtml(opts.wifiSsid)}</div>` : ''}
          ${opts?.wifiPassword ? `<div>Password: ${escapeHtml(opts.wifiPassword)}</div>` : ''}
        </div>`
            : ''
        }

        <div class="text-center" style="margin-top:24px;">
          ${footerLines.map((line) => `<div>${line}</div>`).join('')}
        </div>
      </body>
    </html>
  `;
}

export function printReceipt(
  order: PrintOrderData,
  opts: {
    printerName?: string;
    logoUrl?: string;
    businessName?: string;
    headerText?: string;
    footerText?: string;
    currency?: string;
    showTable?: boolean;
    showStaff?: boolean;
    wifiSsid?: string;
    wifiPassword?: string;
    showWifi?: boolean;
  }
) {
  const html = buildReceiptHtml(order, {
    logoUrl: opts.logoUrl,
    businessName: opts.businessName,
    headerText: opts.headerText,
    footerText: opts.footerText,
    currency: opts.currency,
    showTable: opts.showTable,
    showStaff: opts.showStaff,
    wifiSsid: opts.wifiSsid,
    wifiPassword: opts.wifiPassword,
    showWifi: opts.showWifi,
  });

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
