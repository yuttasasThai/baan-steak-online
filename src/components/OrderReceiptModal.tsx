import React, { useRef, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  MapPin,
  Phone,
  Printer,
  Receipt,
  Store,
  Truck,
  X,
} from 'lucide-react';
import { Order } from '../types';
import { SHOP_INFO } from '../services/menuService';
import { formatOrderDate, formatOrderTime } from './AdminOrdersManager';

interface OrderReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
  onNotify,
}) => {
  const [copied, setCopied] = useState(false);
  const [slipWidth, setSlipWidth] = useState<'80mm' | '58mm' | 'full'>('80mm');
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const isTable = Boolean(order.deliveryType === 'มาทานที่ร้าน' || order.tableNumber);
  const isPickup = order.deliveryType === 'นัดรับอาหาร';
  const diningLabel = isTable
    ? `🍽️ ทานที่ร้าน (โต๊ะ ${order.tableNumber || 1})`
    : isPickup
    ? '🛍️ นัดรับกลับบ้าน (Pickup)'
    : '🛵 ส่งถึงบ้าน (Delivery)';

  // Build plain text for copying to LINE / Messenger
  const generateReceiptPlainText = () => {
    const itemsText = order.items
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.name} x${it.quantity} = ฿${(it.price * it.quantity).toLocaleString()}`
      )
      .join('\n');

    return `🧾 ใบเสร็จ / ใบแจ้งออเดอร์
ร้าน: ${SHOP_INFO.name}
โทร: ${SHOP_INFO.phone}
--------------------------------
เลขออเดอร์: #${order.orderNumber}
วันที่: ${formatOrderDate(order.createdAt)} เวลา: ${formatOrderTime(order.createdAt)}
รูปแบบ: ${diningLabel}
ลูกค้า: ${order.customerName}
เบอร์โทร: ${order.customerPhone || '-'}
${order.address ? `ที่อยู่จัดส่ง: ${order.address}\n` : ''}${
      order.gps ? `พิกัด GPS: ${order.gps.lat.toFixed(5)}, ${order.gps.lng.toFixed(5)}\n` : ''
    }--------------------------------
รายการอาหาร:
${itemsText}
--------------------------------
ค่าอาหารรวม: ฿${order.subtotal.toLocaleString()}
ค่าจัดส่ง: ${order.deliveryFee === 0 ? 'ฟรี 0 บาท' : `฿${order.deliveryFee.toLocaleString()}`}
--------------------------------
ยอดรวมสุทธิ: ฿${order.totalAmount.toLocaleString()} บาท
--------------------------------
สถานะ: ${order.status || 'รับออเดอร์'}
🙏 ขอบพระคุณที่ใช้บริการครับ`;
  };

  const handleCopyText = async () => {
    try {
      const text = generateReceiptPlainText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      if (onNotify) onNotify('คัดลอกข้อความบิลเรียบร้อยแล้ว (สามารถวางใน LINE ได้ทันที)', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      if (onNotify) onNotify('ไม่สามารถคัดลอกข้อความได้', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn text-stone-900">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[94vh] animate-scaleUp">
        
        {/* Modal Top Header (No-print) */}
        <div className="no-print bg-stone-900 text-white p-4 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-black shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base leading-tight">
                  พิมพ์ใบเสร็จออเดอร์ #{order.orderNumber}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-stone-950">
                  {order.status || 'รับออเดอร์'}
                </span>
              </div>
              <p className="text-[11px] text-stone-300">
                รองรับทั้งเครื่องพิมพ์สลิปความร้อน (Thermal POS 80mm/58mm) และเครื่องพิมพ์ทั่วไป
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Size Switcher Bar (No-print) */}
        <div className="no-print bg-stone-100 border-b border-stone-200 px-4 py-2 flex items-center justify-between gap-2 text-xs">
          <span className="font-bold text-stone-600 flex items-center gap-1">
            <Receipt className="w-3.5 h-3.5" />
            <span>ความกว้างสลิป:</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSlipWidth('80mm')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                slipWidth === '80mm'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              80 mm (มาตรฐาน POS)
            </button>
            <button
              type="button"
              onClick={() => setSlipWidth('58mm')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                slipWidth === '58mm'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              58 mm (สลิปเล็ก)
            </button>
            <button
              type="button"
              onClick={() => setSlipWidth('full')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                slipWidth === 'full'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              เต็มหน้าจอ
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-stone-200/60 flex justify-center">
          <div
            id="printable-receipt-wrapper"
            ref={receiptRef}
            style={{
              maxWidth: slipWidth === '58mm' ? '280px' : slipWidth === '80mm' ? '380px' : '100%',
              width: '100%',
            }}
            className="bg-white p-4 sm:p-5 shadow-md border border-stone-300 font-mono text-stone-900 text-xs transition-all duration-150 leading-relaxed rounded-xl"
          >
            {/* Header: Shop Name & Info */}
            <div className="text-center space-y-0.5 border-b-2 border-dashed border-stone-400 pb-3">
              <h1 className="text-base sm:text-lg font-black text-stone-950 font-sans tracking-tight">
                {SHOP_INFO.name}
              </h1>
              <p className="text-[11px] text-stone-600">{SHOP_INFO.slogan}</p>
              <p className="text-[11px] text-stone-700 font-semibold">
                โทร: {SHOP_INFO.phone}
              </p>
              {SHOP_INFO.lineId && (
                <p className="text-[10px] text-stone-500">LINE: {SHOP_INFO.lineId}</p>
              )}
            </div>

            {/* Receipt Meta & Dining Badge */}
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1 text-[11px]">
              <div className="flex justify-between items-center font-sans font-bold">
                <span className="text-stone-500">เลขออเดอร์:</span>
                <span className="text-sm font-black text-red-700">#{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">วันที่:</span>
                <span className="font-semibold">{formatOrderDate(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">เวลาสั่ง:</span>
                <span className="font-semibold">{formatOrderTime(order.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-stone-500">รูปแบบ:</span>
                <span className="font-bold text-stone-900 bg-stone-100 px-1.5 py-0.5 rounded">
                  {diningLabel}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">สถานะ:</span>
                <span className="font-bold text-stone-900">
                  {order.status || 'รับออเดอร์'}
                </span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="py-2.5 border-b border-dashed border-stone-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-stone-500">ชื่อลูกค้า:</span>
                <strong className="text-stone-900 text-right">{order.customerName}</strong>
              </div>
              {order.customerPhone && order.customerPhone !== '-' && (
                <div className="flex justify-between">
                  <span className="text-stone-500">เบอร์โทร:</span>
                  <span className="font-bold text-stone-900">{order.customerPhone}</span>
                </div>
              )}
              {order.address && (
                <div className="pt-1 text-[11px]">
                  <span className="text-stone-500 block">ที่อยู่จัดส่ง:</span>
                  <span className="text-stone-800 font-sans block leading-tight mt-0.5">
                    {order.address}
                  </span>
                </div>
              )}
              {order.gps && (
                <div className="text-[10px] text-stone-500 pt-0.5">
                  พิกัด GPS: {order.gps.lat.toFixed(5)}, {order.gps.lng.toFixed(5)}
                  {typeof order.distanceKm === 'number' && ` (${order.distanceKm} กม.)`}
                </div>
              )}
            </div>

            {/* Food Items Ordered Table */}
            <div className="py-2.5 border-b-2 border-dashed border-stone-400">
              <div className="flex justify-between text-[11px] font-bold text-stone-900 pb-1.5 border-b border-stone-300">
                <span>รายการอาหาร</span>
                <div className="flex gap-4">
                  <span className="w-8 text-center">จน.</span>
                  <span className="w-12 text-right">รวม</span>
                </div>
              </div>

              <div className="divide-y divide-stone-200/70 pt-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-1 flex justify-between items-start gap-1 text-[11px]">
                    <div className="flex-1 pr-1">
                      <div className="font-sans font-bold text-stone-950 leading-tight">
                        {idx + 1}. {item.name}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        @฿{item.price.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-4 shrink-0 font-bold">
                      <span className="w-8 text-center">x{item.quantity}</span>
                      <span className="w-12 text-right">
                        ฿{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & Calculations */}
            <div className="py-2.5 space-y-1 text-[11px] border-b-2 border-dashed border-stone-400">
              <div className="flex justify-between text-stone-700">
                <span>ค่าอาหารรวม:</span>
                <span>฿{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>ค่าจัดส่ง:</span>
                <span>{order.deliveryFee === 0 ? 'ฟรี 0 บาท' : `฿${order.deliveryFee.toLocaleString()}`}</span>
              </div>

              {order.earnedRewardsNotice && order.earnedRewardsNotice.length > 0 && (
                <div className="flex justify-between text-emerald-700 text-[10px] font-bold">
                  <span>สิทธิพิเศษ:</span>
                  <span>{order.earnedRewardsNotice.join(', ')}</span>
                </div>
              )}

              <div className="pt-2 mt-1 border-t border-stone-300 flex justify-between items-center text-sm font-black text-stone-950">
                <span className="font-sans uppercase tracking-tight text-xs">ยอดสุทธิ (TOTAL):</span>
                <span className="text-base text-red-600">฿{order.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Slip Footer Message */}
            <div className="pt-3 text-center space-y-1 text-[10px] text-stone-600">
              <p className="font-bold text-stone-800">
                🙏 ขอบพระคุณที่อุดหนุน {SHOP_INFO.name} ครับ/ค่ะ
              </p>
              <p className="text-[9px] text-stone-400">
                ใบเสร็จพิมพ์เมื่อ: {formatOrderDate(new Date().toISOString())}{' '}
                {formatOrderTime(new Date().toISOString())}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Buttons (No-print) */}
        <div className="no-print p-3 sm:p-4 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="py-2.5 px-3.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="คัดลอกข้อความบิลสำหรับส่งให้ลูกค้าหรือไรเดอร์ทาง LINE"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">คัดลอกแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-600" />
                  <span>คัดลอกข้อความบิล</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-3.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-2xl text-xs font-bold transition cursor-pointer"
            >
              ปิด
            </button>
          </div>

          {/* Big Print Now Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="py-2.5 px-5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 active:scale-98 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer ring-2 ring-red-200"
          >
            <Printer className="w-4 h-4" />
            <span>🖨️ พิมพ์บิลทันที (Print)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
