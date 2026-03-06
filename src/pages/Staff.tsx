import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Plus, Trash2, Clock, Pencil, X, Users, CheckCircle } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { apiFetch } from '../api';

type EditState = {
  id: number;
  name: string;
  role: string;
  hourly_rate: string;
  monthly_salary: string;
  pin: string;
};

const ROLES = ['Manager', 'Waiter', 'Barista', 'Cashier', 'Chef', 'Admin'];

export const Staff: React.FC = () => {
  const { staff, shifts } = useAppStore();
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', role: '', hourly_rate: '', monthly_salary: '', pin: '' });
  const [editingStaff, setEditingStaff] = useState<EditState | null>(null);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.role || !newStaff.pin) return;
    await apiFetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newStaff.name,
        role: newStaff.role,
        hourly_rate: newStaff.hourly_rate ? parseFloat(newStaff.hourly_rate) : 0,
        monthly_salary: newStaff.monthly_salary ? parseFloat(newStaff.monthly_salary) : 0,
        pin: newStaff.pin,
      }),
    });
    setNewStaff({ name: '', role: '', hourly_rate: '', monthly_salary: '', pin: '' });
    setIsAddingStaff(false);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (editingStaff.pin && !/^\d{4}$/.test(editingStaff.pin)) {
      alert('PIN must be exactly 4 digits');
      return;
    }
    await apiFetch(`/api/staff/${editingStaff.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editingStaff.name,
        role: editingStaff.role,
        hourly_rate: editingStaff.hourly_rate ? parseFloat(editingStaff.hourly_rate) : undefined,
        monthly_salary: editingStaff.monthly_salary ? parseFloat(editingStaff.monthly_salary) : undefined,
        // Only include pin if a new one was entered
        ...(editingStaff.pin ? { pin: editingStaff.pin } : {}),
      }),
    });
    setEditingStaff(null);
  };

  const openEdit = (member: any) => {
    setEditingStaff({
      id: member.id,
      name: member.name,
      role: member.role,
      hourly_rate: String(member.hourly_rate),
      monthly_salary: member.monthly_salary != null ? String(member.monthly_salary) : '',
      pin: '', // PIN is never returned from the API — leave blank to keep current PIN
    });
  };

  const handleDeleteStaff = async (id: number) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    await apiFetch(`/api/staff/${id}`, { method: 'DELETE' });
  };

  const handleClockIn = async (staffId: number) => {
    await apiFetch('/api/shifts/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: staffId }),
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

  const inputCls = 'w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-colors';
  const labelCls = 'block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Edit Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900">Edit Staff Member</h2>
              <button onClick={() => setEditingStaff(null)} className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className={labelCls}>Full Name</label>
                <input
                  required type="text"
                  value={editingStaff.name}
                  onChange={e => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <input
                  required type="text"
                  list="role-options"
                  value={editingStaff.role}
                  onChange={e => setEditingStaff({ ...editingStaff, role: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. Barista, Waiter…"
                />
                <datalist id="role-options">
                  {ROLES.map(r => <option key={r} value={r} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Hourly Rate (DH)</label>
                  <input
                    type="number" step="0.5" min="0"
                    value={editingStaff.hourly_rate}
                    onChange={e => setEditingStaff({ ...editingStaff, hourly_rate: e.target.value })}
                    className={inputCls}
                    placeholder="(optional)"
                  />
                </div>
                <div>
                  <label className={labelCls}>Monthly Salary (DH)</label>
                  <input
                    type="number" step="1" min="0"
                    value={editingStaff.monthly_salary}
                    onChange={e => setEditingStaff({ ...editingStaff, monthly_salary: e.target.value })}
                    className={inputCls}
                    placeholder="e.g. 5000"
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>4-Digit PIN</label>
                <input
                  type="text" maxLength={4} pattern="\d{4}"
                  value={editingStaff.pin}
                  onChange={e => setEditingStaff({ ...editingStaff, pin: e.target.value.replace(/\D/g, '') })}
                  placeholder="Leave blank to keep current PIN"
                  className={inputCls}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-bold transition-colors">
                  <CheckCircle size={18} /> Save Changes
                </button>
                <button type="button" onClick={() => setEditingStaff(null)} className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 py-2.5 rounded-xl font-bold transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              <input required type="text" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="Name" className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              <input required type="text" list="new-role-options" value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} placeholder="Role (e.g., Barista)" className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
              <datalist id="new-role-options">{ROLES.map(r => <option key={r} value={r} />)}</datalist>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="0.5"
                  value={newStaff.hourly_rate}
                  onChange={e => setNewStaff({ ...newStaff, hourly_rate: e.target.value })}
                  placeholder="Hourly rate (optional)"
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  step="1"
                  value={newStaff.monthly_salary}
                  onChange={e => setNewStaff({ ...newStaff, monthly_salary: e.target.value })}
                  placeholder="Monthly salary (DH)"
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                />
              </div>
              <input required type="text" maxLength={4} pattern="\d{4}" value={newStaff.pin} onChange={e => setNewStaff({ ...newStaff, pin: e.target.value.replace(/\D/g, '') })} placeholder="4-Digit PIN" className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
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
                <div key={member.id} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-zinc-900">{member.name}</h4>
                      <p className="text-sm text-zinc-500">{member.role} • {Number(member.hourly_rate).toFixed(2)} DH/hr</p>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(member)}
                        className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(member.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeShift ? (
                      <button
                        onClick={() => handleClockOut(activeShift.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 transition-colors"
                      >
                        <Clock size={14} /> Clock Out
                      </button>
                    ) : (
                      <button
                        onClick={() => handleClockIn(member.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-200 transition-colors"
                      >
                        <Clock size={14} /> Clock In
                      </button>
                    )}
                    {activeShift && (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">● Active</span>
                    )}
                  </div>
                </div>
              );
            })}
            {staff.length === 0 && (
              <p className="text-center text-zinc-400 py-8">No staff members yet</p>
            )}
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
                {shifts.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-zinc-400">No shift records yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
