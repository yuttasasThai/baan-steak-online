import React, { useState } from 'react';
import {
  Check,
  Loader2,
  Minus,
  Plus,
  Search,
  Utensils,
  X,
} from 'lucide-react';
import { MenuItem, Order } from '../types';
import { appendItemsToOrder, normalizeMenuImageUrl } from '../services/menuService';
import { audioAlert } from '../utils/audioAlert';

interface AdminAppendItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  menus: MenuItem[];
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminAppendItemModal: React.FC<AdminAppendItemModalProps> = ({
  isOpen,
  onClose,
  order,
  menus,
  onNotify,
}) => {
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [customNote, setCustomNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !order) return null;

  const categories = Array.from(new Set(menus.map((m) => m.category))).filter(Boolean);

  const filteredMenus = menus.filter((m) => {
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
      onNotify('กรุณาเลือกรายการอาหารที่ต้องการเพิ่ม', 'error');
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

      await appendItemsToOrder(order.id, itemsToAdd, customNote.trim() || 'แอดมินคีย์สั่งเพิ่ม');

      // Voice notification for added items
      audioAlert.playOrderStatusAlert(
        {
          customerName: order.customerName,
          tableNumber: order.tableNumber,
          deliveryType: order.deliveryType,
          orderNumber: order.orderNumber,
          status: 'รับออเดอร์',
          items: itemsToAdd,
        },
        'รับออเดอร์'
      );

      onNotify(
        `✅ เพิ่มรายการในออเดอร์ #${order.orderNumber} เรียบร้อยแล้ว (เพิ่ม ฿${addedSubtotal.toLocaleString()})`,
        'success'
      );
      setSelectedItems({});
      setCustomNote('');
      onClose();
    } catch (err) {
      console.error('Append items error:', err);
      onNotify('เกิดข้อผิดพลาดในการเพิ่มรายการ', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTable = Boolean(order.deliveryType === 'มาทานที่ร้าน' || order.tableNumber);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-stone-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-stone-900">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
              <Plus className="w-5 h-5 stroke-[3]" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                <span>➕ เพิ่มรายการในออเดอร์ #{order.orderNumber}</span>
              </h3>
              <p className="text-xs text-stone-300">
                {isTable ? `🍽️ โต๊ะ ${order.tableNumber || 1}` : `คุณ ${order.customerName || 'ลูกค้า'}`} • ยอดเดิม ฿{order.totalAmount.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Current Items in Order Preview */}
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs">
            <span className="font-extrabold text-stone-700 block mb-1">
              รายการเดิมในออเดอร์ ({order.items?.length || 0} รายการ):
            </span>
            <div className="text-[11px] text-stone-600 space-y-0.5 max-h-20 overflow-y-auto">
              {order.items?.map((it, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>• {it.name} x {it.quantity}</span>
                  <span className="font-bold">฿{(it.price * it.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Menu Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700">
              เลือกเมนูอาหารหรือเครื่องดื่มที่ต้องการสั่งเพิ่ม:
            </label>

            {/* Category tabs & Search */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
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

              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อเมนู..."
                  className="w-full pl-8 pr-2.5 py-1 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Menu List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 bg-stone-50/50 rounded-2xl border border-stone-200">
              {filteredMenus.map((m) => {
                const count = selectedItems[m.id] || 0;
                return (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                      count > 0
                        ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300'
                        : 'bg-white border-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <img
                        src={normalizeMenuImageUrl(m.imageUrl, m.name)}
                        alt={m.name}
                        className="w-9 h-9 rounded-lg object-cover bg-stone-100 shrink-0"
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
                          <span className="w-5 text-center text-xs font-black text-amber-900">
                            {count}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(m.id, 1)}
                            className="w-6 h-6 rounded-lg bg-amber-500 hover:bg-amber-600 text-stone-950 font-black flex items-center justify-center cursor-pointer"
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
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              หมายเหตุเพิ่มเติม (ถ้ามี):
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="เช่น ไม่ใส่ผัก, เสิร์ฟพร้อมของเดิม"
              className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Summary */}
          {selectedList.length > 0 && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 space-y-1.5 text-xs">
              <div className="flex justify-between font-extrabold text-amber-950">
                <span>รายการที่จะสั่งเพิ่ม ({selectedList.length} รายการ):</span>
                <span>+ ฿{addedSubtotal.toLocaleString()}</span>
              </div>
              <div className="text-[11px] text-stone-700 space-y-0.5">
                {selectedList.map((it) => (
                  <div key={it.menuItem.id} className="flex justify-between">
                    <span>➕ {it.menuItem.name} x {it.quantity}</span>
                    <span className="font-bold">฿{it.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-black text-red-700 pt-1.5 border-t border-amber-200 text-sm">
                <span>ยอดรวมใหม่หลังเพิ่ม:</span>
                <span>฿{newTotalEstimate.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedList.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-stone-950 font-black rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:bg-stone-200 disabled:text-stone-400"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>บันทึกเพิ่มรายการ (+฿{addedSubtotal.toLocaleString()})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
