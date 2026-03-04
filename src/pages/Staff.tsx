import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Plus, Trash2, Clock, CheckCircle, XCircle, Users } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { apiFetch } from '../api';

export const Staff: React.FC = () => {
  const { staff, shifts } = useAppStore();
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', role: '', hourly_rate: '', pin: '' });

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.role || !newStaff.hourly_rate || !newStaff.pin) return;
    await apiFetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newStaff,
        hourly_rate: parseFloat(newStaff.hourly_rate)
      })
    });
    setNewStaff({ name: '', role: '', hourly_rate: '', pin: '' });
    setIsAddingStaff(false);
  };

  const handleDeleteStaff = async (id: number) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    await apiFetch(`/api/staff/${id}`, { method: 'DELETE' });
  };

  const handleClockIn = async (staffId: number) => {
    await apiFetch('/api/shifts/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: staffId })
    });
  };

  const handleClockOut = async (shiftId: number) => {
    await apiFetch(`/api/shifts/${shiftId}/close`, { method: 'PUT' });
  };

  const calculatePay = (shift: any) => {
    if (!shift.end_time) return 0;
    const mins = differenceInMinutes(new Date(shift.end_time), new Date(shift.start_time));
    return (mins / 60) * shift.hourly_rate;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Staff & Payroll</h1>
          <p className="text-zinc-500 mt-1">Manage employees and shifts</p>
        </div>
        <button 
          onClick={() => setIsAddingStaff(true)}
          className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-500/20"
        >
          <Plus size={20} /> Add Staff
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Staff List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 h-fit">
          <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
            <Users size={24} className="text-emerald-500" />
            Team Members
          </h2>

          {isAddingStaff && (
            <form onSubmit={handleAddStaff} className="mb-6 bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-3">
              <input required type="text" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} placeholder="Name" className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              <input required type="text" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} placeholder="Role (e.g., Barista)" className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              <input required type="number" step="0.5" value={newStaff.hourly_rate} onChange={e => setNewStaff({...newStaff, hourly_rate: e.target.value})} placeholder="Hourly Rate (DH)" className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              <input required type="text" maxLength={4} pattern="\d{4}" value={newStaff.pin} onChange={e => setNewStaff({...newStaff, pin: e.target.value.replace(/\D/g, '')})} placeholder="4-Digit PIN" className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-medium hover:bg-emerald-600">Save</button>
                <button type="button" onClick={() => setIsAddingStaff(false)} className="flex-1 bg-zinc-200 text-zinc-700 py-2 rounded-lg font-medium hover:bg-zinc-300">Cancel</button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {staff.map(member => {
              const activeShift = shifts.find(s => s.staff_id === member.id && !s.end_time);
              return (
                <div key={member.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100 group">
                  <div>
                    <h4 className="font-bold text-zinc-900">{member.name}</h4>
                    <p className="text-sm text-zinc-500">{member.role} • {(member.hourly_rate).toFixed(2)} DH/hr</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {activeShift ? (
                      <button 
                        onClick={() => handleClockOut(activeShift.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 transition-colors"
                      >
                        <Clock size={16} /> Clock Out
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleClockIn(member.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-200 transition-colors"
                      >
                        <Clock size={16} /> Clock In
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteStaff(member.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shift History */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
            <Clock size={24} className="text-emerald-500" />
            Shift History & Payroll
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 text-sm uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Staff</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Clock In</th>
                  <th className="pb-3 font-semibold">Clock Out</th>
                  <th className="pb-3 font-semibold text-right">Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {shifts.map(shift => (
                  <tr key={shift.id} className="text-zinc-800">
                    <td className="py-4 font-medium">{shift.staff_name}</td>
                    <td className="py-4 text-zinc-500">{format(new Date(shift.start_time), 'MMM d, yyyy')}</td>
                    <td className="py-4 text-emerald-600 font-medium">{format(new Date(shift.start_time), 'h:mm a')}</td>
                    <td className="py-4 text-red-600 font-medium">
                      {shift.end_time ? format(new Date(shift.end_time), 'h:mm a') : <span className="text-orange-500">Active</span>}
                    </td>
                    <td className="py-4 text-right font-bold">
                      {shift.end_time ? `${calculatePay(shift).toFixed(2)} DH` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
