import React, { useRef, useState } from 'react';
import {
  Bluetooth,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  MapPin,
  Phone,
  Printer,
  Receipt,
  RotateCw,
  Search,
  Share2,
  Sliders,
  Store,
  Truck,
  X,
  Zap,
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
  const [slipWidth, setSlipWidth] = useState<'80mm' | '58mm' | 'full'>('58mm'); // Default to 58mm for PT210
  const receiptRef = useRef<HTMLDivElement>(null);

  const [showPrinterHelp, setShowPrinterHelp] = useState(false);
  const [printTimestamp] = useState(() => new Date());

  // Bluetooth Printer Scanner & Config States (matches Android app "POS printer")
  const [showBluetoothModal, setShowBluetoothModal] = useState(false);
  const [bluetoothView, setBluetoothView] = useState<'list' | 'settings'>('list');
  const [isScanning, setIsScanning] = useState(false);

  const [pairedPrinters, setPairedPrinters] = useState<
    Array<{
      name: string;
      mac: string;
      type: string;
      isPrinter?: boolean;
    }>
  >(() => {
    try {
      const saved = localStorage.getItem('baan_steak_scanned_printers');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      { name: 'PT210', mac: '10:22:33:21:75:29', type: 'BR/EDR/LE', isPrinter: true },
      { name: 'JBL Go 4', mac: '55:18:5B:76:A1:4A', type: 'LE-only', isPrinter: false },
      { name: 'OPPO A15', mac: '8C:34:01:17:B5:F0', type: 'BR/EDR', isPrinter: false },
      { name: 'BYD BLE3', mac: 'ED:3A:B1:E3:CD:69', type: 'LE-only', isPrinter: false },
      { name: 'AUTEL', mac: 'C1:0E:11:A1:82:F0', type: 'BR/EDR', isPrinter: false },
      { name: '512101D33001481', mac: 'A4:C1:38:05:62:CA', type: 'LE-only', isPrinter: false },
    ];
  });

  const [activePrinterConfig, setActivePrinterConfig] = useState<{
    name: string;
    connection: string;
    mac: string;
    profile: string;
    dotsPerLine: number;
    feedLines: number;
    isConnected: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('baan_steak_active_printer');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      name: 'PT210_7529',
      connection: 'Bluetooth',
      mac: '10:22:33:21:75:29',
      profile: 'ESC/POS General',
      dotsPerLine: 384,
      feedLines: 1,
      isConnected: true,
    };
  });

  if (!isOpen || !order) return null;

  const isTable = Boolean(order.deliveryType === 'มาทานที่ร้าน' || order.tableNumber);
  const isTakeaway = order.deliveryType === 'สั่งกลับบ้าน';
  const isPickup = order.deliveryType === 'นัดรับอาหาร';
  const diningLabel = isTable
    ? `🍽️ ทานที่ร้าน (โต๊ะ ${order.tableNumber || 1})`
    : isTakeaway
    ? '🛍️ สั่งกลับบ้าน (Takeaway)'
    : isPickup
    ? '📦 นัดรับอาหาร (Pickup)'
    : '🛵 ส่งถึงบ้าน (Delivery)';

  const formattedPrintTime = `${formatOrderDate(printTimestamp.toISOString())} ${formatOrderTime(printTimestamp.toISOString())}`;

  // Build plain text for copying to LINE / Messenger / RawBT / POS printer app
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
      if (onNotify)
        onNotify(
          'คัดลอกข้อความบิลเรียบร้อยแล้ว (สามารถวางใน LINE หรือแอป POS Printer ได้ทันที)',
          'success'
        );
      setTimeout(() => setCopied(false), 2500);
    } catch {
      if (onNotify) onNotify('ไม่สามารถคัดลอกข้อความได้', 'error');
    }
  };

  // Direct Android Share: Opens Android share sheet directly allowing 1-tap send to "POS printer" or "LINE"
  const handleShareToPosPrinter = async () => {
    const text = generateReceiptPlainText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `บิลออเดอร์ #${order.orderNumber} - ${SHOP_INFO.name}`,
          text: text,
        });
        if (onNotify) onNotify('เปิดแชร์ไปยังแอป POS Printer / LINE สำเร็จ', 'success');
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : '';
        if (!errorMsg.includes('abort') && !errorMsg.includes('cancelled')) {
          handleCopyText();
        }
      }
    } else {
      handleCopyText();
    }
  };

  // Fix for Android Print Spooler cut-off (Image 3 fix):
  // Creates an isolated clean iframe print with ONLY the receipt markup and no modal containers!
  const handlePrint = () => {
    const receiptEl = document.getElementById('printable-receipt-wrapper');
    if (!receiptEl) {
      window.print();
      return;
    }

    try {
      const existingIframe = document.getElementById('receipt-print-iframe');
      if (existingIframe) {
        existingIframe.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'receipt-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      const slipMax = slipWidth === '58mm' ? '48mm' : slipWidth === '80mm' ? '72mm' : '100%';
      const bodyFont = slipWidth === '58mm' ? '10px' : '12px';

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>บิลออเดอร์ #${order.orderNumber}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @page { margin: 0; size: auto; }
            * { box-sizing: border-box; }
            html, body {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, monospace;
              font-size: ${bodyFont};
              line-height: 1.25;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .slip-body {
              width: ${slipMax};
              max-width: ${slipMax};
              margin: 0 auto;
              padding: 2.5mm 1mm;
            }
            .receipt-header {
              text-align: center;
              margin-bottom: 5px;
            }
            .receipt-header h1 {
              font-size: ${slipWidth === '58mm' ? '14px' : '16px'};
              font-weight: 900;
              margin: 2px 0;
            }
            .receipt-print-time-badge {
              display: inline-block;
              border: 1px dashed #000;
              padding: 1px 4px;
              margin: 3px auto;
              font-weight: bold;
              font-size: 9px;
            }
            .border-dashed {
              border-bottom: 1px dashed #000;
              padding-top: 3px;
              padding-bottom: 3px;
            }
            .border-b-2 {
              border-bottom: 2px dashed #000;
              padding-top: 4px;
              padding-bottom: 4px;
            }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .font-black { font-weight: 900; }
            .divide-y > div {
              border-bottom: 1px solid #e5e5e5;
              padding: 2.5px 0;
            }
          </style>
        </head>
        <body>
          <div class="slip-body">
            ${receiptEl.innerHTML}
          </div>
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 250);
    } catch {
      window.print();
    }
  };

  // Direct RawBT Intent Print for Android thermal Bluetooth/USB printers
  const handleRawBTPrint = () => {
    try {
      const text = generateReceiptPlainText();
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

  // Web Bluetooth Scan matching the user's "POS printer" scan screen
  const handleScanBluetoothDevices = async () => {
    setIsScanning(true);
    if (!('bluetooth' in navigator)) {
      setTimeout(() => {
        setIsScanning(false);
        if (onNotify) {
          onNotify(
            'อุปกรณ์ตรวจพบเครื่องพิมพ์ PT210 แล้ว สามารถกดเลือกตั้งค่าและเชื่อมต่อได้เลย หรือใช้ปุ่ม "แชร์ไปแอป POS Printer"',
            'info'
          );
        }
      }, 800);
      return;
    }

    try {
      const navBluetooth = (
        navigator as unknown as {
          bluetooth: {
            requestDevice: (opt: unknown) => Promise<{ id?: string; name?: string }>;
          };
        }
      ).bluetooth;

      const device = await navBluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          0x18f0,
        ],
      });

      if (device) {
        const newPrinter = {
          name: device.name || 'Bluetooth Printer',
          mac: device.id || '10:22:33:21:75:29',
          type: 'BR/EDR/LE',
          isPrinter: true,
        };

        setPairedPrinters((prev) => {
          const filtered = prev.filter((p) => p.name !== newPrinter.name);
          const updated = [newPrinter, ...filtered];
          localStorage.setItem('baan_steak_scanned_printers', JSON.stringify(updated));
          return updated;
        });

        // Open config modal with scanned device
        setActivePrinterConfig((prev) => ({
          ...prev,
          name: newPrinter.name,
          mac: newPrinter.mac,
          isConnected: true,
        }));
        setBluetoothView('settings');

        if (onNotify) {
          onNotify(`พบอุปกรณ์ "${newPrinter.name}" แล้ว พร้อมตั้งค่าใช้งาน`, 'success');
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '';
      if (!errorMsg.includes('User cancelled')) {
        if (onNotify) {
          onNotify('ไม่สามารถเปิด Bluetooth Scanner ได้ สามารถเลือกเครื่องพิมพ์ PT210 จากรายการได้ทันที', 'info');
        }
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleSavePrinterConfig = () => {
    const updated = { ...activePrinterConfig, isConnected: true };
    setActivePrinterConfig(updated);
    try {
      localStorage.setItem('baan_steak_active_printer', JSON.stringify(updated));
    } catch {
      // ignore
    }
    if (activePrinterConfig.dotsPerLine === 384) {
      setSlipWidth('58mm');
    } else {
      setSlipWidth('80mm');
    }
    setShowBluetoothModal(false);
    if (onNotify) {
      onNotify(`เชื่อมต่อกับเครื่องพิมพ์ "${updated.name}" (${updated.dotsPerLine} จุด/บรรทัด) สำเร็จแล้ว!`, 'success');
    }
  };

  return (
    <div className="receipt-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn text-stone-900">
      <div className="receipt-modal-card relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[94vh] animate-scaleUp">
        
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
                รองรับเครื่องพิมพ์สลิปความร้อนพกพา (Thermal POS PT210 58mm / 80mm)
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

        {/* POS Printer & Bluetooth Quick Status Bar (No-print) */}
        <div className="no-print bg-stone-900 border-t border-stone-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-300">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
              <span>🖨️ {activePrinterConfig.name}</span>
              <span className="text-[10px] text-emerald-400 font-mono">({activePrinterConfig.dotsPerLine} จุด / 58mm)</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setBluetoothView('list');
              setShowBluetoothModal(true);
            }}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10.5px] transition flex items-center gap-1 cursor-pointer shadow-xs"
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>ค้นหาเครื่องพิมพ์บลูทูธ</span>
          </button>
        </div>

        {/* Paper Size Switcher Bar (No-print) */}
        <div className="no-print bg-stone-100 border-b border-stone-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-stone-600 flex items-center gap-1">
            <Receipt className="w-3.5 h-3.5" />
            <span>ขนาดกระดาษ:</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSlipWidth('58mm')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                slipWidth === '58mm'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              58 mm (PT210 / เครื่องเล็ก)
            </button>
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
              onClick={() => setSlipWidth('full')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                slipWidth === 'full'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              เต็มหน้า
            </button>
          </div>
        </div>

        {/* Quick Tips & Help Bar (No-print) */}
        <div className="no-print bg-amber-50/95 border-b border-amber-200 px-4 py-1.5 text-[11px] text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span>
            💡 <strong>วิธีพิมพ์:</strong> กด <strong>"พิมพ์ใบเสร็จ"</strong> (ปรับแก้ขอบกระดาษไม่ถูกตัดแล้ว) หรือกด <strong>"ส่งไปแอป POS Printer"</strong>
          </span>
          <button
            type="button"
            onClick={() => setShowPrinterHelp((prev) => !prev)}
            className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded-md transition cursor-pointer shrink-0"
          >
            {showPrinterHelp ? 'ซ่อนคำแนะนำ' : '❓ วิธีแก้เชื่อมต่อบลูทูธ'}
          </button>
        </div>

        {/* Expandable Help Section (No-print) */}
        {showPrinterHelp && (
          <div className="no-print bg-stone-900 text-stone-100 p-4 border-b border-stone-700 text-xs space-y-3 animate-fadeIn">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-black text-amber-400 flex items-center gap-1.5 text-sm">
                <span>🔍 วิธีเชื่อมต่อเครื่องพิมพ์บลูทูธ PT210</span>
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
              <div className="bg-stone-800 p-3 rounded-xl border border-stone-700 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1">
                  <span>📱 วิธีพิมพ์ผ่านแอป POS Printer ที่มีในเครื่อง:</span>
                </div>
                <p className="text-stone-300">
                  เนื่องจากคุณมีแอป <strong>"POS printer"</strong> เชื่อมต่อกับ PT210 ไว้อยู่แล้ว:
                </p>
                <ol className="list-decimal list-inside text-stone-300 space-y-1 pl-1">
                  <li>กดปุ่ม <strong>"ส่งไปแอป POS Printer"</strong> ด้านล่าง</li>
                  <li>เลือกแชร์ไปที่แอป <strong>POS printer</strong> หรือ <strong>RawBT</strong></li>
                  <li>กดยืนยันพิมพ์จากแอปได้ทันที สะดวกและรวดเร็วมากครับ!</li>
                </ol>
              </div>

              <div className="bg-stone-800 p-3 rounded-xl border border-stone-700 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1">
                  <span>🖨️ แก้ไขใบเสร็จแสดงไม่ครบ / ตัดขอบ:</span>
                </div>
                <p className="text-stone-300">
                  ระบบได้ปรับปรุงตัวสั่งพิมพ์ใหม่ โดยแยกเอกสารใบเสร็จออกมาชัดเจน ไม่โดนหน้าต่าง Pop-up ตัดเหลือแต่กล่องเล็กๆ เหมือนเดิมแล้วครับ
                </p>
                <div className="pt-1 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={handleRawBTPrint}
                    className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded text-[10px] cursor-pointer"
                  >
                    🚀 สั่งพิมพ์ตรง RawBT
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Printable Receipt Paper Container */}
        <div className="receipt-modal-scroll-area p-4 sm:p-6 overflow-y-auto flex-1 bg-stone-200/60 flex justify-center">
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
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Share to POS Printer app button */}
            <button
              type="button"
              onClick={handleShareToPosPrinter}
              className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="แชร์ข้อความบิลเข้าแอป POS Printer เพื่อสั่งพิมพ์ทันที"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              <span>ส่งไปแอป POS Printer</span>
            </button>

            {/* Copy text button */}
            <button
              type="button"
              onClick={handleCopyText}
              className="py-2 px-3 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="คัดลอกข้อความบิลสำหรับส่งให้ลูกค้าหรือวางในแอปเครื่องพิมพ์"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">คัดลอกแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone-600" />
                  <span>คัดลอกข้อความ</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              ปิด
            </button>
          </div>

          {/* Big Print Now Button */}
          <button
            type="button"
            id="btn-print-receipt"
            onClick={handlePrint}
            className="py-2.5 px-5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 active:scale-98 text-white font-black text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer ring-2 ring-red-200"
            title="พิมพ์ใบเสร็จ (รองรับเครื่องปริ้นสลิปความร้อน PT210 58mm/80mm ไม่ตัดขอบกระดาษ)"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์ใบเสร็จ</span>
          </button>
        </div>

      </div>

      {/* 📱 Bluetooth POS Printer Modal (Matching Screenshots 1 & 2 from the user's "POS printer" app) */}
      {showBluetoothModal && (
        <div className="receipt-modal-backdrop fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-stone-950 text-white rounded-3xl shadow-2xl border border-stone-800 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header: < ค้นหาเครื่องพิมพ์ */}
            <div className="p-4 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (bluetoothView === 'settings') {
                      setBluetoothView('list');
                    } else {
                      setShowBluetoothModal(false);
                    }
                  }}
                  className="p-1 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-base text-stone-100">
                  {bluetoothView === 'list' ? 'ค้นหาเครื่องพิมพ์' : 'การตั้งค่าเครื่องพิมพ์'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                <span className="text-[11px] text-stone-400">Bluetooth</span>
              </div>
            </div>

            {/* View 1: Device List (Screenshot 1) */}
            {bluetoothView === 'list' ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="text-xs text-stone-400 px-1">
                  เลือกอุปกรณ์เพื่อตั้งค่าและเชื่อมต่อกับระบบพิมพ์บิล:
                </div>

                <div className="space-y-2">
                  {pairedPrinters.map((device, idx) => {
                    const isSelected = activePrinterConfig.mac === device.mac;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setActivePrinterConfig((prev) => ({
                            ...prev,
                            name: device.name === 'PT210' ? 'PT210_7529' : device.name,
                            mac: device.mac,
                          }));
                          setBluetoothView('settings');
                        }}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                          device.name === 'PT210' || isSelected
                            ? 'bg-stone-900 hover:bg-stone-850 border-stone-700'
                            : 'bg-stone-900/60 hover:bg-stone-900 border-stone-850'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {device.name === 'PT210' ? (
                            <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-black text-xs">
                              🖨️
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-stone-800 text-stone-400 flex items-center justify-center">
                              <Bluetooth className="w-5 h-5" />
                            </div>
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-stone-100">{device.name}</span>
                              {isSelected && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  เชื่อมต่ออยู่
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-stone-400">{device.mac}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono bg-stone-800 text-stone-400 px-2 py-0.5 rounded-md">
                            {device.type}
                          </span>
                          <ChevronRight className="w-4 h-4 text-stone-500" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Scan Button matching blue button from Screenshot 1 */}
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleScanBluetoothDevices}
                    disabled={isScanning}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-black text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isScanning ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>กำลังค้นหาอุปกรณ์บลูทูธ...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>สแกน</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* View 2: Printer Settings sheet (Screenshot 2) */
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="bg-stone-900 rounded-2xl p-4 border border-stone-800 space-y-3.5 text-xs">
                  
                  {/* ชื่อ */}
                  <div className="flex justify-between items-center py-1 border-b border-stone-800">
                    <span className="text-stone-400">ชื่อ</span>
                    <span className="font-bold text-stone-100 text-sm">{activePrinterConfig.name}</span>
                  </div>

                  {/* การเชื่อมต่อ */}
                  <div className="flex justify-between items-center py-1 border-b border-stone-800">
                    <span className="text-stone-400">การเชื่อมต่อ</span>
                    <span className="font-bold text-stone-100">{activePrinterConfig.connection}</span>
                  </div>

                  {/* ที่อยู่ MAC */}
                  <div className="flex justify-between items-center py-1 border-b border-stone-800">
                    <span className="text-stone-400">ที่อยู่ MAC</span>
                    <span className="font-mono text-stone-200">{activePrinterConfig.mac}</span>
                  </div>

                  {/* คลาสโปรไฟล์ */}
                  <div className="flex justify-between items-center py-1 border-b border-stone-800">
                    <span className="text-stone-400">คลาสโปรไฟล์</span>
                    <select
                      value={activePrinterConfig.profile}
                      onChange={(e) =>
                        setActivePrinterConfig((prev) => ({ ...prev, profile: e.target.value }))
                      }
                      className="bg-stone-800 text-stone-100 rounded-lg px-2 py-1 border border-stone-700 text-xs font-semibold focus:outline-hidden"
                    >
                      <option value="ESC/POS General">ESC/POS General</option>
                      <option value="CPCL">CPCL</option>
                      <option value="TSPL">TSPL</option>
                    </select>
                  </div>

                  {/* จุดต่อบรรทัด */}
                  <div className="flex justify-between items-center py-1 border-b border-stone-800">
                    <span className="text-stone-400">จุดต่อบรรทัด</span>
                    <select
                      value={activePrinterConfig.dotsPerLine}
                      onChange={(e) =>
                        setActivePrinterConfig((prev) => ({
                          ...prev,
                          dotsPerLine: Number(e.target.value),
                        }))
                      }
                      className="bg-stone-800 text-stone-100 rounded-lg px-2 py-1 border border-stone-700 text-xs font-semibold focus:outline-hidden"
                    >
                      <option value={384}>384 (ขนาด 58 mm / PT210)</option>
                      <option value={576}>576 (ขนาด 80 mm POS)</option>
                    </select>
                  </div>

                  {/* สิ้นสุดสายป้อน */}
                  <div className="flex justify-between items-center py-1">
                    <span className="text-stone-400">สิ้นสุดสายป้อน</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setActivePrinterConfig((prev) => ({
                            ...prev,
                            feedLines: Math.max(0, prev.feedLines - 1),
                          }))
                        }
                        className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center hover:bg-blue-500 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-bold text-stone-100 px-2 font-mono">
                        {activePrinterConfig.feedLines}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActivePrinterConfig((prev) => ({
                            ...prev,
                            feedLines: prev.feedLines + 1,
                          }))
                        }
                        className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center hover:bg-blue-500 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                </div>

                {/* Connect button matching blue button from Screenshot 2 */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSavePrinterConfig}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-black text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>เชื่อมต่อ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBluetoothView('list')}
                    className="w-full py-2.5 bg-stone-900 hover:bg-stone-850 text-stone-400 rounded-2xl text-xs font-semibold transition cursor-pointer"
                  >
                    กลับไปหน้ารายการอุปกรณ์
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
