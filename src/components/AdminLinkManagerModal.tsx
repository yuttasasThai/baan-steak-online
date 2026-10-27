import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Flame,
  Globe,
  Info,
  Link2,
  Lock,
  MessageCircle,
  QrCode,
  Radio,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Table,
  Truck,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import QRCode from 'qrcode';
import { CategoryItem } from '../types';

interface AdminLinkManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
  initialTab?: 'admin' | 'user';
  categories?: CategoryItem[];
}

export const AdminLinkManagerModal: React.FC<AdminLinkManagerModalProps> = ({
  isOpen,
  onClose,
  onNotify,
  initialTab = 'user',
  categories = [],
}) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'user'>(initialTab);

  // Sync initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Public Base Origin calculation
  const currentOrigin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://ais-pre-jhw4ercvam7jfd7tgqjxkr-954826957106.asia-east1.run.app';

  // Automatically replace private dev URLs (ais-dev-) with shared preview (ais-pre-)
  const baseOrigin = currentOrigin.includes('ais-dev-')
    ? currentOrigin.replace('ais-dev-', 'ais-pre-')
    : currentOrigin;

  // --- Admin Link States ---
  const [adminLinkStyle, setAdminLinkStyle] = useState<'path' | 'hash' | 'query'>('path');
  const [adminQrDataUrl, setAdminQrDataUrl] = useState<string>('');
  const [copiedAdmin, setCopiedAdmin] = useState(false);

  const getAdminUrl = () => {
    if (adminLinkStyle === 'hash') return `${baseOrigin}/#admin`;
    if (adminLinkStyle === 'query') return `${baseOrigin}/?role=admin`;
    return `${baseOrigin}/admin`;
  };

  const adminUrl = getAdminUrl();

  // --- User Link Generator States ---
  const [userLinkMode, setUserLinkMode] = useState<'general' | 'dinein' | 'delivery' | 'pickup'>('dinein');
  const [tableNumber, setTableNumber] = useState<string>('1');
  const [selectedCat, setSelectedCat] = useState<string>('ทั้งหมด');
  const [userQrDataUrl, setUserQrDataUrl] = useState<string>('');
  const [copiedUser, setCopiedUser] = useState(false);

  // Build dynamic customer URL
  const getUserUrl = () => {
    const params = new URLSearchParams();

    if (userLinkMode === 'dinein') {
      params.set('type', 'dinein');
      if (tableNumber.trim()) {
        params.set('table', tableNumber.trim());
      }
    } else if (userLinkMode === 'delivery') {
      params.set('type', 'delivery');
    } else if (userLinkMode === 'pickup') {
      params.set('type', 'pickup');
    }

    if (selectedCat && selectedCat !== 'ทั้งหมด') {
      params.set('category', selectedCat);
    }

    const queryStr = params.toString();
    return queryStr ? `${baseOrigin}/?${queryStr}` : `${baseOrigin}/`;
  };

  const userUrl = getUserUrl();

  // Generate Admin QR Code
  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(adminUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#1c1917',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setAdminQrDataUrl(url))
      .catch((err) => console.error('Admin QR Error:', err));
  }, [adminUrl, isOpen]);

  // Generate User QR Code
  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(userUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#dc2626', // Red brand color for customer QR
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setUserQrDataUrl(url))
      .catch((err) => console.error('User QR Error:', err));
  }, [userUrl, isOpen]);

  if (!isOpen) return null;

  const handleCopy = async (text: string, type: 'admin' | 'user') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'admin') {
        setCopiedAdmin(true);
        setTimeout(() => setCopiedAdmin(false), 2500);
        onNotify('📋 คัดลอกลิงก์ Admin เรียบร้อยแล้ว แนะนำให้บุ๊กมาร์กไว้สำหรับร้านค้า', 'success');
      } else {
        setCopiedUser(true);
        setTimeout(() => setCopiedUser(false), 2500);
        onNotify('📋 คัดลอกลิงก์สำหรับลูกค้าเรียบร้อยแล้ว พร้อมส่งให้ลูกค้าสั่งอาหารได้ทันที', 'success');
      }
    } catch {
      onNotify('ไม่สามารถคัดลอกอัตโนมัติได้ กรุณาคัดลอกข้อความด้วยตนเอง', 'info');
    }
  };

  const handleDownloadQr = (dataUrl: string, filename: string) => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify(`📥 ดาวน์โหลด QR Code "${filename}" เรียบร้อย`, 'success');
  };

  const handleShareLine = () => {
    let msg = `🥩 ร้านบ้าน สเต็กออนไลน์ อ.ชุมแพ\n`;
    if (userLinkMode === 'dinein' && tableNumber.trim()) {
      msg += `🍽️ เมนูอาหารออนไลน์สำหรับ "โต๊ะ ${tableNumber.trim()}"\n`;
    } else if (userLinkMode === 'delivery') {
      msg += `🛵 สั่งอาหารเดลิเวอรี่ส่งถึงบ้าน\n`;
    } else if (userLinkMode === 'pickup') {
      msg += `🛍️ สั่งอาหารล่วงหน้านัดรับหน้าร้าน\n`;
    }
    msg += `เปิดสั่งอาหารและดูเมนูอัปเดตสดแบบ Real-Time ได้ที่:\n${userUrl}`;

    const lineShareUrl = `https://line.me/R/msg/text/?${encodeURIComponent(msg)}`;
    window.open(lineShareUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/75 backdrop-blur-xs animate-fadeIn font-['Prompt',sans-serif]">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center shadow-inner">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg leading-tight flex items-center gap-2">
                <span>ตัวสร้างและจัดการลิงก์ร้านค้า</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Real-Time
                </span>
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                สร้างลิงก์สำหรับ Admin หลังร้าน และสร้างลิงก์สำหรับลูกค้า (User Link) แยกตามโต๊ะ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
            title="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time sync guarantee badge banner */}
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5 flex items-center gap-2 text-emerald-900 text-xs shrink-0">
          <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="leading-snug">
            <span className="font-extrabold text-emerald-800">Firestore Real-Time Sync:</span>{' '}
            เมื่อทางร้านอัปเดตเมนู (แก้ไขราคา, เพิ่ม/ลดอาหาร, สลับของหมด) ลิงก์ฝั่งลูกค้าจะเห็นข้อมูลใหม่ทันทีแบบสดๆ โดยไม่ต้องโหลดหน้าเว็บใหม่
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-stone-200 bg-stone-100 p-1.5 gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('user')}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'user'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>สร้างลิงก์สำหรับลูกค้า (User Link)</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-transparent text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span>ลิงก์ระบบ Admin (ร้านค้า)</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-stone-900 flex-1">
          {/* TAB 1: User Link Generator */}
          {activeTab === 'user' && (
            <div className="space-y-4">
              {/* Step 1: Select Type */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3">
                <div className="text-xs font-black text-stone-700 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
                    1
                  </span>
                  <span>เลือกรูปแบบลิงก์ที่ต้องการให้ลูกค้าสั่ง:</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setUserLinkMode('dinein')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      userLinkMode === 'dinein'
                        ? 'bg-red-50 border-red-500 text-red-800 ring-2 ring-red-400/30 font-black'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100 font-bold'
                    }`}
                  >
                    <Utensils className="w-4 h-4 text-red-600" />
                    <span className="text-xs">ทานที่ร้าน (ระบุโต๊ะ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserLinkMode('delivery')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      userLinkMode === 'delivery'
                        ? 'bg-red-50 border-red-500 text-red-800 ring-2 ring-red-400/30 font-black'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100 font-bold'
                    }`}
                  >
                    <Truck className="w-4 h-4 text-red-600" />
                    <span className="text-xs">ส่งถึงบ้าน (Delivery)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserLinkMode('pickup')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      userLinkMode === 'pickup'
                        ? 'bg-red-50 border-red-500 text-red-800 ring-2 ring-red-400/30 font-black'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100 font-bold'
                    }`}
                  >
                    <Store className="w-4 h-4 text-red-600" />
                    <span className="text-xs">นัดรับหน้าร้าน</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserLinkMode('general')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      userLinkMode === 'general'
                        ? 'bg-red-50 border-red-500 text-red-800 ring-2 ring-red-400/30 font-black'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100 font-bold'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-red-600" />
                    <span className="text-xs">หน้าแรกทั่วไป</span>
                  </button>
                </div>

                {/* Dine-in Table Options */}
                {userLinkMode === 'dinein' && (
                  <div className="pt-2 border-t border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-700">
                        ระบุหมายเลขโต๊ะอาหาร:
                      </label>
                      <span className="text-[11px] text-stone-500">
                        ลูกค้าเปิดมาจะขึ้น "โต๊ะ {tableNumber}" อัตโนมัติ
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="เช่น 1, 2, A1, VIP"
                        className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold focus:outline-none focus:border-red-500"
                      />
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {['1', '2', '3', '4', '5', '6'].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setTableNumber(num)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                              tableNumber === num
                                ? 'bg-red-600 text-white'
                                : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                            }`}
                          >
                            โต๊ะ {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional Category Pre-filter */}
                {categories.length > 0 && (
                  <div className="pt-2 border-t border-stone-200 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-stone-600">
                      เจาะจงหมวดหมู่เริ่มต้น (ไม่บังคับ):
                    </span>
                    <select
                      value={selectedCat}
                      onChange={(e) => setSelectedCat(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-bold focus:outline-none"
                    >
                      <option value="ทั้งหมด">ทั้งหมด</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Step 2: Generated Customer URL */}
              <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
                      2
                    </span>
                    <span>ลิงก์ที่สร้างสำเร็จ (User Link):</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {userLinkMode === 'dinein'
                      ? `สำหรับ โต๊ะ ${tableNumber}`
                      : userLinkMode === 'delivery'
                      ? 'สำหรับ เดลิเวอรี่'
                      : userLinkMode === 'pickup'
                      ? 'สำหรับ นัดรับอาหาร'
                      : 'หน้าเว็บลูกค้าทั่วไป'}
                  </span>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-700 font-mono text-xs break-all select-all flex items-center justify-between gap-2">
                  <span className="line-clamp-2">{userUrl}</span>
                </div>

                {/* Action Buttons for User Link */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(userUrl, 'user')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                      copiedUser
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {copiedUser ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedUser ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์ลูกค้า'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareLine}
                    className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    title="ส่งลิงก์ให้ลูกค้าผ่าน LINE ทันที"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>แชร์เข้า LINE ทันที</span>
                  </button>

                  <a
                    href={userUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>ทดสอบเปิดดู</span>
                  </a>
                </div>
              </div>

              {/* Step 3: QR Code for Printing or Table Standee */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-36 h-36 bg-white p-2 rounded-2xl border border-stone-200 shadow-sm shrink-0 flex items-center justify-center">
                  {userQrDataUrl ? (
                    <img
                      src={userQrDataUrl}
                      alt="User QR"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-xs text-stone-400">กำลังสร้าง QR...</div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="font-extrabold text-sm text-stone-900">
                    QR Code สำหรับลูกค้าสั่งอาหาร
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    พิมพ์ QR Code นี้ติดไว้ที่โต๊ะอาหาร หรือป้ายหน้าร้าน ลูกค้าสามารถใช้กล้องมือถือสแกนเพื่อสั่งอาหารได้ทันที โดยไม่ต้องโหลดแอป
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadQr(
                        userQrDataUrl,
                        `qr-customer-${userLinkMode === 'dinein' ? `table-${tableNumber}` : userLinkMode}.png`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลดรูปภาพ QR Code (PNG)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Admin Link Manager */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              {/* Security Warning Badge */}
              <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold">ลิงก์นี้สำหรับแอดมิน / เจ้าของร้านเท่านั้น:</span>{' '}
                  ต้องใส่รหัส PIN แอดมิน (0850451606 หรือ PIN ที่ตั้งไว้) เพื่อเข้าสู่ระบบจัดการรายการอาหารและรับออเดอร์
                </div>
              </div>

              {/* Admin Link Style Selector */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3">
                <div className="text-xs font-black text-stone-700">
                  เลือกรูปแบบลิงก์ Admin ที่เหมาะกับ Host/Server:
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminLinkStyle('path')}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      adminLinkStyle === 'path'
                        ? 'bg-stone-900 border-stone-900 text-white font-black'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100 font-bold'
                    }`}
                  >
                    <span className="text-xs">/admin (แนะนำ)</span>
                    <span className="text-[10px] opacity-75">เส้นทางมาตรฐาน</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminLinkStyle('hash')}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      adminLinkStyle === 'hash'
                        ? 'bg-stone-900 border-stone-900 text-white font-black'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100 font-bold'
                    }`}
                  >
                    <span className="text-xs">/#admin</span>
                    <span className="text-[10px] opacity-75">สำหรับ Static Host</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminLinkStyle('query')}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      adminLinkStyle === 'query'
                        ? 'bg-stone-900 border-stone-900 text-white font-black'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100 font-bold'
                    }`}
                  >
                    <span className="text-xs">?role=admin</span>
                    <span className="text-[10px] opacity-75">ผ่าน Parameter</span>
                  </button>
                </div>

                {/* Display Current Admin URL */}
                <div className="p-3 bg-white rounded-xl border border-stone-200 text-stone-800 font-mono text-xs break-all select-all flex items-center justify-between gap-2">
                  <span className="line-clamp-2">{adminUrl}</span>
                </div>

                {/* Action Buttons for Admin Link */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(adminUrl, 'admin')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                      copiedAdmin
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-900 hover:bg-stone-800 text-white'
                    }`}
                  >
                    {copiedAdmin ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedAdmin ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์ Admin'}</span>
                  </button>

                  <a
                    href={adminUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-stone-200"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>เปิดหน้าระบบ Admin ในแท็บใหม่</span>
                  </a>
                </div>
              </div>

              {/* Admin QR Code */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-36 h-36 bg-white p-2 rounded-2xl border border-stone-200 shadow-sm shrink-0 flex items-center justify-center">
                  {adminQrDataUrl ? (
                    <img
                      src={adminQrDataUrl}
                      alt="Admin QR"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-xs text-stone-400">กำลังสร้าง QR...</div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="font-extrabold text-sm text-stone-900 flex items-center justify-center sm:justify-start gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-red-600" />
                    <span>QR Code สำหรับเปิดระบบ Admin</span>
                  </div>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    สแกนด้วยแท็บเล็ตหรือสมาร์ตโฟนของทางร้าน เพื่อเปิดหน้ารับออเดอร์ทิ้งไว้ จะมีเสียงกระดิ่งแจ้งเตือนทันทีเมื่อมีลูกค้าสั่งอาหารเข้ามา
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadQr(adminQrDataUrl, 'qr-admin-baan-steak.png')
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ดาวน์โหลด QR Code สำหรับ Admin (PNG)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs shrink-0">
          <div className="text-stone-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-medium">บ้าน สเต็กออนไลน์ • ระบบสร้างลิงก์ & QR v2.3.0</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
