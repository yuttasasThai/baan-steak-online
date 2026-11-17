import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { MenuItem, Order, OrderItem } from '../types';
import { finalizeOrderCheckout, normalizeMenuImageUrl } from '../services/menuService';
import { audioAlert } from '../utils/audioAlert';
import { renderDeliveryTypeBadge } from './AdminOrdersManager';

interface CheckBillModalProps {
  isOpen: boolean;
  order: Order | null;
  menus: MenuItem[];
  onClose: () => void;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
  onPrintAfterCheckout?: (checkedOutOrder: Order) => void;
}

export const CheckBillModal: React.FC<CheckBillModalProps> = ({
  isOpen,
  order,
  menus,
  onClose,
  onNotify,
  onPrintAfterCheckout,
}) => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [manualTotalStr, setManualTotalStr] = useState<string>('0');
  const [isTotalManuallyEdited, setIsTotalManuallyEdited] = useState(false);
  const [markAllServed, setMarkAllServed] = useState(true);

  // Quick Add Menu Drawer inside Check-Bill
  const [showAddMenuDrawer, setShowAddMenuDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync draft state whenever opening modal with an order
  useEffect(() => {
    if (!isOpen || !order) return;
    const clonedItems: OrderItem[] = (order.items || []).map((it) => ({ ...it }));
    setItems(clonedItems);
    const fee = Number(order.deliveryFee) || 0;
    setDeliveryFee(fee);
    const initialTotal = Number(order.totalAmount) || 0;
    setManualTotalStr(String(initialTotal));
    setIsTotalManuallyEdited(false);
    setMarkAllServed(true);
    setShowAddMenuDrawer(false);
    setSearchQuery('');
    setSelectedCategory('ทั้งหมด');
  }, [isOpen, order?.id]);

  const computedSubtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
  }, [items]);

  const computedTotal = computedSubtotal + (Number(deliveryFee) || 0);

  // Keep total synchronized automatically unless admin manually overrode it
  useEffect(() => {
    if (!isTotalManuallyEdited) {
      setManualTotalStr(String(computedTotal));
    }
  }, [computedTotal, isTotalManuallyEdited]);

  const categories = useMemo(
    () => Array.from(new Set(menus.map((m) => m.category))).filter(Boolean),
    [menus]
  );

  const filteredMenus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menus.filter((m) => {
      const matchCat = selectedCategory === 'ทั้งหมด' || m.category === selectedCategory;
      const matchSearch = !q || m.name.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [menus, selectedCategory, searchQuery]);

  if (!isOpen || !order) return null;

  const handleAdjustItemQty = (idx: number, delta: number) => {
    setItems((prev) => {
      const next = [...prev];
      const target = next[idx];
      if (!target) return prev;
      const newQty = (Number(target.quantity) || 1) + delta;
      if (newQty <= 0) {
        next.splice(idx, 1);
      } else {
        next[idx] = { ...target, quantity: newQty };
      }
      return next;
    });
  };

  const handleAddMenu = (menu: MenuItem) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((it) => it.menuId === menu.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: (Number(next[existingIdx].quantity) || 1) + 1,
        };
        return next;
      }
      return [
        ...prev,
        {
          menuId: menu.id,
          name: menu.name,
          price: Number(menu.price) || 0,
          quantity: 1,
          itemStatus: 'เสิร์ฟแล้ว',
        },
      ];
    });
    onNotify(`➕ เพิ่ม "${menu.name}" ลงบิลเช็คบิลแล้ว`, 'info');
  };

  const parsedFinalTotal = Math.max(0, Number(manualTotalStr) || 0);
  const adjustmentDiff = parsedFinalTotal - computedTotal;

  const handleConfirmCheckout = async (andPrint: boolean = false) => {
    if (items.length === 0) {
      onNotify('กรุณามีรายการอาหารอย่างน้อย 1 รายการก่อนเช็คบิล', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const checkedOutOrder = await finalizeOrderCheckout({
        order,
        finalItems: items,
        deliveryFee,
        finalTotalAmount: parsedFinalTotal,
        markAllItemsServed: markAllServed,
      });

      audioAlert.playOrderStatusAlert(
        {
          customerName: checkedOutOrder.customerName,
          tableNumber: checkedOutOrder.tableNumber,
          deliveryType: checkedOutOrder.deliveryType,
          orderNumber: checkedOutOrder.orderNumber,
          status: 'เช็คบิล',
        },
        'เช็คบิล'
      );

      const hasTable = Boolean(
        checkedOutOrder.tableNumber || /โต๊ะ\s*\d+/.test(checkedOutOrder.customerName || '')
      );
      onNotify(
        hasTable
          ? `💰 เช็คบิล #${checkedOutOrder.orderNumber} ยอด ฿${parsedFinalTotal.toLocaleString()} เรียบร้อย (คืนโต๊ะว่างแล้ว)`
          : `💰 เช็คบิล #${checkedOutOrder.orderNumber} ยอด ฿${parsedFinalTotal.toLocaleString()} เรียบร้อย`,
        'success'
      );

      onClose();
      if (andPrint && onPrintAfterCheckout) {
        onPrintAfterCheckout(checkedOutOrder);
      }
    } catch (err) {
      console.error('Checkout finalization error:', err);
      const msg = err instanceof Error ? err.message : 'ไม่สามารถเช็คบิลได้';
      onNotify(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-teal-200 overflow-hidden flex flex-col max-h-[94vh] text-stone-900">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/25 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-black tracking-tight truncate">
                💰 สรุปรายการเช็คบิล #{order.orderNumber}
              </h3>
              <p className="text-xs text-teal-100 truncate">
                {order.customerName || 'ลูกค้า'} • เพิ่มเมนูหรือแก้ไขยอดล่าสุดก่อนปิดบิลได้
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="ปิดหน้าต่างเช็คบิล"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 space-y-4 bg-stone-50/80 min-w-0">
          {/* Order Type Badge */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {renderDeliveryTypeBadge(order.deliveryType, order.tableNumber)}
            <button
              type="button"
              onClick={() => setShowAddMenuDrawer((prev) => !prev)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                showAddMenuDrawer
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-900 hover:bg-black text-amber-300'
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>คีย์เพิ่มรายการอาหาร</span>
              {showAddMenuDrawer ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Expandable Add Menu Picker */}
          {showAddMenuDrawer && (
            <div className="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-3 space-y-2.5 animate-fadeIn">
              <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                <div className="w-full sm:w-auto min-w-0 flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ทั้งหมด')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                      selectedCategory === 'ทั้งหมด'
                        ? 'bg-red-600 text-white'
                        : 'bg-white text-stone-700 border border-stone-200'
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-red-600 text-white'
                          : 'bg-white text-stone-700 border border-stone-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาเมนูที่จะเพิ่ม..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                {filteredMenus.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleAddMenu(m)}
                    className="flex items-center justify-between gap-2 p-2 bg-white hover:bg-amber-100/60 border border-stone-200 hover:border-amber-400 rounded-xl text-left transition active:scale-[0.98] cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={normalizeMenuImageUrl(m.imageUrl, m.name)}
                        alt={m.name}
                        className="w-8 h-8 rounded-lg object-cover bg-stone-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 truncate">{m.name}</div>
                        <div className="text-[11px] font-black text-red-600 tabular-nums">
                          ฿{m.price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <span className="w-7 h-7 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shrink-0">
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Itemized Summary Table with +/- Qty Adjustments */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between text-xs font-black text-stone-700">
              <span>รายการอาหารในบิล ({items.length} รายการ)</span>
              <span className="text-[11px] font-semibold text-stone-500">ปรับ +/- จำนวนได้ทันที</span>
            </div>

            {items.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400">
                ไม่มีรายการอาหาร (กดปุ่ม "คีย์เพิ่มรายการอาหาร" ด้านบนเพื่อเพิ่ม)
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {items.map((it, idx) => {
                  const lineTotal = (Number(it.price) || 0) * (Number(it.quantity) || 1);
                  return (
                    <div
                      key={`${it.menuId}_${idx}`}
                      className="p-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-stone-900 truncate">{it.name}</div>
                        <div className="text-[11px] text-stone-500 tabular-nums">
                          ฿{Number(it.price).toLocaleString()} / หน่วย
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAdjustItemQty(idx, -1)}
                          className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-rose-100 text-stone-800 hover:text-rose-700 flex items-center justify-center transition cursor-pointer"
                          title={it.quantity <= 1 ? 'ลบรายการนี้' : 'ลดจำนวน'}
                        >
                          {it.quantity <= 1 ? (
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          ) : (
                            <Minus className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className="w-7 text-center font-black text-sm text-stone-900 tabular-nums">
                          {it.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAdjustItemQty(idx, 1)}
                          className="w-8 h-8 rounded-lg bg-stone-900 hover:bg-black text-white flex items-center justify-center transition cursor-pointer"
                          title="เพิ่มจำนวน"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="w-16 text-right font-black text-stone-900 tabular-nums shrink-0">
                        ฿{lineTotal.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Totals & Latest Editable Total Box */}
          <div className="bg-white rounded-2xl border-2 border-teal-300 p-3.5 sm:p-4 space-y-3 shadow-xs w-full max-w-full overflow-hidden min-w-0">
            <div className="flex items-center justify-between gap-2 text-xs text-stone-600 font-semibold min-w-0">
              <span className="truncate">ค่าอาหารรวม (คำนวณจากรายการ):</span>
              <span className="font-black text-stone-900 tabular-nums shrink-0">
                ฿{computedSubtotal.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs text-stone-600 font-semibold min-w-0">
              <span className="truncate">ค่าจัดส่ง (บาท):</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Math.max(0, Number(e.target.value) || 0))}
                className="w-24 shrink-0 px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-right font-black text-stone-900 tabular-nums focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="pt-2.5 border-t border-stone-200 space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs sm:text-sm font-black text-stone-900">
                  💰 แก้ไขยอดรวมสุทธิล่าสุด (บาท):
                </label>
                {isTotalManuallyEdited && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsTotalManuallyEdited(false);
                      setManualTotalStr(String(computedTotal));
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>รีเซ็ตเป็น ฿{computedTotal.toLocaleString()}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full min-w-0">
                <span className="text-xl font-black text-red-600 shrink-0">฿</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={manualTotalStr}
                  onChange={(e) => {
                    setIsTotalManuallyEdited(true);
                    setManualTotalStr(e.target.value);
                  }}
                  className="w-full min-w-0 flex-1 px-3 py-2 bg-amber-50/60 border-2 border-teal-500 rounded-xl text-right text-xl sm:text-2xl font-black text-red-600 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-300"
                />
              </div>

              {adjustmentDiff !== 0 && (
                <div className="text-[11px] font-bold text-right text-amber-800">
                  {adjustmentDiff < 0
                    ? `ส่วนลด/ปรับลดจากยอดคำนวณ -฿${Math.abs(adjustmentDiff).toLocaleString()}`
                    : `ปรับเพิ่มจากยอดคำนวณ +฿${adjustmentDiff.toLocaleString()}`}
                </div>
              )}
            </div>

            <label className="flex items-start sm:items-center gap-2 pt-1 text-xs font-bold text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={markAllServed}
                onChange={(e) => setMarkAllServed(e.target.checked)}
                className="rounded accent-teal-600 w-4 h-4 shrink-0 mt-0.5 sm:mt-0"
              />
              <span className="leading-snug">อัปเดตสถานะทุกรายการอาหารเป็น &quot;ได้รับ/เสิร์ฟครบแล้ว&quot;</span>
            </label>
          </div>
        </div>

        {/* Footer Confirm Buttons */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            ยกเลิก
          </button>

          {onPrintAfterCheckout && (
            <button
              type="button"
              disabled={isSubmitting || items.length === 0}
              onClick={() => handleConfirmCheckout(true)}
              className="py-3 px-4 bg-amber-400 hover:bg-amber-500 active:scale-[0.98] disabled:bg-stone-200 text-stone-950 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>เช็คบิล &amp; พิมพ์บิล</span>
            </button>
          )}

          <button
            type="button"
            disabled={isSubmitting || items.length === 0}
            onClick={() => handleConfirmCheckout(false)}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-[0.98] disabled:bg-stone-300 text-white rounded-xl text-xs sm:text-sm font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer tabular-nums"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังเช็คบิล...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันเช็คบิล (฿{parsedFinalTotal.toLocaleString()})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
