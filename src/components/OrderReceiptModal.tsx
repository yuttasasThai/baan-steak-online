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

  const [showPrinterHelp, setShowPrinterHelp] = useState(false);
  const [printTimestamp] = useState(() => new Date());

  if (!isOpen || !order) return null;

  const isTable = Boolean(order.deliveryType === 'มาทานที่ร้าน' || order.tableNumber);
  const isPickup = order.deliveryType === 'นัดรับอาหาร';
  const diningLabel = isTable
    ? `🍽️ ทานที่ร้าน (โต๊ะ ${order.tableNumber || 1})`
    : isPickup
    ? '🛍️ นัดรับกลับบ้าน (Pickup)'
    : '🛵 ส่งถึงบ้าน (Delivery)';

  const formattedPrintTime = `${formatOrderDate(printTimestamp.toISOString())} ${formatOrderTime(printTimestamp.toISOString())}`;

  // Build plain text for copying to LINE / Messenger / RawBT
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
วันที่สั่ง: ${formatOrderDate(order.createdAt)} เวลา: ${formatOrderTime(order.createdAt)}
พิมพ์เมื่อ: ${formattedPrintTime}
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
      if (onNotify) onNotify('คัดลอกข้อความบิลเรียบร้อยแล้ว (สามารถวางใน LINE หรือแอปเครื่องพิมพ์ได้ทันที)', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      if (onNotify) onNotify('ไม่สามารถคัดลอกข้อความได้', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Direct RawBT Intent Print for Android thermal Bluetooth/USB printers
  const handleRawBTPrint = () => {
    try {
      const text = generateReceiptPlainText();
      // RawBT URL scheme accepts UTF-8 encoded text via rawbt:data:text/plain;base64,
      const utf8Bytes = new TextEncoder().encode(text);
      let binary = '';
      for (let i = 0; i < utf8Bytes.length; i++) {
        binary += String.fromCharCode(utf8Bytes[i]);
      }
      const base64 = btoa(binary);
      window.location.href = `rawbt:data:text/plain;base64,${base64}`;
      if (onNotify) onNotify('กำลังส่งข้อมูลไปยังแอปเครื่องพิมพ์ RawBT...', 'info');
    } catch {
      handlePrint();
    }
  };

  // Web Bluetooth Direct Print Attempt (if browser supports Web Bluetooth)
  const handleBluetoothDirectPrint = async () => {
    if (!('bluetooth' in navigator)) {
      setShowPrinterHelp(true);
      if (onNotify) {
        onNotify('เบราว์เซอร์นี้ไม่รองรับ Web Bluetooth โดยตรง แนะนำติดตั้งแอป RawBT Print Service แล้วกดพิมพ์ปกติ', 'info');
      }
      return;
    }

    try {
      if (onNotify) onNotify('กำลังเปิดหน้าต่างค้นหาเครื่องพิมพ์ Bluetooth...', 'info');
      // Request any bluetooth device with printer-like services or acceptAllDevices
      const navBluetooth = (navigator as unknown as { bluetooth: { requestDevice: (opt: unknown) => Promise<{ name?: string }> } }).bluetooth;
      const device = await navBluetooth.requestDevice({
        acceptAllDevices: true,
      });
      if (device && onNotify) {
        onNotify(`เชื่อมต่อกับเครื่องพิมพ์ "${device.name || 'Bluetooth Printer'}" แล้ว ให้กดปุ่มพิมพ์ใบเสร็จ`, 'success');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '';
      if (!errorMsg.includes('User cancelled')) {
        setShowPrinterHelp(true);
      }
    }
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
                รองรับเครื่องพิมพ์สลิปความร้อน (Thermal POS 80mm/58mm) และเครื่องพิมพ์ทั่วไป
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
        <div className="no-print bg-stone-100 border-b border-stone-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-stone-600 flex items-center gap-1">
            <Receipt className="w-3.5 h-3.5" />
            <span>ขนาดสลิป:</span>
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

        {/* Quick thermal printer tip & Printer Help Button (No-print) */}
        <div className="no-print bg-amber-50/95 border-b border-amber-200 px-4 py-2 text-[11px] text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span>
            💡 <strong>ตั้งค่าเครื่องปริ้นสลิป:</strong> ระยะขอบ (Margins) = <strong>ไม่มี (None)</strong>, ปิด <strong>หัวกระดาษ/ท้ายกระดาษ</strong>
          </span>
          <button
            type="button"
            onClick={() => setShowPrinterHelp((prev) => !prev)}
            className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded-md transition cursor-pointer shrink-0"
          >
            {showPrinterHelp ? 'ซ่อนคำแนะนำ' : '❓ ค้นหาเครื่องพิมพ์ไม่เจอ? คลิกดูวิธีแก้'}
          </button>
        </div>

        {/* Printer Help Expandable Panel (No-print) */}
        {showPrinterHelp && (
          <div className="no-print bg-stone-900 text-stone-100 p-4 border-b border-stone-700 text-xs space-y-3 animate-fadeIn">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-black text-amber-400 flex items-center gap-1.5 text-sm">
                <span>🔍 วิธีแก้ปัญหา: ค้นหาเครื่องพิมพ์ไม่เจอในหน้าพิมพ์</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowPrinterHelp(false)}
                className="text-stone-400 hover:text-white p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed">
              {/* สำหรับมือถือ Android / แท็บเล็ต */}
              <div className="bg-stone-800 p-3 rounded-xl border border-stone-700 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1">
                  <span>📱 สำหรับมือถือ Android / แท็บเล็ต (บลูทูธ):</span>
                </div>
                <p className="text-stone-300">
                  เครื่องพิมพ์ความร้อนบลูทูธ (Bluetooth POS) จะ<strong>ไม่แสดงในหน้าพิมพ์ของเบราว์เซอร์</strong>จนกว่าจะติดตั้ง Print Service ในมือถือ:
                </p>
                <ol className="list-decimal list-inside text-stone-300 space-y-1 pl-1">
                  <li>
                    เปิด Play Store ค้นหาแอป <strong>"RawBT Print Service"</strong> หรือ <strong>"ESC POS Bluetooth Print Service"</strong> (โหลดฟรี)
                  </li>
                  <li>
                    ไปที่ <strong>การตั้งค่ามือถือ (Settings) &gt; อุปกรณ์ที่เชื่อมต่อ &gt; การพิมพ์ (Printing)</strong> แล้วกดเปิดใช้งาน Service
                  </li>
                  <li>กลับมากด <strong>"พิมพ์ใบเสร็จ"</strong> เครื่องพิมพ์บลูทูธจะโผล่ขึ้นมาให้เลือกทันทีครับ!</li>
                </ol>
                <div className="pt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={handleRawBTPrint}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-lg text-[10px] transition cursor-pointer"
                  >
                    🚀 สั่งพิมพ์ตรงผ่านแอป RawBT ทันที
                  </button>
                  <button
                    type="button"
                    onClick={handleBluetoothDirectPrint}
                    className="px-2.5 py-1.5 bg-stone-700 hover:bg-stone-600 text-white font-bold rounded-lg text-[10px] transition cursor-pointer"
                  >
                    📶 ค้นหาเครื่องพิมพ์ Bluetooth (Web Bluetooth)
                  </button>
                </div>
              </div>

              {/* สำหรับคอมพิวเตอร์ Windows / Mac */}
              <div className="bg-stone-800 p-3 rounded-xl border border-stone-700 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1">
                  <span>💻 สำหรับคอมพิวเตอร์ (Windows / Mac USB):</span>
                </div>
                <ol className="list-decimal list-inside text-stone-300 space-y-1 pl-1">
                  <li>เสียบสาย USB เครื่องพิมพ์เข้ากับคอมพิวเตอร์ และเปิดสวิตช์เครื่องพิมพ์</li>
                  <li>
                    ติดตั้งไดรเวอร์เครื่องพิมพ์ (เช่น POS-58 / POS-80 Driver หรือ Xprinter Driver) โดยเลือกพอร์ตเป็น <strong>USB001</strong>
                  </li>
                  <li>ในหน้าต่างสั่งพิมพ์ของ Chrome ที่ช่อง <strong>ปลายทาง (Destination)</strong> ให้เลือกชื่อเครื่องพิมพ์ความร้อนที่ติดตั้ง</li>
                </ol>
                <div className="p-2 bg-stone-900/80 rounded-lg text-emerald-400 text-[10.5px] font-medium border border-stone-700">
                  ✨ <strong>เคล็ดลับ:</strong> หากต่อเครื่องพิมพ์ไม่ได้ สามารถกดปุ่ม <strong>"คัดลอกข้อความบิล"</strong> เพื่อนำข้อความไปส่งใน LINE หรือวางพิมพ์ในแอปของเครื่องพิมพ์ได้ทันทีครับ
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Printable Receipt Paper Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-stone-200/60 flex justify-center">
          <div
            id="printable-receipt-wrapper"
            data-slip-size={slipWidth}
            ref={receiptRef}
            style={{
              maxWidth: slipWidth === '58mm' ? '280px' : slipWidth === '80mm' ? '380px' : '100%',
              width: '100%',
            }}
            className={`bg-white p-4 sm:p-5 shadow-md border border-stone-300 font-mono text-stone-900 text-xs transition-all duration-150 leading-relaxed rounded-xl ${
              slipWidth === '58mm' ? 'slip-58mm' : slipWidth === '80mm' ? 'slip-80mm' : ''
            }`}
          >
            {/* 🎯 Header: Shop Logo, Name & Centered Info */}
            <div className="receipt-header text-center flex flex-col items-center justify-center space-y-1 border-b-2 border-dashed border-stone-400 pb-2.5">
              {/* Emblem / Shop Icon */}
              <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center font-black text-sm mb-0.5 shadow-2xs mx-auto border border-stone-800">
                🥩
              </div>
              <h1 className="shop-name-title text-base sm:text-lg font-black text-stone-950 font-sans tracking-tight text-center">
                {SHOP_INFO.name}
              </h1>
              <p className="text-[11px] text-stone-600 text-center">{SHOP_INFO.slogan}</p>
              <p className="text-[11px] text-stone-700 font-semibold text-center">
                โทร: {SHOP_INFO.phone} {SHOP_INFO.lineId ? `• LINE: ${SHOP_INFO.lineId}` : ''}
              </p>

              {/* 📅 แสดงวันที่และเวลาที่พิมพ์บนหัวใบเสร็จเด่นชัด */}
              <div className="receipt-print-time-badge inline-block bg-stone-100 text-stone-900 border border-stone-400 rounded px-2 py-0.5 text-[10.5px] font-bold mt-1 text-center font-sans">
                📅 พิมพ์เมื่อ: {formattedPrintTime}
              </div>
            </div>

            {/* Receipt Meta & Dining Badge */}
            <div className="py-2 border-b border-dashed border-stone-400 space-y-1 text-[11px]">
              <div className="flex justify-between items-center font-sans font-bold">
                <span className="text-stone-500">เลขออเดอร์:</span>
                <span className="text-sm font-black text-red-700">#{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">วันที่สั่ง:</span>
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
            id="btn-print-receipt"
            onClick={handlePrint}
            className="py-2.5 px-5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 active:scale-98 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer ring-2 ring-red-200"
            title="พิมพ์ใบเสร็จผ่าน window.print() รองรับเครื่องปริ้นสลิปความร้อน 58mm/80mm"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ใบเสร็จ</span>
          </button>
        </div>

      </div>
    </div>
  );
};
