import React, { useState } from 'react';
import {
  Check,
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Utensils,
  X,
} from 'lucide-react';
import { MenuItem, Order } from '../types';
import { appendItemsToOrder, normalizeMenuImageUrl } from '../services/menuService';

interface CustomerAppendOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  menus: MenuItem[];
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustomerAppendOrderModal: React.FC<CustomerAppendOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  menus,
  onNotify,
}) => {
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !order) return null;

  const categories = Array.from(new Set(menus.map((m) => m.category))).filter(Boolean);

  const availableMenus = menus.filter((m) => m.isPublished && m.isAvailable);

  const filteredMenus = availableMenus.filter((m) => {
    const matchCat = selectedCategory === 'ทั้งหมด' || m.category === selectedCategory;
    const matchSearch =
      !searchQuery.trim() ||
      m.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchCat && matchSearch;
  });

  const handleQuantityChange = (menuId: string, delta: number) => {
    setSelectedItems((prev) => {
      const current = prev[menuId] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[menuId];
        return copy;
      }
      return { ...prev, [menuId]: next };
    });
  };

  const selectedList = Object.entries(selectedItems)
    .map(([menuId, quantity]) => {
      const menuItem = menus.find((m) => m.id === menuId);
      if (!menuItem) return null;
      return { menuItem, quantity, total: menuItem.price * quantity };
    })
    .filter(Boolean) as Array<{ menuItem: MenuItem; quantity: number; total: number }>;

  const addedSubtotal = selectedList.reduce((sum, it) => sum + it.total, 0);
  const newTotalEstimate = (order.totalAmount || 0) + addedSubtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedList.length === 0) {
      onNotify('กรุณาเลือกรายการอาหารที่ต้องการสั่งเพิ่ม', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const itemsToAdd = selectedList.map((it) => ({
        menuId: it.menuItem.id,
        name: it.menuItem.name,
        price: it.menuItem.price,
        quantity: it.quantity,
      }));

      await appendItemsToOrder(order.id, itemsToAdd, customNote.trim() || 'ลูกค้าสั่งเพิ่ม');

      onNotify(
        `🎉 สั่งอาหารเพิ่มในออเดอร์ #${order.orderNumber} เรียบร้อยแล้ว (รวมยอด ฿${newTotalEstimate.toLocaleString()})`,
        'success'
      );
      setSelectedItems({});
      setCustomNote('');
      onClose();
    } catch (err) {
      console.error('Customer append error:', err);
      onNotify('เกิดข้อผิดพลาดในการสั่งอาหารเพิ่ม กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTable = Boolean(order.deliveryType === 'มาทานที่ร้าน' || order.tableNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-stone-900">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Plus className="w-5 h-5 stroke-[3]" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base">
                ➕ สั่งอาหารเพิ่ม (ออเดอร์ #{order.orderNumber})
              </h3>
              <p className="text-[11px] text-white/85">
                {isTable ? `🍽️ โต๊ะ ${order.tableNumber || 1}` : 'รายการสั่งเพิ่มจะรวมในบิลเดิม'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Categories */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('ทั้งหมด')}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === 'ทั้งหมด'
                  ? 'bg-red-600 text-white'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              ทั้งหมด
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-red-600 text-white'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเมนู..."
              className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Menu Items List */}
          <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto p-1 bg-stone-50 rounded-2xl border border-stone-200">
            {filteredMenus.map((m) => {
              const count = selectedItems[m.id] || 0;
              return (
                <div
                  key={m.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                    count > 0
                      ? 'bg-red-50/70 border-red-300 ring-1 ring-red-300'
                      : 'bg-white border-stone-200'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <img
                      src={normalizeMenuImageUrl(m.imageUrl, m.name)}
                      alt={m.name}
                      className="w-10 h-10 rounded-lg object-cover bg-stone-100 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-900 truncate">{m.name}</div>
                      <div className="text-[11px] font-extrabold text-red-600">฿{m.price}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {count > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(m.id, -1)}
                          className="w-6 h-6 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-black text-red-700">
                          {count}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(m.id, 1)}
                          className="w-6 h-6 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(m.id, 1)}
                        className="px-2.5 py-1 bg-stone-100 hover:bg-red-600 hover:text-white text-stone-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>เพิ่ม</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Note */}
          <div>
            <label className="block text-[11px] font-bold text-stone-600 mb-1">
              ข้อความเพิ่มเติมถึงร้าน (ถ้ามี):
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="เช่น ไม่ใส่พริกไทย, ขอน้ำจิ้มเพิ่ม"
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Selected Summary */}
          {selectedList.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 space-y-1 text-xs">
              <div className="flex justify-between font-extrabold text-amber-950">
                <span>รายการสั่งเพิ่ม ({selectedList.length} อย่าง):</span>
                <span>+ ฿{addedSubtotal.toLocaleString()}</span>
              </div>
              <div className="text-[11px] text-stone-700 space-y-0.5 max-h-16 overflow-y-auto">
                {selectedList.map((it) => (
                  <div key={it.menuItem.id} className="flex justify-between">
                    <span className="truncate">• {it.menuItem.name} x {it.quantity}</span>
                    <span className="font-bold shrink-0 ml-2">฿{it.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-black text-red-700 pt-1 border-t border-amber-200">
                <span>ยอดรวมทั้งหมด:</span>
                <span>฿{newTotalEstimate.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedList.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 active:scale-95 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังส่งรายการ...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>ยืนยันสั่งอาหารเพิ่ม (฿{addedSubtotal.toLocaleString()})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
