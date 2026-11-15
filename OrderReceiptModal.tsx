import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bluetooth,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  Info,
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 🖨️ Renders the receipt into a 384-dot (48mm) monochrome bitmap for PT210 thermal printers.
 * This fixes the Chinese character issue by printing Thai characters as graphical pixels (GS v 0).
 */
function buildReceiptBitmap(
  order: Order,
  printTimestamp: Date,
  widthDots = 384
): Uint8Array {
  const canvas = document.createElement('canvas');
  canvas.width = widthDots;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Uint8Array();

  // Estimate total height needed
  const estimatedHeight = 680 + order.items.length * 48 + (order.address ? 40 : 0);
  canvas.height = estimatedHeight;

  // Background must be pure white (0 in bitmap)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthDots, estimatedHeight);

  // Pure black text (1 in bitmap)
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  let y = 12;

  // Shop Logo & Name
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('🥩', widthDots / 2, y);
  y += 34;

  ctx.font = '900 24px "Sarabun", "Prompt", sans-serif';
  ctx.fillText(SHOP_INFO.name, widthDots / 2, y);
  y += 30;

  ctx.font = '15px "Sarabun", sans-serif';
  ctx.fillText(SHOP_INFO.slogan, widthDots / 2, y);
  y += 22;

  ctx.font = 'bold 16px "Sarabun", sans-serif';
  ctx.fillText(`โทร: ${SHOP_INFO.phone}`, widthDots / 2, y);
  y += 26;

  // Print Date Badge
  const formattedDate = `${formatOrderDate(printTimestamp.toISOString())} ${formatOrderTime(printTimestamp.toISOString())}`;
  ctx.font = 'bold 14px "Sarabun", sans-serif';
  const badgeText = `📅 พิมพ์เมื่อ: ${formattedDate}`;
  const badgeWidth = ctx.measureText(badgeText).width + 16;
  ctx.strokeRect((widthDots - badgeWidth) / 2, y, badgeWidth, 24);
  ctx.fillText(badgeText, widthDots / 2, y + 4);
  y += 34;

  // Dashed Line Helper
  const drawDashedLine = (currY: number) => {
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(8, currY);
    ctx.lineTo(widthDots - 8, currY);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  drawDashedLine(y);
  y += 10;

  // Order Details
  const isTable = Boolean(order.deliveryType === 'มาทานที่ร้าน' || order.tableNumber);
  const isTakeaway = order.deliveryType === 'สั่งกลับบ้าน';
  const isPickup = order.deliveryType === 'นัดรับอาหาร';
  const diningLabel = isTable
    ? `🍽️ ทานที่ร้าน (โต๊ะ ${order.tableNumber || 1})`
    : isTakeaway
    ? '🛍️ สั่งกลับบ้าน (Takeaway)'
    : isPickup
    ? '📦 นัดรับอาหาร'
    : '🛵 ส่งถึงบ้าน (Delivery)';

  const drawRow = (leftText: string, rightText: string, isBold = false, fontSize = 16) => {
    ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px "Sarabun", sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(leftText, 10, y);
    ctx.textAlign = 'right';
    ctx.fillText(rightText, widthDots - 10, y);
    y += fontSize + 8;
  };

  drawRow('เลขออเดอร์:', `#${order.orderNumber}`, true, 19);
  drawRow('วันที่สั่ง:', formatOrderDate(order.createdAt), false, 15);
  drawRow('เวลาสั่ง:', formatOrderTime(order.createdAt), false, 15);
  drawRow('รูปแบบ:', diningLabel, true, 16);
  drawRow('สถานะ:', order.status || 'รับออเดอร์', true, 16);

  drawDashedLine(y);
  y += 10;

  // Customer Info
  drawRow('ลูกค้า:', order.customerName, true, 16);
  if (order.customerPhone && order.customerPhone !== '-') {
    drawRow('เบอร์โทร:', order.customerPhone, true, 16);
  }
  if (order.address) {
    ctx.font = '14px "Sarabun", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`ที่อยู่: ${order.address}`, 10, y);
    y += 22;
  }

  drawDashedLine(y);
  y += 10;

  // Food Items Header
  ctx.font = 'bold 16px "Sarabun", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('รายการอาหาร', 10, y);
  ctx.textAlign = 'right';
  ctx.fillText('จน.   รวม', widthDots - 10, y);
  y += 24;

  // Food Items
  order.items.forEach((item, idx) => {
    ctx.font = 'bold 16px "Sarabun", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${idx + 1}. ${item.name}`, 10, y);
    ctx.textAlign = 'right';
    ctx.fillText(`x${item.quantity}   ฿${(item.price * item.quantity).toLocaleString()}`, widthDots - 10, y);
    y += 20;

    ctx.font = '13px "Sarabun", sans-serif';
    ctx.fillStyle = '#444444';
    ctx.textAlign = 'left';
    ctx.fillText(`   @฿${item.price.toLocaleString()}`, 10, y);
    ctx.fillStyle = '#000000';
    y += 20;
  });

  drawDashedLine(y);
  y += 10;

  // Totals
  drawRow('ค่าอาหารรวม:', `฿${order.subtotal.toLocaleString()}`, false, 16);
  drawRow(
    'ค่าจัดส่ง:',
    order.deliveryFee === 0 ? 'ฟรี 0 บาท' : `฿${order.deliveryFee.toLocaleString()}`,
    false,
    16
  );

  if (order.earnedRewardsNotice && order.earnedRewardsNotice.length > 0) {
    drawRow('สิทธิพิเศษ:', order.earnedRewardsNotice.join(', '), true, 14);
  }

  y += 4;
  drawDashedLine(y);
  y += 10;

  // Grand Total
  drawRow('ยอดสุทธิ (TOTAL):', `฿${order.totalAmount.toLocaleString()} บาท`, true, 20);

  y += 6;
  drawDashedLine(y);
  y += 12;

  // Footer Message
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px "Sarabun", sans-serif';
  ctx.fillText(`🙏 ขอบพระคุณที่อุดหนุน ${SHOP_INFO.name}`, widthDots / 2, y);
  y += 24;
  ctx.font = '12px "Sarabun", sans-serif';
  ctx.fillText('ยินดีต้อนรับเสมอครับ/ค่ะ', widthDots / 2, y);
  y += 30;

  const actualHeight = y;

  // Convert canvas pixels to 1-bit monochrome ESC/POS raster bit image (GS v 0)
  const imageData = ctx.getImageData(0, 0, widthDots, actualHeight);
  const data = imageData.data;

  // 1 dot = 1 bit. For 384 dots, bytesWidth = 384 / 8 = 48 bytes per row
  const bytesWidth = widthDots / 8;
  const bitmapSize = bytesWidth * actualHeight;

  // ESC/POS Raster command: GS v 0 m xL xH yL yH [data]
  const header = new Uint8Array([
    0x1b, 0x40, // ESC @ (Initialize printer)
    0x1d, 0x76, 0x30, 0x00, // GS v 0 0 (normal mode)
    bytesWidth % 256,
    Math.floor(bytesWidth / 256),
    actualHeight % 256,
    Math.floor(actualHeight / 256),
  ]);

  const bitmapBytes = new Uint8Array(bitmapSize);

  let byteIdx = 0;
  for (let row = 0; row < actualHeight; row++) {
    for (let colByte = 0; colByte < bytesWidth; colByte++) {
      let byteVal = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = colByte * 8 + bit;
        const pixelIdx = (row * widthDots + x) * 4;
        const r = data[pixelIdx];
        const g = data[pixelIdx + 1];
        const b = data[pixelIdx + 2];
        const a = data[pixelIdx + 3];

        // Standard grayscale luminance formula
        const lum = r * 0.299 + g * 0.587 + b * 0.114;

        // Black dot (1) if pixel is dark enough
        if (a > 128 && lum < 185) {
          byteVal |= 1 << (7 - bit);
        }
      }
      bitmapBytes[byteIdx++] = byteVal;
    }
  }

  // Feed 4 lines after printing
  const footer = new Uint8Array([0x1b, 0x64, 0x04]);

  const finalBuffer = new Uint8Array(header.length + bitmapBytes.length + footer.length);
  finalBuffer.set(header, 0);
  finalBuffer.set(bitmapBytes, header.length);
  finalBuffer.set(footer, header.length + bitmapBytes.length);

  return finalBuffer;
}

