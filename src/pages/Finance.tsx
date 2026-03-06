import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { apiFetch } from '../api';
import { format } from 'date-fns';
import { Calendar, Coins, PiggyBank, ReceiptText, Trash2, PlusCircle } from 'lucide-react';

interface Expense {
  id: number;
  date: string;
  amount: number;
  category?: string;
  note?: string;
}

interface MonthlyProfit {
  month: string;
  from: string;
  to: string;
  revenue: number;
  expenses: number;
  payroll: number;
  profit: number;
}

export const Finance: React.FC = () => {
  const { settings, staff } = useAppStore();
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [monthly, setMonthly] = useState<MonthlyProfit | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingExpense, setSavingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    category: '',
    note: '',
  });

  const lang = settings.language;

  const reload = async (targetMonth: string) => {
    setLoading(true);
    try {
      const [profitRes, expRes] = await Promise.all([
        apiFetch(`/api/reports/monthly-profit?month=${targetMonth}`),
        (async () => {
          const year = Number(targetMonth.slice(0, 4));
          const m = Number(targetMonth.slice(5, 7)) - 1;
          const from = new Date(year, m, 1).toISOString().slice(0, 10);
          const to = new Date(year, m + 1, 0).toISOString().slice(0, 10);
          return apiFetch(`/api/expenses?from=${from}&to=${to}`);
        })(),
      ]);
      const monthlyJson = await profitRes.json();
      const expensesJson = await expRes.json();
      setMonthly(monthlyJson);
      setExpenses(expensesJson);
    } catch {
      setMonthly(null);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload(month);
  }, [month]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.date || !newExpense.amount) return;
    setSavingExpense(true);
    try {
      await apiFetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newExpense.date,
          amount: parseFloat(newExpense.amount),
          category: newExpense.category || undefined,
          note: newExpense.note || undefined,
        }),
      });
      setNewExpense((prev) => ({ ...prev, amount: '', note: '' }));
      await reload(month);
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Delete this expense?')) return;
    await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
    await reload(month);
  };

  const totalMonthlySalary = useMemo(
    () => staff.reduce((sum, s) => sum + (Number((s as any).monthly_salary || 0) || 0), 0),
    [staff],
  );

  const monthLabel = useMemo(() => {
    try {
      const d = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1);
      return format(d, 'MMMM yyyy');
    } catch {
      return month;
    }
  }, [month]);

  const fmt = (n: number) => `${n.toFixed(2)} DH`;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
          <Coins size={28} className="text-emerald-600" />
          Simple Finance
        </h1>
        <p className="text-zinc-500 mt-1">
          Enter daily expenses and see a simple profit for each month.
        </p>
      </div>

      {/* Month selector */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-zinc-600">Month</p>
            <p className="text-lg font-semibold text-zinc-900">{monthLabel}</p>
          </div>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="ml-auto px-3 py-2 border border-zinc-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="text-zinc-500 py-8">Loading…</div>
      ) : monthly ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-emerald-500 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-sm opacity-80">Profit this month</div>
                <PiggyBank size={22} />
              </div>
              <div className="text-3xl font-extrabold">{fmt(monthly.profit)}</div>
              <div className="mt-2 text-xs opacity-80">
                Sales – expenses – salaries for {monthLabel}.
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col gap-1">
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Sales
              </div>
              <div className="text-2xl font-bold text-zinc-900">{fmt(monthly.revenue)}</div>
              <div className="text-xs text-zinc-500">Completed orders in this month.</div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col gap-1">
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Expenses
              </div>
              <div className="text-2xl font-bold text-zinc-900">{fmt(monthly.expenses)}</div>
              <div className="text-xs text-zinc-500">Daily cash expenses you entered.</div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col gap-1">
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Staff salaries
              </div>
              <div className="text-2xl font-bold text-zinc-900">{fmt(monthly.payroll)}</div>
              <div className="text-xs text-zinc-500">
                Sum of monthly salaries for all staff ({fmt(totalMonthlySalary)} configured).
              </div>
            </div>
          </div>

          {/* Daily expenses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
              <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <ReceiptText size={20} className="text-emerald-600" />
                Add daily expense
              </h2>
              <form onSubmit={handleAddExpense} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                      Amount (DH)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Rent, Supplies, Other…"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
                      Note
                    </label>
                    <input
                      type="text"
                      value={newExpense.note}
                      onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Short description"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 disabled:opacity-60"
                >
                  <PlusCircle size={18} />
                  {savingExpense ? 'Saving…' : 'Save expense'}
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
              <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                <ReceiptText size={20} className="text-emerald-600" />
                Expenses in {monthLabel}
              </h2>
              {expenses.length === 0 ? (
                <p className="text-sm text-zinc-500">No expenses recorded for this month.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-start justify-between gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-medium text-zinc-900">
                          {fmt(exp.amount)}{' '}
                          {exp.category && <span className="text-xs text-zinc-500">· {exp.category}</span>}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {exp.date}{exp.note ? ` — ${exp.note}` : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-zinc-500 py-8">Could not load finance data.</div>
      )}
    </div>
  );
};

