import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { format, subDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { DollarSign, TrendingUp, Users, ShoppingBag, Calendar, Database } from 'lucide-react';
import { apiFetch, getApiBaseUrl } from '../api';

export const Dashboard: React.FC = () => {
  const { activeOrders, staff, shifts } = useAppStore();
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dailyRevenue, setDailyRevenue] = useState(0);
  const [dailyOrders, setDailyOrders] = useState(0);

  const handleDownloadBackup = () => {
    const base = getApiBaseUrl();
    window.open(`${base}/api/backup`, '_blank');
  };

  const handleExportOrders = () => {
    const base = getApiBaseUrl();
    window.open(`${base}/api/export/orders.csv`, '_blank');
  };

  useEffect(() => {
    const fetchRevenue = async () => {
      const res = await apiFetch(`/api/reports/revenue?date=${selectedDate}`);
      const data = await res.json();
      setDailyRevenue(data.reduce((sum: number, order: any) => sum + order.total, 0));
      setDailyOrders(data.length);
    };
    fetchRevenue();
  }, [selectedDate, activeOrders]); // Re-fetch when active orders change (completed)

  useEffect(() => {
    // Mock last 7 days data for chart
    const generateChartData = async () => {
      const data = [];
      for (let i = 6; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        const res = await apiFetch(`/api/reports/revenue?date=${date}`);
        const orders = await res.json();
        data.push({
          name: format(subDays(new Date(), i), 'EEE'),
          revenue: orders.reduce((sum: number, o: any) => sum + o.total, 0)
        });
      }
      setRevenueData(data);
    };
    generateChartData();
  }, [activeOrders]);

  const activeStaff = shifts.filter(s => !s.end_time).length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 mt-1">Overview of your coffee shop's performance</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-zinc-200">
          <Calendar size={20} className="text-zinc-400" />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-none outline-none text-zinc-700 font-medium"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Revenue ({format(new Date(selectedDate), 'MMM d')})</p>
            <h3 className="text-2xl font-bold text-zinc-900">{(dailyRevenue).toFixed(2)} DH</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Orders ({format(new Date(selectedDate), 'MMM d')})</p>
            <h3 className="text-2xl font-bold text-zinc-900">{dailyOrders}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Active Orders</p>
            <h3 className="text-2xl font-bold text-zinc-900">{activeOrders.length}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Active Staff</p>
            <h3 className="text-2xl font-bold text-zinc-900">{activeStaff} / {staff.length}</h3>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <h3 className="text-lg font-bold text-zinc-900 mb-6">Revenue (Last 7 Days)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a' }} dx={-10} tickFormatter={(value) => `${value} DH`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${value.toFixed(2)} DH`, 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <h3 className="text-lg font-bold text-zinc-900 mb-6">Orders Volume (Last 7 Days)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a' }} dx={-10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f4f4f5' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data & Backups */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <Database size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Data & Backups</h3>
            <p className="text-sm text-zinc-500">Download a backup of your database or export orders to CSV for reporting.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleDownloadBackup}
            className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Download DB Backup
          </button>
          <button
            onClick={handleExportOrders}
            className="px-4 py-2 rounded-xl border border-zinc-300 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Export Orders CSV
          </button>
        </div>
      </div>
    </div>
  );
};