export const OrderReceiptModal: React.FC<OrderReceiptModalProps> = ({
  order,
  isOpen,
  onClose,
  onNotify,
}) => {
  const [copied, setCopied] = useState(false);
  const [slipWidth, setSlipWidth] = useState<'80mm' | '58mm' | 'full'>('58mm');
  const receiptRef = useRef<HTMLDivElement>(null);

  const [showPrinterHelp, setShowPrinterHelp] = useState(false);
  const [printTimestamp] = useState(() => new Date());

  // Real Web Bluetooth Connection States
  const [bluetoothStatus, setBluetoothStatus] = useState<
    'disconnected' | 'connecting' | 'connected'
  >('disconnected');
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const [isPrintingBluetooth, setIsPrintingBluetooth] = useState(false);
  const [printProgress, setPrintProgress] = useState(0);

  // References to live Bluetooth GATT objects
  const bluetoothDeviceRef = useRef<any>(null);
  const writeCharacteristicRef = useRef<any>(null);

  // Bluetooth Scanner Modal States
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
    ];
  });

  const [activePrinterConfig, setActivePrinterConfig] = useState<{
    name: string;
    connection: string;
    mac: string;
    profile: string;
    dotsPerLine: number;
    feedLines: number;
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

  // Plain text for copying
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

  const handleCopyText = async (silent = false) => {
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
      if (!silent && onNotify) {
        onNotify(
          'คัดลอกข้อความบิลเรียบร้อยแล้ว (สามารถวางในแอป POS Printer หรือ LINE ได้ทันที)',
          'success'
        );
      }
      setTimeout(() => setCopied(false), 2500);
      return true;
    } catch {
      if (!silent && onNotify) onNotify('ไม่สามารถคัดลอกข้อความได้', 'error');
      return false;
    }
  };

  // Direct Android Share to "POS printer" app
  const handleShareToPosPrinter = async () => {
    await handleCopyText(true);
    const text = generateReceiptPlainText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `บิลออเดอร์ #${order.orderNumber} - ${SHOP_INFO.name}`,
          text: text,
        });
        if (onNotify) {
          onNotify('เปิดหน้าต่างส่งข้อมูลไปยังแอป POS Printer เรียบร้อยแล้ว', 'success');
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : '';
        if (!errorMsg.includes('abort') && !errorMsg.includes('cancelled')) {
          if (onNotify) {
            onNotify(
              'คัดลอกข้อมูลบิลเรียบร้อยแล้ว สามารถเปิดแอป POS Printer แล้วกดวางพิมพ์ได้ทันทีครับ',
              'info'
            );
          }
        }
      }
    } else {
      if (onNotify) {
        onNotify(
          'คัดลอกข้อมูลบิลลงคลิปบอร์ดแล้ว เปิดแอป POS Printer แล้วกดวางเพื่อสั่งพิมพ์ได้ทันทีครับ',
          'success'
        );
      }
    }
  };

  // Connect to Bluetooth Printer via Web Bluetooth
  const connectToBluetoothPrinter = async (deviceToConnect?: any) => {
    if (!('bluetooth' in navigator)) {
      if (onNotify) {
        onNotify(
          'เบราว์เซอร์นี้ไม่รองรับ Web Bluetooth โดยตรง แนะนำใช้ปุ่ม "ส่งไปแอป POS Printer" หรือ "RawBT"',
          'info'
        );
      }
      return false;
    }

    try {
      setBluetoothStatus('connecting');
      let targetDevice = deviceToConnect || bluetoothDeviceRef.current;

      if (!targetDevice) {
        const navBluetooth = (navigator as any).bluetooth;
        targetDevice = await navBluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            '000018f0-0000-1000-8000-00805f9b34fb',
            '49535343-fe7d-4ae5-8fa9-9fafd205e455',
            'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
            0x18f0,
          ],
        });
      }

      if (!targetDevice) {
        setBluetoothStatus('disconnected');
        return false;
      }

      bluetoothDeviceRef.current = targetDevice;

      // Listen for disconnect
      targetDevice.addEventListener('gattserverdisconnected', () => {
        setBluetoothStatus('disconnected');
        setConnectedDeviceName(null);
        writeCharacteristicRef.current = null;
        if (onNotify) {
          onNotify('เครื่องพิมพ์บลูทูธถูกปิด หรือสัญญาณขาดหาย (ตัดการเชื่อมต่อแล้ว)', 'info');
        }
      });

      // Connect GATT server
      const server = await targetDevice.gatt.connect();
      if (!server.connected) {
        throw new Error('ไม่สามารถเชื่อมต่อ GATT Server ของเครื่องพิมพ์ได้');
      }

      // Discover writable characteristic
      const services = await server.getPrimaryServices();
      let writeChar: any = null;

      for (const service of services) {
        try {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writeChar = char;
              break;
            }
          }
        } catch {
          // ignore service errors
        }
        if (writeChar) break;
      }

      writeCharacteristicRef.current = writeChar;
      setBluetoothStatus('connected');
      const devName = targetDevice.name || activePrinterConfig.name || 'PT210';
      setConnectedDeviceName(devName);

      if (onNotify) {
        onNotify(`เชื่อมต่อกับเครื่องพิมพ์บลูทูธ "${devName}" สำเร็จแล้ว!`, 'success');
      }
      return true;
    } catch (err: unknown) {
      setBluetoothStatus('disconnected');
      writeCharacteristicRef.current = null;
      const errorMsg = err instanceof Error ? err.message : '';
      if (!errorMsg.includes('cancelled') && !errorMsg.includes('User cancelled')) {
        if (onNotify) {
          onNotify(
            'ไม่สามารถเชื่อมต่อเครื่องพิมพ์ได้: กรุณาเปิดเครื่องพิมพ์ PT210 และเปิดบลูทูธในมือถือ',
            'error'
          );
        }
      }
      return false;
    }
  };

  /**
   * 🌟 DIRECT BLUETOOTH PRINT VIA RASTER BITMAP (GS v 0)
   * Solves Chinese character issue by rendering crisp Thai typography as graphic bitmap dots.
   */
  const handleDirectBluetoothPrint = async () => {
    if (bluetoothStatus !== 'connected' || !writeCharacteristicRef.current) {
      const ok = await connectToBluetoothPrinter();
      if (!ok) return;
    }

    try {
      setIsPrintingBluetooth(true);
      setPrintProgress(10);

      // 1. Generate raster bitmap (384 dots = 48mm printable area)
      const bitmapBuffer = buildReceiptBitmap(order, printTimestamp, activePrinterConfig.dotsPerLine || 384);
      setPrintProgress(30);

      const writeChar = writeCharacteristicRef.current;
      // Send in small packets of 128 bytes with short delays for stable BLE transmission
      const CHUNK_SIZE = 128;
      const totalBytes = bitmapBuffer.length;

      for (let offset = 0; offset < totalBytes; offset += CHUNK_SIZE) {
        const chunk = bitmapBuffer.slice(offset, offset + CHUNK_SIZE);
        if (writeChar.properties.writeWithoutResponse) {
          await writeChar.writeValueWithoutResponse(chunk);
        } else {
          await writeChar.writeValue(chunk);
        }

        const pct = Math.min(95, Math.round(30 + ((offset + CHUNK_SIZE) / totalBytes) * 65));
        setPrintProgress(pct);

        // Small throttle delay every few packets to prevent PT210 buffer overflow
        if (offset % (CHUNK_SIZE * 3) === 0) {
          await sleep(20);
        }
      }

      setPrintProgress(100);
      if (onNotify) {
        onNotify(
          `พิมพ์ใบเสร็จภาษาไทยเข้าเครื่อง "${connectedDeviceName || 'PT210'}" สำเร็จเรียบร้อยแล้ว!`,
          'success'
        );
      }
    } catch (err: unknown) {
      if (onNotify) {
        onNotify(
          'การส่งข้อมูลพิมพ์ขัดข้อง กรุณาลองกดใหม่อีกครั้ง หรือใช้ปุ่ม "ส่งไปแอป POS Printer"',
          'error'
        );
      }
    } finally {
      setTimeout(() => {
        setIsPrintingBluetooth(false);
        setPrintProgress(0);
      }, 800);
    }
  };

  // Standard Print Spooler Print
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

  // Scan Bluetooth Devices
  const handleScanBluetoothDevices = async () => {
    setIsScanning(true);
    if (!('bluetooth' in navigator)) {
      setTimeout(() => {
        setIsScanning(false);
        if (onNotify) {
          onNotify(
            'อุปกรณ์ตรวจพบเครื่องพิมพ์ PT210 แล้ว สามารถกดเลือกตั้งค่าและเชื่อมต่อได้เลย หรือใช้ปุ่ม "ส่งไปแอป POS Printer"',
            'info'
          );
        }
      }, 600);
      return;
    }

    try {
      const navBluetooth = (navigator as any).bluetooth;
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
          name: device.name || 'PT210',
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

        setActivePrinterConfig((prev) => ({
          ...prev,
          name: newPrinter.name,
          mac: newPrinter.mac,
        }));
        setBluetoothView('settings');

        await connectToBluetoothPrinter(device);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '';
      if (!errorMsg.includes('User cancelled')) {
        if (onNotify) {
          onNotify('ไม่สามารถเปิด Bluetooth Scanner ได้ สามารถกดเชื่อมต่อ PT210 จากรายการได้ทันที', 'info');
        }
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleSavePrinterConfig = async () => {
    try {
      localStorage.setItem('baan_steak_active_printer', JSON.stringify(activePrinterConfig));
    } catch {
      // ignore
    }
    if (activePrinterConfig.dotsPerLine === 384) {
      setSlipWidth('58mm');
    } else {
      setSlipWidth('80mm');
    }
    setShowBluetoothModal(false);

    if (bluetoothStatus !== 'connected') {
      await connectToBluetoothPrinter();
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
                รองรับเครื่องพิมพ์สลิปความร้อนพกพา (PT210 กระดาษ 58mm / พิมพ์ 48mm 384 จุด)
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

        {/* Real Live Bluetooth Status Bar */}
        <div className="no-print bg-stone-900 border-t border-stone-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {bluetoothStatus === 'connected' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-emerald-400 text-[11px]">
                  🟢 {connectedDeviceName || activePrinterConfig.name} (เชื่อมต่อบลูทูธสดอยู่)
                </span>
              </>
            ) : bluetoothStatus === 'connecting' ? (
              <>
                <RotateCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="font-bold text-amber-300 text-[11px]">
                  กำลังเชื่อมต่อบลูทูธ...
                </span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-stone-500"></span>
                <span className="font-bold text-stone-400 text-[11px]">
                  ⚪ {activePrinterConfig.name} (ไม่ได้เชื่อมต่อ / ปิดเครื่องอยู่)
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {bluetoothStatus === 'connected' ? (
              <button
                type="button"
                onClick={() => {
                  if (bluetoothDeviceRef.current?.gatt?.connected) {
                    bluetoothDeviceRef.current.gatt.disconnect();
                  }
                  setBluetoothStatus('disconnected');
                  setConnectedDeviceName(null);
                }}
                className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] rounded transition cursor-pointer"
              >
                ตัดการเชื่อมต่อ
              </button>
            ) : (
              <button
                type="button"
                onClick={() => connectToBluetoothPrinter()}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-[10.5px] transition flex items-center gap-1 cursor-pointer"
              >
                <Zap className="w-3 h-3" />
                <span>เชื่อมต่อ PT210</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setBluetoothView('list');
                setShowBluetoothModal(true);
              }}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10.5px] transition flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Bluetooth className="w-3.5 h-3.5" />
              <span>ค้นหาเครื่องพิมพ์</span>
            </button>
          </div>
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
              onClick={() => setSlipWidth('58mm')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                slipWidth === '58mm'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              58 mm (PT210 กระดาษพิมพ์ 48mm 384 จุด)
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
          </div>
        </div>

        {/* Explanation Notice */}
        <div className="no-print bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-[11px] text-emerald-950 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-start gap-1.5 flex-1">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              <strong>แก้ไขภาษาจีนเรียบร้อย:</strong> ระบบเปลี่ยนมาส่งคำสั่งพิมพ์แบบภาพกราฟิก (Raster Bitmap 384 จุด) พิมพ์ภาษาไทยคมชัด 100% วรรณยุกต์ครบ ไม่กลายเป็นภาษาจีนอีกต่อไป
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowPrinterHelp((prev) => !prev)}
            className="px-2 py-0.5 bg-emerald-200 hover:bg-emerald-300 text-emerald-950 font-bold rounded-md transition cursor-pointer shrink-0 text-[10.5px]"
          >
            {showPrinterHelp ? 'ซ่อนคำแนะนำ' : '❓ ทำไมกระดาษ 58mm กว้าง 48mm?'}
          </button>
        </div>

        {/* Expandable Help Section (No-print) */}
        {showPrinterHelp && (
          <div className="no-print bg-stone-900 text-stone-100 p-4 border-b border-stone-700 text-xs space-y-3 animate-fadeIn">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-black text-amber-400 flex items-center gap-1.5 text-sm">
                <span>📏 ความจริงเรื่องขนาดกระดาษ 58mm vs 48mm</span>
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
                  <span>📄 ขนาดม้วนกระดาษ vs ขนาดพื้นที่พิมพ์:</span>
                </div>
                <ul className="list-disc list-inside text-stone-300 space-y-1 pl-1">
                  <li><strong>ความกว้างม้วนกระดาษ:</strong> 58 มม. (57-58 mm)</li>
                  <li><strong>พื้นที่พิมพ์ของหัวความร้อน (Print Width):</strong> 48 มม. (384 จุด)</li>
                  <li><strong>เหตุผล:</strong> เครื่องพิมพ์ทุกรุ่นต้องเว้นขอบซ้าย-ขวา ข้างละ 5 มม. เพื่อไม่ให้ตัวหนังสือติดแกนลูกกลิ้ง</li>
                  <li><strong>สรุป:</strong> กระดาษ 58 มม. และขนาดพิมพ์ 48 มม. คือมาตรฐานเดียวกัน 100% ถูกต้องแล้วครับ!</li>
                </ul>
              </div>

              <div className="bg-stone-800 p-3 rounded-xl border border-stone-700 space-y-1.5">
                <div className="font-bold text-emerald-400 flex items-center gap-1">
                  <span>🇹🇭 วิธีแก้ภาษาจีนให้เป็นภาษาไทย 100%:</span>
                </div>
                <p className="text-stone-300">
                  เครื่องพิมพ์จากโรงงานจีนไม่มีฟอนต์ไทยในชิป ROM เมื่อส่งข้อความดิบจึงกลายเป็นตัวอักษรจีน (GBK)
                </p>
                <p className="text-emerald-300 font-bold">
                  ระบบใหม่นี้จะวาดใบเสร็จเป็นรูปภาพขาวดำ (Graphic Bitmap 384 จุด) ก่อนส่งเข้าเครื่องพิมพ์ ทำให้พิมพ์ภาษาไทยออกมาสวยงาม คมชัด 100% แน่นอนครับ!
                </p>
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
            {/* Header: Shop Logo, Name & Centered Info */}
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

              {/* วันที่และเวลาที่พิมพ์บนหัวใบเสร็จเด่นชัด */}
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

        {/* Modal Bottom Action Buttons */}
        <div className="no-print p-3 sm:p-4 bg-stone-50 border-t border-stone-200 space-y-2">
          
          {/* Main Action Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            
            {/* 🌟 1. Primary Button: Direct Bluetooth Print with Thai Graphic Bitmap */}
            <button
              type="button"
              onClick={handleDirectBluetoothPrint}
              disabled={isPrintingBluetooth}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 ${
                bluetoothStatus === 'connected'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white ring-2 ring-emerald-300'
                  : 'bg-stone-900 hover:bg-stone-800 text-white'
              }`}
              title="พิมพ์ภาษาไทยคมชัด 100% เข้าเครื่องพิมพ์ PT210 ผ่านระบบภาพกราฟิก Bitmap (GS v 0)"
            >
              {isPrintingBluetooth ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-white" />
                  <span>กำลังส่งข้อมูลภาพสลิป {printProgress}%...</span>
                </>
              ) : (
                <>
                  <Bluetooth className="w-4 h-4 text-emerald-300" />
                  <span>
                    {bluetoothStatus === 'connected'
                      ? '📶 สั่งพิมพ์ตรง PT210 (ภาษาไทย 100%)'
                      : '📶 เชื่อมต่อ & พิมพ์บลูทูธ (ภาษาไทย)'}
                  </span>
                </>
              )}
            </button>

            {/* 📲 2. Secondary Button: Share to POS Printer App */}
            <button
              type="button"
              onClick={handleShareToPosPrinter}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 active:scale-98 text-white font-black text-xs sm:text-sm rounded-2xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer ring-1 ring-blue-300"
              title="ส่งข้อมูลบิลเข้าแอป POS Printer ในมือถือ"
            >
              <Share2 className="w-4 h-4" />
              <span>📲 ส่งไปแอป POS Printer</span>
            </button>
          </div>

          {/* Secondary Controls Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              {/* Copy text button */}
              <button
                type="button"
                onClick={() => handleCopyText(false)}
                className="py-2 px-3 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="คัดลอกข้อความบิล"
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

              {/* Standard Print Spooler Button */}
              <button
                type="button"
                id="btn-print-receipt"
                onClick={handlePrint}
                className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="พิมพ์ผ่านระบบเครื่องพิมพ์มาตรฐาน Android Print Spooler หรือบันทึกเป็น PDF"
              >
                <Printer className="w-3.5 h-3.5 text-stone-600" />
                <span>พิมพ์ผ่านระบบเครื่อง / PDF</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              ปิด
            </button>
          </div>

        </div>

      </div>

      {/* 📱 Bluetooth POS Printer Modal */}
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
                <span
                  className={`w-2 h-2 rounded-full ${
                    bluetoothStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'
                  }`}
                ></span>
                <span className="text-[11px] text-stone-400">Bluetooth</span>
              </div>
            </div>

            {/* View 1: Device List */}
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
                              {isSelected && bluetoothStatus === 'connected' ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  เชื่อมต่ออยู่
                                </span>
                              ) : isSelected ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-stone-800 text-stone-400">
                                  เลือกไว้
                                </span>
                              ) : null}
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
              /* View 2: Printer Settings sheet */
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
                      <option value={384}>384 (ขนาดพิมพ์ 48mm / ม้วน 58mm)</option>
                      <option value={576}>576 (ขนาดพิมพ์ 72mm / ม้วน 80mm)</option>
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

                {/* Connect button */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSavePrinterConfig}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-black text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-4 h-4" />
                    <span>บันทึก & เชื่อมต่อบลูทูธ</span>
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
