import React, { useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Gift,
  Loader2,
  MapPin,
  Minimize2,
  Phone,
  Store,
  Truck,
  Utensils,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Order } from '../types';
import { formatOrderTime } from './AdminOrdersManager';

interface IncomingOrderModalProps {
  isOpen: boolean;
  pendingOrders: Order[];
  onAcceptOrder: (order: Order) => Promise<void>;
  onAcceptAllOrders?: () => Promise<void>;
  onCancelOrder: (order: Order, reason?: string) => Promise<void>;
  onClose: () => void;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
}

export const IncomingOrderModal: React.FC<IncomingOrderModalProps> = ({
  isOpen,
  pendingOrders,
  onAcceptOrder,
  onAcceptAllOrders,
  onCancelOrder,
  onClose,
  isSoundEnabled,
  onToggleSound,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('วัตถุดิบหมด / ร้านไม่สะดวกรับ');

  if (!isOpen || pendingOrders.length === 0) return null;

  // Clamp index within bounds
  const currentIndex = Math.min(selectedIndex, pendingOrders.length - 1);
  const activeOrder = pendingOrders[currentIndex] || pendingOrders[0];

  const isTable = Boolean(activeOrder.deliveryType === 'มาทานที่ร้าน' || activeOrder.tableNumber);
  const isPickup = activeOrder.deliveryType === 'นัดรับอาหาร';

  const handleAcceptSingle = async () => {
    if (!activeOrder || isProcessing) return;
    setIsProcessing(true);
    try {
      await onAcceptOrder(activeOrder);
      if (currentIndex >= pendingOrders.length - 1) {
        setSelectedIndex(Math.max(0, pendingOrders.length - 2));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptAll = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      if (onAcceptAllOrders) {
        await onAcceptAllOrders();
      } else {
        for (const order of pendingOrders) {
          await onAcceptOrder(order);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!activeOrder || isProcessing) return;
    setIsProcessing(true);
    try {
      await onCancelOrder(activeOrder, cancelReason);
      setShowCancelPrompt(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border-2 border-red-500 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        
        {/* Top Header Bar: Urgent Pulse & Audio Control */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-3.5 sm:p-4 flex items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-2xl bg-white/20 text-white shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                  🚨 มีออเดอร์เข้าใหม่!
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-stone-950 shadow-xs">
                  รอรับ {pendingOrders.length} รายการ
                </span>
              </div>
              <p className="text-[11px] text-red-100 font-medium">
                {isSoundEnabled ? '🔊 มีเสียงพูดเตือนซ้ำจนกว่าจะกดรับ' : '🔇 ปิดเสียงเตือนอยู่'}
              </p>
            </div>
          </div>

          {/* Quick Header Actions: Mute sound & Minimize */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleSound}
              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                isSoundEnabled
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-amber-400 text-stone-950'
              }`}
              title={isSoundEnabled ? 'กดเพื่อปิดเสียงเตือนชั่วคราว' : 'กดเพื่อเปิดเสียงเตือน'}
            >
              {isSoundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span className="hidden sm:inline text-[11px]">เปิดเสียง</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span className="hidden sm:inline text-[11px]">ปิดเสียง</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
              title="ย่อหน้าต่าง (เสียงยังเตือนซ้ำอยู่)"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Multi-Order Tabs Selector (if > 1 order pending) */}
        {pendingOrders.length > 1 && (
          <div className="bg-stone-100 border-b border-stone-200 px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {pendingOrders.map((ord, idx) => {
                const isSelected = idx === currentIndex;
                const label = ord.tableNumber
                  ? `โต๊ะ ${ord.tableNumber}`
                  : ord.deliveryType === 'นัดรับอาหาร'
                  ? 'นัดรับ'
                  : `ออเดอร์ ${idx + 1}`;

                return (
                  <button
                    key={ord.id}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-red-600 text-white shadow-xs scale-102'
                        : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-[10px] opacity-80">#{ord.orderNumber.slice(-4)}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAcceptAll}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:bg-stone-300 text-white text-xs font-black rounded-xl shadow-xs transition shrink-0 whitespace-nowrap flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>รับทั้งหมด ({pendingOrders.length})</span>
            </button>
          </div>
        )}

        {/* Order Details Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Main Hero Table / Delivery Badge */}
          <div
            className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 shadow-xs ${
              isTable
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-400 text-amber-950'
                : isPickup
                ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-400 text-amber-950'
                : 'bg-gradient-to-r from-sky-50 to-blue-50 border-sky-400 text-sky-950'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs shrink-0 ${
                  isTable ? 'bg-amber-400 text-white' : isPickup ? 'bg-amber-400 text-white' : 'bg-sky-500 text-white'
                }`}
              >
                {isTable ? '🍽️' : isPickup ? '🛍️' : '🛵'}
              </div>
              <div>
                <div className="text-lg sm:text-xl font-black tracking-tight">
                  {isTable
                    ? `โต๊ะ ${activeOrder.tableNumber || 1} (ทานที่ร้าน)`
                    : isPickup
                    ? 'นัดรับอาหารที่ร้าน (Pickup)'
                    : 'จัดส่งถึงบ้าน (Delivery)'}
                </div>
                <div className="text-xs font-semibold opacity-80 flex items-center gap-2 mt-0.5">
                  <span>ออเดอร์ #{activeOrder.orderNumber}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatOrderTime(activeOrder.createdAt)}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block px-2.5 py-1 bg-red-600 text-white rounded-full text-xs font-black shadow-xs animate-pulse">
                🔴 รอรับออเดอร์
              </span>
            </div>
          </div>

          {/* Customer Info Box */}
          <div className="bg-stone-50 rounded-2xl p-3 sm:p-3.5 border border-stone-200 text-xs text-stone-800 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-stone-500 font-medium">ชื่อผู้สั่ง:</span>
              <strong className="text-stone-900 font-extrabold text-sm">
                {activeOrder.customerName || (activeOrder.tableNumber ? `โต๊ะ ${activeOrder.tableNumber}` : 'ลูกค้า')}
              </strong>
            </div>

            {activeOrder.customerPhone && activeOrder.customerPhone !== '-' && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-stone-500 font-medium">เบอร์โทรศัพท์:</span>
                <a
                  href={`tel:${activeOrder.customerPhone.replace(/[^0-9]/g, '')}`}
                  className="font-bold text-red-600 hover:text-red-700 flex items-center gap-1 underline"
                >
                  <Phone className="w-3 h-3" />
                  <span>{activeOrder.customerPhone}</span>
                </a>
              </div>
            )}

            {activeOrder.address && (
              <div className="flex items-start justify-between gap-2 pt-1 border-t border-stone-200">
                <span className="text-stone-500 font-medium shrink-0">ที่อยู่/จุดสังเกต:</span>
                <span className="text-right text-stone-700 font-medium">{activeOrder.address}</span>
              </div>
            )}

            {activeOrder.earnedRewardsNotice && activeOrder.earnedRewardsNotice.length > 0 && (
              <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px] font-bold flex items-center gap-1.5 mt-1">
                <Gift className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>สิทธิพิเศษ: {activeOrder.earnedRewardsNotice.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Food Items Ordered List */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center justify-between">
              <span>รายการอาหารที่สั่ง ({activeOrder.items?.length || 0} รายการ)</span>
              <span className="text-[11px] text-stone-500 font-normal">จำนวน/ราคา</span>
            </div>

            <div className="bg-stone-50 rounded-2xl border border-stone-200 divide-y divide-stone-200 overflow-hidden">
              {activeOrder.items?.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-red-100 text-red-700 font-black text-xs flex items-center justify-center shrink-0">
                      {item.quantity}x
                    </span>
                    <span className="font-bold text-stone-900 text-sm">{item.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-stone-900">
                      ฿{(item.price * item.quantity).toLocaleString()}
                    </span>
                    {item.quantity > 1 && (
                      <span className="text-[10px] text-stone-500 block">
                        (฿{item.price} / จาน)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Totals */}
          <div className="bg-stone-100/70 p-3.5 rounded-2xl border border-stone-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-stone-600">
              <span>ค่าอาหารรวม:</span>
              <span className="font-semibold">฿{activeOrder.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-stone-600">
              <span>ค่าจัดส่ง:</span>
              <span className="font-semibold">
                {activeOrder.deliveryFee === 0 ? 'ฟรี 0 บาท' : `฿${activeOrder.deliveryFee}`}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-stone-300 text-sm sm:text-base font-black text-stone-900">
              <span>ยอดรวมสุทธิ:</span>
              <span className="text-xl sm:text-2xl text-red-600">
                ฿{activeOrder.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Cancel Confirmation Prompt */}
          {showCancelPrompt && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2 text-xs text-rose-950 animate-fadeIn">
              <div className="flex items-center gap-1.5 font-bold text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>ยืนยันการปฏิเสธ / ยกเลิกออเดอร์นี้?</span>
              </div>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="ระบุเหตุผล เช่น วัตถุดิบหมด"
                className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs"
              />
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(false)}
                  className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 rounded-xl text-xs font-semibold text-stone-700"
                >
                  กลับไป
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  ยืนยันยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Big Bottom Action Buttons: Accept / Cancel */}
        <div className="p-3.5 sm:p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row gap-2.5">
          {/* Big Green Primary Accept Button */}
          <button
            type="button"
            onClick={handleAcceptSingle}
            disabled={isProcessing}
            className="flex-1 py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-700 hover:to-green-800 active:scale-98 disabled:bg-stone-300 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ring-4 ring-emerald-200"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>กำลังดำเนินการ...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  ✅ กดรับออเดอร์ ({isTable ? `โต๊ะ ${activeOrder.tableNumber || 1}` : 'เริ่มทำอาหาร'})
                </span>
              </>
            )}
          </button>

          {/* Secondary Actions */}
          <div className="flex items-center gap-2">
            {!showCancelPrompt && (
              <button
                type="button"
                onClick={() => setShowCancelPrompt(true)}
                className="py-3 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shrink-0"
                title="ปฏิเสธหรือไม่รับออเดอร์นี้"
              >
                <Ban className="w-4 h-4" />
                <span className="hidden sm:inline">ปฏิเสธ</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-3.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shrink-0"
              title="ย่อหน้าต่างชั่วคราว"
            >
              <Minimize2 className="w-4 h-4" />
              <span>ย่อหน้าต่าง</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
