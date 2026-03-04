import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { t } from '../i18n';
import { apiFetch } from '../api';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { FileText, Calendar, TrendingUp, ShoppingBag, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';

type PeriodPreset = 'today' | 'week' | 'month' | 'custom';

interface SummaryData {
  from: string | null;
  to: string | null;
  totalRevenue: number;
  orderCount: number;
  orders: { id: number; total: number; created_at: string }[];
}

export const Reports: React.FC = () => {
  const { settings } = useAppStore();
  const lang = settings.language;
  const [period, setPeriod] = useState<PeriodPreset>('week');
  const [from, setFrom] = useState(format(startOfWeek(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(endOfWeek(new Date()), 'yyyy-MM-dd'));
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const getQueryRange = (): { from: string; to: string } => {
    const now = new Date();
    if (period === 'today') {
      return {
        from: format(startOfDay(now), 'yyyy-MM-dd'),
        to: format(endOfDay(now), 'yyyy-MM-dd'),
      };
    }
    if (period === 'week') {
      return {
        from: format(startOfWeek(now), 'yyyy-MM-dd'),
        to: format(endOfWeek(now), 'yyyy-MM-dd'),
      };
    }
    if (period === 'month') {
      return {
        from: format(startOfMonth(now), 'yyyy-MM-dd'),
        to: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    }
    return { from, to };
  };

  useEffect(() => {
    const { from: f, to: t } = getQueryRange();
    setLoading(true);
    apiFetch(`/api/reports/summary?from=${f}&to=${t}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period, from, to]);

  const handleExportPdf = () => {
    if (!data) return;
    const doc = new jsPDF();
    const title = lang === 'ar' ? 'تقرير المبيعات' : lang === 'fr' ? 'Rapport des ventes' : 'Sales Report';
    doc.setFontSize(18);
    doc.text(title, 14, 20);
    const rangeText = data.from && data.to
      ? `${data.from} – ${data.to}`
      : (data.from || data.to || '');
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(rangeText, 14, 28);
    doc.setTextColor(0, 0, 0);

    const moneyLabel = t(lang, 'reports.moneyIn');
    const ordersLabel = t(lang, 'reports.ordersCount');
    doc.setFontSize(12);
    doc.text(moneyLabel, 14, 44);
    doc.setFontSize(16);
    doc.text(`${data.totalRevenue.toFixed(2)} DH`, 14, 52);
    doc.setFontSize(12);
    doc.text(ordersLabel, 14, 64);
    doc.setFontSize(16);
    doc.text(String(data.orderCount), 14, 72);

    if (data.orders.length > 0) {
      doc.setFontSize(10);
      doc.text(lang === 'ar' ? 'آخر الطلبات' : lang === 'fr' ? 'Dernières commandes' : 'Recent orders', 14, 84);
      let y = 92;
      const recent = data.orders.slice(-15).reverse();
      for (const o of recent) {
        if (y > 270) break;
        doc.text(`#${o.id}  ${format(new Date(o.created_at), 'dd/MM/yyyy HH:mm')}  ${o.total.toFixed(2)} DH`, 14, y);
        y += 6;
      }
    }

    doc.save(`report-${data.from || 'all'}-${data.to || 'all'}.pdf`);
  };

  const range = getQueryRange();

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
          <FileText size={28} />
          {t(lang, 'reports.title')}
        </h1>
        <p className="text-zinc-500 mt-1">{t(lang, 'reports.subtitle')}</p>
      </div>

      {/* Period */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
        <h2 className="text-lg font-bold text-zinc-900 mb-3 flex items-center gap-2">
          <Calendar size={20} className="text-emerald-600" />
          {t(lang, 'reports.period')}
        </h2>
        <div className="flex flex-wrap gap-3 items-center">
          {(['today', 'week', 'month', 'custom'] as PeriodPreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                period === p ? 'bg-emerald-500 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {p === 'today' ? t(lang, 'reports.today') : p === 'week' ? t(lang, 'reports.thisWeek') : p === 'month' ? t(lang, 'reports.thisMonth') : t(lang, 'reports.custom')}
            </button>
          ))}
          {period === 'custom' && (
            <span className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded-xl"
              />
              <span className="text-zinc-500">–</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="px-3 py-2 border border-zinc-300 rounded-xl"
              />
            </span>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="text-zinc-500 py-8">Loading...</div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500">{t(lang, 'reports.moneyIn')}</p>
                <p className="text-2xl font-bold text-zinc-900">{data.totalRevenue.toFixed(2)} DH</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <ShoppingBag size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500">{t(lang, 'reports.ordersCount')}</p>
                <p className="text-2xl font-bold text-zinc-900">{data.orderCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-bold text-zinc-900">{range.from} – {range.to}</h3>
              <button
                onClick={handleExportPdf}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600"
              >
                <Download size={18} />
                {t(lang, 'reports.exportPdf')}
              </button>
            </div>
            {data.orders.length === 0 ? (
              <p className="text-zinc-500 py-4">No orders in this period.</p>
            ) : (
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 text-left">
                      <th className="py-2 pr-4">#</th>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2">Total (DH)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.orders].reverse().map((o) => (
                      <tr key={o.id} className="border-b border-zinc-100">
                        <td className="py-2 pr-4">{o.id}</td>
                        <td className="py-2 pr-4">{format(new Date(o.created_at), 'dd/MM/yyyy HH:mm')}</td>
                        <td className="py-2 font-medium">{o.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-zinc-500 py-8">Could not load report.</div>
      )}
    </div>
  );
};
