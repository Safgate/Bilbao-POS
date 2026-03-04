import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Plus, Trash2, Grid } from 'lucide-react';
import { apiFetch } from '../api';

export const Tables: React.FC = () => {
  const { tables } = useAppStore();
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [newTableName, setNewTableName] = useState('');

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    await apiFetch('/api/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTableName })
    });
    setNewTableName('');
    setIsAddingTable(false);
  };

  const handleDeleteTable = async (id: number) => {
    if (!confirm('Are you sure you want to delete this table?')) return;
    await apiFetch(`/api/tables/${id}`, { method: 'DELETE' });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Table Management</h1>
          <p className="text-zinc-500 mt-1">Manage your restaurant's seating</p>
        </div>
        <button 
          onClick={() => setIsAddingTable(true)}
          className="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-500/20"
        >
          <Plus size={20} /> Add Table
        </button>
      </div>

      {isAddingTable && (
        <form onSubmit={handleAddTable} className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex gap-4 max-w-md">
          <input
            type="text"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            placeholder="Table Name (e.g., Table 7)"
            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            autoFocus
          />
          <button type="submit" className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-emerald-600 transition-colors">
            Save
          </button>
          <button type="button" onClick={() => setIsAddingTable(false)} className="bg-zinc-100 text-zinc-600 px-6 py-2.5 rounded-xl font-medium hover:bg-zinc-200 transition-colors">
            Cancel
          </button>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {tables.map(table => (
          <div 
            key={table.id} 
            className={`relative p-6 rounded-2xl border-2 transition-all group ${
              table.status === 'available' 
                ? 'bg-white border-zinc-100 hover:border-emerald-500 hover:shadow-md' 
                : 'bg-orange-50 border-orange-200'
            }`}
          >
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                table.status === 'available' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-200 text-orange-700'
              }`}>
                <Grid size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-900">{table.name}</h3>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-2 uppercase tracking-wider ${
                  table.status === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-200 text-orange-800'
                }`}>
                  {table.status}
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => handleDeleteTable(table.id)}
              className="absolute top-3 right-3 p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
