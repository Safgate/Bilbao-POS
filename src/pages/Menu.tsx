import React, { useState, useRef } from 'react';
import { useAppStore } from '../store';
import { Plus, Trash2, Coffee, Upload, Pencil, Check, X } from 'lucide-react';
import { apiFetch, getApiBaseUrl } from '../api';
import { t } from '../i18n';

interface EditingItem {
  id: number;
  name: string;
  price: string;
  category_id: string;
  image_url: string;
}

export const Menu: React.FC = () => {
  const { categories, menuItems, settings } = useAppStore();
  const lang = settings.language;

  // ── Category state ────────────────────────────────────────────────────────
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [renamingCatId, setRenamingCatId] = useState<number | null>(null);
  const [renamingCatName, setRenamingCatName] = useState('');

  // ── Item state ────────────────────────────────────────────────────────────
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', category_id: categories[0]?.id || '', image_url: '' });
  const [uploadingImage, setUploadingImage] = useState(false);

  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [editUploadingImage, setEditUploadingImage] = useState(false);

  const addFileRef = useRef<HTMLInputElement>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const imageSrc = (url: string) =>
    url && (url.startsWith('http') || url.startsWith('data:') ? url : getApiBaseUrl() + url);

  const uploadImage = async (
    file: File,
    onDone: (url: string) => void,
    setBusy: (b: boolean) => void
  ) => {
    if (!file.type.startsWith('image/')) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      if (!base64) { setBusy(false); return; }
      try {
        const res = await apiFetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, filename: file.name }),
        });
        const data = await res.json();
        if (data.url) onDone(data.url);
      } catch (err) {
        console.error('Upload failed', err);
      }
      setBusy(false);
    };
    reader.readAsDataURL(file);
  };

  // ── Category handlers ─────────────────────────────────────────────────────
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await apiFetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName }),
    });
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleRenameCategory = async (id: number) => {
    if (!renamingCatName.trim()) return;
    await apiFetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renamingCatName }),
    });
    setRenamingCatId(null);
    setRenamingCatName('');
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure? This will delete all items in this category.')) return;
    await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
  };

  // ── Item add handlers ─────────────────────────────────────────────────────
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price || !newItem.category_id) return;
    await apiFetch('/api/menu-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newItem.name,
        price: parseFloat(newItem.price),
        category_id: parseInt(newItem.category_id.toString()),
        image_url: newItem.image_url,
      }),
    });
    setNewItem({ name: '', price: '', category_id: categories[0]?.id || '', image_url: '' });
    setIsAddingItem(false);
  };

  // ── Item edit handlers ────────────────────────────────────────────────────
  const openEdit = (item: { id: number; name: string; price: number; category_id: number; image_url?: string }) => {
    setIsAddingItem(false);
    setEditingItem({
      id: item.id,
      name: item.name,
      price: String(item.price),
      category_id: String(item.category_id),
      image_url: item.image_url || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    await apiFetch(`/api/menu-items/${editingItem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editingItem.name,
        price: parseFloat(editingItem.price),
        category_id: parseInt(editingItem.category_id),
        image_url: editingItem.image_url,
      }),
    });
    setEditingItem(null);
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    await apiFetch(`/api/menu-items/${id}`, { method: 'DELETE' });
  };

  // ── Shared form ───────────────────────────────────────────────────────────
  const ItemForm = ({
    values,
    onChange,
    onSubmit,
    onCancel,
    uploading,
    onImagePick,
    fileRef,
    onFileChange,
    submitLabel,
  }: {
    values: { name: string; price: string; category_id: string; image_url: string };
    onChange: (patch: Partial<typeof values>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    uploading: boolean;
    onImagePick: () => void;
    fileRef: React.RefObject<HTMLInputElement | null>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    submitLabel: string;
  }) => (
    <form onSubmit={onSubmit} className="mb-8 bg-zinc-50 p-6 rounded-xl border border-zinc-200 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{t(lang, 'menu.itemName')}</label>
          <input
            required type="text" value={values.name}
            onChange={e => onChange({ name: e.target.value })}
            className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{t(lang, 'menu.price')}</label>
          <input
            required type="number" step="0.01" min="0" value={values.price}
            onChange={e => onChange({ price: e.target.value })}
            className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{t(lang, 'menu.category')}</label>
          <select
            required value={values.category_id}
            onChange={e => onChange({ category_id: e.target.value })}
            className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
          >
            <option value="">{t(lang, 'menu.selectCategory')}</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">{t(lang, 'menu.image')}</label>
          <div className="flex items-center gap-3">
            {values.image_url && (
              <div className="relative group/img">
                <img src={imageSrc(values.image_url)} alt="" className="w-16 h-16 rounded-lg object-cover border border-zinc-200" />
                <button
                  type="button"
                  onClick={() => onChange({ image_url: '' })}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                >×</button>
              </div>
            )}
            <label
              className="flex items-center gap-2 px-3 py-2 bg-white border border-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-50"
              onClick={e => { e.preventDefault(); onImagePick(); }}
            >
              <Upload size={18} className="text-zinc-500" />
              <span className="text-sm font-medium">{uploading ? '…' : values.image_url ? t(lang, 'menu.uploadImage') : t(lang, 'menu.uploadImage')}</span>
            </label>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} disabled={uploading} />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-zinc-600 font-medium hover:bg-zinc-200 rounded-lg transition-colors">
          {t(lang, 'menu.cancel')}
        </button>
        <button type="submit" className="px-6 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors">
          {submitLabel}
        </button>
      </div>
    </form>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">{t(lang, 'menu.title')}</h1>
        <p className="text-zinc-500 mt-1">{t(lang, 'menu.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Categories ──────────────────────────────────────────────────── */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 h-fit">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-zinc-900">{t(lang, 'menu.categories')}</h2>
            <button
              onClick={() => setIsAddingCategory(true)}
              className="p-2 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 rounded-lg transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          {isAddingCategory && (
            <form onSubmit={handleAddCategory} className="mb-4 flex gap-2">
              <input
                type="text" autoFocus value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder={t(lang, 'menu.categoryName')}
                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
              />
              <button type="submit" className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-600">
                {t(lang, 'menu.add')}
              </button>
              <button type="button" onClick={() => setIsAddingCategory(false)} className="bg-zinc-100 text-zinc-600 px-4 py-2 rounded-lg font-medium hover:bg-zinc-200">
                {t(lang, 'menu.cancel')}
              </button>
            </form>
          )}

          <div className="space-y-2">
            {categories.map(category => (
              <div key={category.id} className="flex items-center gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100 group">
                {renamingCatId === category.id ? (
                  <>
                    <input
                      autoFocus type="text" value={renamingCatName}
                      onChange={e => setRenamingCatName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameCategory(category.id); if (e.key === 'Escape') setRenamingCatId(null); }}
                      className="flex-1 bg-white border border-zinc-300 rounded-lg px-2 py-1 text-sm outline-none focus:border-emerald-500"
                    />
                    <button onClick={() => handleRenameCategory(category.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                      <Check size={16} />
                    </button>
                    <button onClick={() => setRenamingCatId(null)} className="p-1 text-zinc-400 hover:bg-zinc-200 rounded">
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium text-zinc-800">{category.name}</span>
                    <button
                      onClick={() => { setRenamingCatId(category.id); setRenamingCatName(category.name); }}
                      className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Rename"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Menu Items ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-zinc-900">{t(lang, 'menu.items')}</h2>
            <button
              onClick={() => { setEditingItem(null); setIsAddingItem(v => !v); }}
              className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-500/20"
            >
              <Plus size={20} /> {t(lang, 'menu.addItem')}
            </button>
          </div>

          {/* Add form */}
          {isAddingItem && !editingItem && (
            <ItemForm
              values={newItem as any}
              onChange={patch => setNewItem(p => ({ ...p, ...patch }))}
              onSubmit={handleAddItem}
              onCancel={() => setIsAddingItem(false)}
              uploading={uploadingImage}
              onImagePick={() => addFileRef.current?.click()}
              fileRef={addFileRef}
              onFileChange={e => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f, url => setNewItem(p => ({ ...p, image_url: url })), setUploadingImage);
              }}
              submitLabel={t(lang, 'menu.saveItem')}
            />
          )}

          {/* Edit form */}
          {editingItem && (
            <ItemForm
              values={editingItem}
              onChange={patch => setEditingItem(p => p ? { ...p, ...patch } : p)}
              onSubmit={handleSaveEdit}
              onCancel={() => setEditingItem(null)}
              uploading={editUploadingImage}
              onImagePick={() => editFileRef.current?.click()}
              fileRef={editFileRef}
              onFileChange={e => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f, url => setEditingItem(p => p ? { ...p, image_url: url } : p), setEditUploadingImage);
              }}
              submitLabel="Save Changes"
            />
          )}

          {/* Items grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {menuItems.map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all group ${
                  editingItem?.id === item.id
                    ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
                    : 'bg-zinc-50 border-zinc-100'
                }`}
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-200 flex-shrink-0">
                  {item.image_url ? (
                    <img src={imageSrc(item.image_url)} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      <Coffee size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-zinc-900 truncate">{item.name}</h4>
                  <p className="text-sm text-zinc-500">{categories.find(c => c.id === item.category_id)?.name}</p>
                  <p className="text-emerald-600 font-semibold mt-1">{item.price.toFixed(2)} DH</p>
                </div>
                <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => editingItem?.id === item.id ? setEditingItem(null) : openEdit(item)}
                    className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
