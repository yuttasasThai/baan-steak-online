import React, { useState } from 'react';
import { Layers, Plus, Trash2, X } from 'lucide-react';
import { CategoryItem } from '../types';
import { addCategory, deleteCategory } from '../services/menuService';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onNotify,
}) => {
  const [newCatName, setNewCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    if (categories.some((c) => c.name.toLowerCase() === newCatName.trim().toLowerCase())) {
      onNotify('มีหมวดหมู่นี้อยู่ในระบบแล้ว', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const nextOrder = categories.length;
      await addCategory(newCatName.trim(), nextOrder);
      setNewCatName('');
      onNotify(`เพิ่มหมวดหมู่ "${newCatName.trim()}" เรียบร้อย`, 'success');
    } catch (err) {
      onNotify('เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cat: CategoryItem) => {
    if (window.confirm(`ต้องการลบหมวดหมู่ "${cat.name}" หรือไม่?`)) {
      try {
        await deleteCategory(cat.id);
        onNotify(`ลบหมวดหมู่ "${cat.name}" เรียบร้อย`, 'success');
      } catch (err) {
        onNotify('ไม่สามารถลบหมวดหมู่ได้', 'error');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-800 bg-stone-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">จัดการหมวดหมู่อาหาร</h3>
              <p className="text-xs text-stone-400">กำหนดหมวดหมู่ เช่น สเต็ก, สลัด, ของทานเล่น, เครื่องดื่ม</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleAdd} className="p-5 border-b border-stone-800 bg-stone-950/50">
          <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
            เพิ่มหมวดหมู่ใหม่
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="ระบุชื่อหมวดหมู่ เช่น ของหวาน, พาสต้า..."
              maxLength={60}
              className="flex-1 px-3.5 py-2.5 bg-stone-900 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newCatName.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-600 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-amber-900/20"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่ม</span>
            </button>
          </div>
        </form>

        {/* Category List */}
        <div className="p-5 max-h-80 overflow-y-auto space-y-2">
          {categories.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-sm">ยังไม่มีหมวดหมู่อาหารในระบบ</div>
          ) : (
            categories.map((cat, idx) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 rounded-xl bg-stone-950/60 border border-stone-800/80 hover:border-stone-700 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-stone-800 flex items-center justify-center text-xs font-bold text-stone-400">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-sm text-stone-200">{cat.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(cat)}
                  className="p-1.5 text-stone-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                  title="ลบหมวดหมู่"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-medium rounded-xl transition"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
};
