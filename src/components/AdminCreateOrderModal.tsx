import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Store,
  Truck,
  Utensils,
  X,
} from 'lucide-react';
import { DiningType, MenuItem, RestaurantTable } from '../types';
import { createOrder, normalizeMenuImageUrl } from '../services/menuService';

interface AdminCreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  menus: MenuItem[];
  tables?: RestaurantTable[];
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminCreateOrderModal: React.FC<AdminCreateOrderModalProps> = ({
  isOpen,
  onClose,
  menus,
  tables = [],
  onNotify,
}) => {
  const [diningType, setDiningType] = useState<DiningType>('มาทานที่ร้าน');
  const [tableNumber, setTableNumber] = useState<string>('1');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');

  // Selected items: menuId -> quantity
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

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

  const subtotal = selectedList.reduce((sum, it) => sum + it.total, 0);
  const totalAmount = subtotal + (diningType === 'ส่งอาหารที่บ้าน' ? deliveryFee : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedList.length === 0) {
      onNotify('กรุณาเลือกรายการอาหารอย่างน้อย 1 รายการ', 'error');
      return;
    }

    const isDineIn = diningType === 'มาทานที่ร้าน';
    const isTakeaway = diningType === 'สั่งกลับบ้าน';
    const effectiveName = isDineIn
      ? customerName.trim() || `โต๊ะ ${tableNumber || 1}`
      : isTakeaway
      ? customerName.trim() || 'ลูกค้าสั่งกลับบ้าน'
      : customerName.trim();

    if (!isDineIn && !isTakeaway && !effectiveName) {
      onNotify('กรุณากรอกชื่อลูกค้า', 'error');
      return;
    }

    if (!isDineIn && !isTakeaway && !customerPhone.trim()) {
      onNotify('กรุณากรอกเบอร์โทรศัพท์ลูกค้า', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const effectiveAddress = isDineIn
        ? `ทานที่ร้าน โต๊ะ ${tableNumber || 1}`
        : isTakeaway
        ? 'สั่งกลับบ้าน (ไม่มีค่าจัดส่ง)'
        : diningType === 'นัดรับอาหาร'
        ? address.trim() || 'นัดรับที่ร้าน'
        : address.trim() || 'จัดส่งถึงบ้าน';

      const orderItems = selectedList.map((it) => ({
        menuId: it.menuItem.id,
        name: it.menuItem.name,
        price: it.menuItem.price,
        quantity: it.quantity,
      }));

      const orderNumber = await createOrder({
        customerName: effectiveName,
        customerPhone: (isDineIn || isTakeaway) ? customerPhone.trim() || '-' : customerPhone.trim(),
        address: effectiveAddress,
        deliveryType: diningType,
        tableNumber: isDineIn ? Number(tableNumber) || 1 : undefined,
        items: orderItems,
        subtotal,
        deliveryArea: isDineIn ? `ทานที่ร้าน โต๊ะ ${tableNumber}` : isTakeaway ? 'สั่งกลับบ้าน' : diningType,
        deliveryFee: diningType === 'ส่งอาหารที่บ้าน' ? deliveryFee : 0,
        totalAmount,
      });

      onNotify(`✅ คีย์ออเดอร์ใหม่ #${orderNumber} เรียบร้อยแล้ว`, 'success');
      onClose();
    } catch (err) {
      console.error('Create order error:', err);
      onNotify('เกิดข้อผิดพลาดในการสร้างออเดอร์', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-stone-900">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg">➕ คีย์ออเดอร์ใหม่ (POS สั่งหน้าร้าน)</h3>
              <p className="text-xs text-white/85">บันทึกออเดอร์สำหรับลูกค้าหน้าร้าน โต๊ะอาหาร สั่งกลับบ้าน หรือโทรสั่ง</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* 1. Dining Type Selection */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              รูปแบบการรับอาหาร <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setDiningType('มาทานที่ร้าน')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                  diningType === 'มาทานที่ร้าน'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                <Utensils className="w-4 h-4" />
                <span>1) ทานที่ร้าน</span>
              </button>

              <button
                type="button"
                onClick={() => setDiningType('สั่งกลับบ้าน')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                  diningType === 'สั่งกลับบ้าน'
                    ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-2 ring-purple-300'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>2) สั่งกลับบ้าน</span>
              </button>

              <button
                type="button"
                onClick={() => setDiningType('ส่งอาหารที่บ้าน')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                  diningType === 'ส่งอาหารที่บ้าน'
                    ? 'bg-red-600 text-white border-red-700 shadow-xs ring-2 ring-red-300'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>3) ส่งที่บ้าน</span>
              </button>

              <button
                type="button"
                onClick={() => setDiningType('นัดรับอาหาร')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                  diningType === 'นัดรับอาหาร'
                    ? 'bg-amber-400 text-stone-950 border-amber-500 shadow-xs ring-2 ring-amber-300'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>4) นัดรับอาหาร</span>
              </button>
            </div>
          </div>

          {/* 2. Customer & Table Information */}
          <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-3">
            {diningType === 'มาทานที่ร้าน' && (
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  เลือกโต๊ะอาหาร (หรือพิมพ์เลขโต๊ะ) <span className="text-stone-400 font-normal">(ใส่หรือไม่ใส่ก็ได้)</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold focus:outline-none focus:border-red-500"
                  >
                    {tables.map((t) => (
                      <option key={t.id} value={String(t.number)}>
                        {t.name} {t.isOccupied ? '(🔴 มีลูกค้านั่ง)' : '(🟢 ว่าง)'}
                      </option>
                    ))}
                    <option value="9">โต๊ะ 9</option>
                    <option value="10">โต๊ะ 10</option>
                  </select>
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="เลขโต๊ะ เช่น 1, 2, VIP"
                    className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  ชื่อลูกค้า / ชื่อเรียก {(diningType === 'มาทานที่ร้าน' || diningType === 'สั่งกลับบ้าน') ? <span className="text-stone-400 font-normal">(ไม่ใส่ก็ได้)</span> : <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={(diningType === 'มาทานที่ร้าน' || diningType === 'สั่งกลับบ้าน') ? 'เช่น คุณสมศักดิ์ (หรือเว้นว่างไว้)' : 'เช่น คุณสมศักดิ์, พี่เอก'}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  เบอร์โทรศัพท์ {(diningType === 'มาทานที่ร้าน' || diningType === 'สั่งกลับบ้าน') ? <span className="text-stone-400 font-normal">(ไม่ใส่ก็ได้)</span> : <span className="text-red-500">*</span>}
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="เช่น 081-234-5678 (หรือเว้นว่างไว้)"
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {diningType === 'ส่งอาหารที่บ้าน' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    ที่อยู่จัดส่ง / จุดสังเกต
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="เช่น ซอย 5 บ้านเลขที่ 12/3 ชุมแพ"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    ค่าจัดส่ง (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Menu Item Picker with Categories */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-stone-700">
                เลือกรายการอาหารและเครื่องดื่ม <span className="text-red-500">*</span>
              </label>
              <span className="text-xs font-bold text-red-600">
                เลือกแล้ว {selectedList.length} รายการ
              </span>
            </div>

            {/* Category Pills & Search */}
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

            {/* Menu Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 bg-stone-50/50 rounded-2xl border border-stone-200">
              {filteredMenus.map((m) => {
                const count = selectedItems[m.id] || 0;
                return (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition ${
                      count > 0
                        ? 'bg-red-50/80 border-red-300 ring-1 ring-red-300'
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
                          <span>เลือก</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Selected Summary Box */}
          {selectedList.length > 0 && (
            <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-300 space-y-2">
              <div className="text-xs font-extrabold text-amber-950 flex items-center justify-between">
                <span>สรุปรายการที่จะสั่ง ({selectedList.length} รายการ):</span>
                <span>รวมอาหาร ฿{subtotal.toLocaleString()}</span>
              </div>
              <div className="text-xs text-stone-700 space-y-1 max-h-24 overflow-y-auto">
                {selectedList.map((it) => (
                  <div key={it.menuItem.id} className="flex justify-between items-center text-[11px]">
                    <span className="truncate">
                      • {it.menuItem.name} x {it.quantity}
                    </span>
                    <span className="font-bold text-stone-900 shrink-0 ml-2">
                      ฿{it.total.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              {diningType === 'ส่งอาหารที่บ้าน' && deliveryFee > 0 && (
                <div className="flex justify-between text-xs text-stone-600 pt-1 border-t border-amber-200">
                  <span>ค่าจัดส่ง:</span>
                  <span className="font-bold text-stone-900">฿{deliveryFee}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-red-700 pt-1 border-t border-amber-200">
                <span>ยอดสุทธิทั้งหมด:</span>
                <span>฿{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Footer Submit */}
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
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 active:scale-95 disabled:bg-stone-300 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังบันทึกออเดอร์...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>ยืนยันบันทึกออเดอร์ (฿{totalAmount.toLocaleString()})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
