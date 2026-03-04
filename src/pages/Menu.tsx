import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Plus, Trash2, Coffee, Upload } from 'lucide-react';
import { apiFetch } from '../api';
import { getApiBaseUrl } from '../api';
import { t } from '../i18n';

export const Menu: React.FC = () => {
  const { categories, menuItems, settings } = useAppStore();
  const lang = settings.language;
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', category_id: categories[0]?.id || '', image_url: '' });
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await apiFetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName })
    });
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure? This will delete all items in this category.')) return;
    await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      if (!base64) { setUploadingImage(false); return; }
      try {
        const res = await apiFetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, filename: file.name }),
        });
        const data = await res.json();
        if (data.url) setNewItem((prev) => ({ ...prev, image_url: getApiBaseUrl() + data.url }));
      } catch (err) {
        console.error('Upload failed', err);
      }
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price || !newItem.category_id) return;
    await apiFetch('/api/menu-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newItem,
        price: parseFloat(newItem.price),
        category_id: parseInt(newItem.category_id.toString())
      })
    });
    setNewItem({ name: '', price: '', category_id: categories[0]?.id || '', image_url: '' });
    setIsAddingItem(false);
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    await apiFetch(`/api/menu-items/${id}`, { method: 'DELETE' });
  };

  const imageSrc = (url: string) => url && (url.startsWith('http') || url.startsWith('data:') ? url : getApiBaseUrl() + url);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">{t(lang, 'menu.title')}</h1>
        <p className="text-zinc-500 mt-1">{t(lang, 'menu.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Categories */}
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
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t(lang, 'menu.categoryName')}
                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
                autoFocus
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
              <div key={category.id} className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl border border-zinc-100 group">
                <span className="font-medium text-zinc-800">{category.name}</span>
                <button 
                  onClick={() => handleDeleteCategory(category.id)}
                  className="text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-zinc-900">{t(lang, 'menu.items')}</h2>
            <button 
              onClick={() => setIsAddingItem(true)}
              className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-500/20"
            >
              <Plus size={20} /> {t(lang, 'menu.addItem')}
            </button>
          </div>

          {isAddingItem && (
            <form onSubmit={handleAddItem} className="mb-8 bg-zinc-50 p-6 rounded-xl border border-zinc-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{t(lang, 'menu.itemName')}</label>
                  <input required type="text" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{t(lang, 'menu.price')}</label>
                  <input required type="number" step="0.01" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{t(lang, 'menu.category')}</label>
                  <select required value={newItem.category_id} onChange={e => setNewItem({...newItem, category_id: e.target.value})} className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 outline-none focus:border-emerald-500">
                    <option value="">{t(lang, 'menu.selectCategory')}</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{t(lang, 'menu.image')}</label>
                  <div className="flex items-center gap-3">
                    {newItem.image_url ? (
                      <img src={imageSrc(newItem.image_url)} alt="" className="w-16 h-16 rounded-lg object-cover border border-zinc-200" />
                    ) : null}
                    <label className="flex items-center gap-2 px-3 py-2 bg-white border border-zinc-300 rounded-lg cursor-pointer hover:bg-zinc-50">
                      <Upload size={18} className="text-zinc-500" />
                      <span className="text-sm font-medium">{uploadingImage ? '...' : t(lang, 'menu.uploadImage')}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsAddingItem(false)} className="px-4 py-2 text-zinc-600 font-medium hover:bg-zinc-200 rounded-lg transition-colors">{t(lang, 'menu.cancel')}</button>
                <button type="submit" className="px-6 py-2 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-600 transition-colors">{t(lang, 'menu.saveItem')}</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {menuItems.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100 group">
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
                  <p className="text-emerald-600 font-semibold mt-1">{(item.price).toFixed(2)} DH</p>
                </div>
                <button 
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
