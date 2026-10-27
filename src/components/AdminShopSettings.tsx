import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  Globe,
  Link2,
  Lock,
  MapPin,
  MessageCircle,
  PhoneCall,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  Truck,
  Zap,
} from 'lucide-react';
import { ShopSettings } from '../types';
import { updateShopSettings } from '../services/menuService';
import { AdminHeroImageManager } from './AdminHeroImageManager';
import { AdminLinkManagerModal } from './AdminLinkManagerModal';
import { CURRENT_REVISION, getRevisionFileName } from '../revisionInfo';

interface AdminShopSettingsProps {
  settings: ShopSettings;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToExport?: () => void;
}

export const AdminShopSettings: React.FC<AdminShopSettingsProps> = ({
  settings,
  onNotify,
  onNavigateToExport,
}) => {
  // Store status: Open / Closed
  const [isOpen, setIsOpen] = useState<boolean>(settings.isOpen !== false);

  // Hide admin button in customer top navigation bar
  const [hideAdminButton, setHideAdminButton] = useState<boolean>(
    Boolean(settings.hideAdminButtonInCustomerView)
  );

  // Link copy state
  const [copiedType, setCopiedType] = useState<'customer' | 'admin' | null>(null);

  // Link & QR Generator Modal state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkModalInitialTab, setLinkModalInitialTab] = useState<'admin' | 'user'>('user');

  // Store phone
  const [phone, setPhone] = useState(settings.phone || '085-045-1606');

  // LINE OA Settings
  const [lineEnabled, setLineEnabled] = useState<boolean>(settings.lineEnabled !== false);
  const [lineName, setLineName] = useState(
    settings.lineName || settings.lineOaName || 'บ้าน สเต็กออนไลน์'
  );
  const [lineUrl, setLineUrl] = useState(
    settings.lineUrl || 'https://line.me/ti/p/~0850451606'
  );
  const [lineId, setLineId] = useState(settings.lineId || '@baansteak');

  // GPS Coordinates
  const [shopLatitude, setShopLatitude] = useState<string>(
    settings.shopLatitude?.toString() || '16.5447'
  );
  const [shopLongitude, setShopLongitude] = useState<string>(
    settings.shopLongitude?.toString() || '102.1005'
  );

  const [isSaving, setIsSaving] = useState(false);

  // Quick toggle store status directly
  const handleQuickToggleStore = async (newStatus: boolean) => {
    try {
      setIsOpen(newStatus);
      await updateShopSettings({ isOpen: newStatus });
      if (newStatus) {
        onNotify('🟢 เปิดร้านเรียบร้อย (ลูกค้าสามารถสั่งอาหารได้แล้ว)', 'success');
      } else {
        onNotify('🔴 ปิดร้านเรียบร้อย (ระบบงดรับออเดอร์ใหม่)', 'info');
      }
    } catch (err) {
      onNotify('ไม่สามารถเปลี่ยนสถานะร้านได้', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const lat = parseFloat(shopLatitude);
      const lng = parseFloat(shopLongitude);
      if (isNaN(lat) || isNaN(lng)) {
        onNotify('กรุณาระบุพิกัด Latitude และ Longitude เป็นตัวเลขที่ถูกต้อง', 'error');
        setIsSaving(false);
        return;
      }

      await updateShopSettings({
        isOpen,
        phone: phone.trim() || '085-045-1606',
        lineName: lineName.trim() || 'บ้าน สเต็กออนไลน์',
        lineOaName: lineName.trim() || 'บ้าน สเต็กออนไลน์',
        lineUrl: lineUrl.trim() || 'https://line.me/ti/p/~0850451606',
        lineId: lineId.trim(),
        lineEnabled,
        shopLatitude: lat,
        shopLongitude: lng,
        hideAdminButtonInCustomerView: hideAdminButton,
      });

      onNotify('บันทึกการตั้งค่าร้านและข้อมูลเรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error('Save error:', err);
      onNotify('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async (url: string, type: 'customer' | 'admin') => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedType(type);
      onNotify(
        type === 'customer'
          ? '📋 คัดลอกลิงก์สำหรับลูกค้าเรียบร้อยแล้ว พร้อมส่งให้ลูกค้าสั่งอาหารได้เลย'
          : '📋 คัดลอกลิงก์ Admin หลังร้านเรียบร้อยแล้ว แนะนำให้บุ๊กมาร์กไว้สำหรับร้านค้า',
        'success'
      );
      setTimeout(() => setCopiedType(null), 3000);
    } catch {
      onNotify('ไม่สามารถคัดลอกอัตโนมัติได้ กรุณาคัดลอกจากกล่องข้อความ', 'info');
    }
  };

  // Convert private dev URL (ais-dev-*) to public shared URL (ais-pre-*) automatically
  const currentOrigin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://ais-pre-jhw4ercvam7jfd7tgqjxkr-954826957106.asia-east1.run.app';

  const publishedOrigin = currentOrigin.includes('ais-dev-')
    ? currentOrigin.replace('ais-dev-', 'ais-pre-')
    : currentOrigin;

  const customerUrl = `${publishedOrigin}/`;
  const adminUrl = `${publishedOrigin}/admin`;
  const adminHashUrl = `${publishedOrigin}/#admin`;

  return (
    <div className="space-y-5 text-stone-900 max-w-2xl mx-auto">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-red-600" />
            <span>ตั้งค่าร้านค้า & LINE OA</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            จัดการสถานะเปิด/ปิดร้าน, ลิงก์แชร์ลูกค้า/แอดมิน, ช่องทาง LINE OA, เบอร์โทร และพิกัดร้าน
          </p>
        </div>
      </div>

      {/* 0. ลิงก์ระบบแยกสำหรับลูกค้า และ ร้านค้า (Publish Links) */}
      <div className="bg-white rounded-2xl p-5 border-2 border-red-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2 text-sm font-black text-stone-900">
            <Link2 className="w-4 h-4 text-red-600" />
            <span>🔗 ลิงก์แชร์และใช้งาน (แยกลิงก์ลูกค้า และ ลิงก์ร้านค้า)</span>
          </div>
          <span className="px-2.5 py-0.5 bg-red-50 text-red-700 rounded-full text-[11px] font-bold border border-red-200">
            ใช้งานแยกกันได้ทันที
          </span>
        </div>

        {/* Interactive Link & QR Generator Modal Trigger Banner */}
        <div className="bg-gradient-to-r from-red-50 via-rose-50 to-amber-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-0.5">
            <div className="font-extrabold text-xs sm:text-sm text-stone-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-red-600" />
              <span>ตัวสร้างลิงก์สำหรับ Admin และ ลิงก์สำหรับลูกค้า (User Link)</span>
            </div>
            <div className="text-[11px] text-stone-600">
              สร้างลิงก์เฉพาะเจาะจง (ระบุเลขโต๊ะ, เดลิเวอรี่, หรือนัดรับ) พร้อม QR Code คมชัดและปุ่มแชร์เข้า LINE 1 คลิก
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setLinkModalInitialTab('admin');
                setIsLinkModalOpen(true);
              }}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>สร้างลิงก์ Admin</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setLinkModalInitialTab('user');
                setIsLinkModalOpen(true);
              }}
              className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>สร้างลิงก์สำหรับลูกค้า (User Link)</span>
            </button>
          </div>
        </div>

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-950 space-y-1">
          <div className="font-black text-amber-900 flex items-center gap-1.5">
            <span>📢 คำแนะนำสำหรับการใช้งานลิงก์จริง:</span>
          </div>
          <p className="leading-relaxed">
            1. <strong>ต้องกดปุ่ม "Publish" (มุมขวาบนของ AI Studio) เสมอ</strong> เมื่อมีการแก้ไขหรือพัฒนาฟีเจอร์ใหม่ เพื่อให้ระบบอัปเดตโค้ดล่าสุดขึ้นสู่ลิงก์สาธารณะ
          </p>
          <p className="leading-relaxed">
            2. ลิงก์สาธารณะที่ลูกค้าและเครื่องภายนอกเข้าได้ คือลิงก์ที่ขึ้นต้นด้วย <strong>ais-pre-</strong> (ด้านล่างนี้) ส่วนลิงก์ที่ขึ้นต้นด้วย <em>ais-dev-</em> จะเป็นลิงก์ส่วนตัวของห้องนักพัฒนาเท่านั้น
          </p>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          ท่านสามารถคัดลอกลิงก์ที่ระบบสร้างให้ด้านล่าง เพื่อนำไปแชร์ให้ลูกค้าและบุ๊กมาร์กสำหรับทางร้านได้เลยครับ:
        </p>

        {/* 1. ลิงก์สำหรับลูกค้า */}
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-700" />
              <span>1. ลิงก์สำหรับลูกค้า (หน้าสั่งอาหาร)</span>
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
              สำหรับแชร์ให้ลูกค้า
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={customerUrl}
              className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono text-stone-700 select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleCopyLink(customerUrl, 'customer')}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs shrink-0 cursor-pointer"
            >
              {copiedType === 'customer' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>คัดลอกแล้ว</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอกลิงก์</span>
                </>
              )}
            </button>
            <a
              href={customerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl transition shrink-0"
              title="เปิดดูหน้าลูกค้าในแท็บใหม่"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            💡 นำลิงก์นี้ไปแปะใน <strong>LINE OA</strong>, <strong>Facebook</strong>, โพสต์โซเชียล หรือทำ <strong>QR Code หน้าร้าน</strong> ลูกค้าจะเข้าสู่หน้าสั่งอาหารโดยตรง
          </p>
        </div>

        {/* 2. ลิงก์สำหรับทางร้าน / Admin */}
        <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-red-600" />
              <span>2. ลิงก์เฉพาะทางร้าน / Admin (ระบบหลังร้าน)</span>
            </span>
            <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full border border-red-200">
              สำหรับเจ้าของร้าน
            </span>
          </div>

          {/* ลิงก์หลัก /admin */}
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-stone-600">ลิงก์หลัก (แบบ URL สวยงาม):</div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={adminUrl}
                className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-mono text-stone-700 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleCopyLink(adminUrl, 'admin')}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs shrink-0 cursor-pointer"
              >
                {copiedType === 'admin' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกลิงก์</span>
                  </>
                )}
              </button>
              <a
                href={adminUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl transition shrink-0"
                title="เปิดหน้าร้านค้าในแท็บใหม่"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* ลิงก์สำรอง /#admin */}
          <div className="space-y-1 pt-1 border-t border-stone-200">
            <div className="text-[11px] font-bold text-stone-600">
              ลิงก์สำรอง (แบบ Hash <code>/#admin</code> เปิดได้ 100% บนมือถือทุกรุ่นและเบราว์เซอร์ LINE):
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={adminHashUrl}
                className="flex-1 px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-mono text-stone-700 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleCopyLink(adminHashUrl, 'admin')}
                className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <span>คัดลอกลิงก์สำรอง</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-stone-600 leading-relaxed">
            🔒 บันทึกหรือบุ๊กมาร์ก (Bookmark) หน้านี้ไว้ในมือถือเพื่อเปิดดูออเดอร์ใหม่แบบ Real-time, เปลี่ยนสถานะอาหาร, เปิด/ปิดร้าน และดูยอดขาย
          </p>
        </div>

        {/* 3. ตัวเลือกซ่อนปุ่ม Admin บนหน้าลูกค้า */}
        <div className="pt-2 border-t border-stone-100">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={hideAdminButton}
              onChange={(e) => setHideAdminButton(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded-md text-red-600 border-stone-300 focus:ring-red-500 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-stone-800">
                ซ่อนปุ่ม "ระบบ Admin" บนแถบด้านบนของหน้าเว็บลูกค้า
              </span>
              <p className="text-[11px] text-stone-500 leading-relaxed mt-0.5">
                (เมื่อติ๊กเลือก ลูกค้าที่เข้าเว็บจะไม่เห็นปุ่มเข้าระบบหลังร้านเลย ช่วยให้หน้าเว็บเป็นหน้าสั่งอาหารของลูกค้า 100% โดยทางร้านจะเข้าจัดการร้านผ่านลิงก์ <code>/admin</code> เท่านั้น)
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* 0.5. ส่งออก Source Code สำหรับ GitHub และ Vercel บนมือถือ Android */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-2xl p-5 text-white shadow-sm space-y-3.5 border border-stone-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center">
              <FileArchive className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-black flex items-center gap-1.5">
                <span>ดาวน์โหลด Source Code (ZIP สำหรับ GitHub & Vercel)</span>
              </div>
              <p className="text-[11px] text-stone-300">
                รองรับการอัปโหลดด้วยมือถือ Android 100% มีไฟล์ <code>vercel.json</code> พร้อมคู่มือ
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-red-600/60 rounded-full text-[10px] font-black border border-red-400">
            {CURRENT_REVISION.revisionCode}
          </span>
        </div>

        <div className="p-3 bg-stone-800/90 rounded-xl border border-stone-700 text-xs text-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="space-y-0.5 text-left w-full sm:w-auto">
            <span className="font-bold text-amber-300 flex items-center gap-1">
              <span>🏷️ ป้องกันชื่อซ้ำ:</span>
            </span>
            <p className="text-[11px] font-mono text-stone-300 truncate max-w-sm">
              {getRevisionFileName(CURRENT_REVISION.revisionCode)}
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={`/api/export-source?rev=${encodeURIComponent(CURRENT_REVISION.revisionCode)}&t=${Date.now()}`}
              download={getRevisionFileName(CURRENT_REVISION.revisionCode)}
              onClick={() => {
                onNotify('📥 เริ่มดาวน์โหลดไฟล์ ZIP ลงในโทรศัพท์ Android เรียบร้อยแล้ว', 'success');
              }}
              className="flex-1 sm:flex-initial px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลด ZIP</span>
            </a>
            {onNavigateToExport && (
              <button
                type="button"
                onClick={onNavigateToExport}
                className="px-3 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                ดูคู่มือ & ปรับ Revision
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Image Manager Component */}
      <AdminHeroImageManager settings={settings} onNotify={onNotify} />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Store Open / Closed Status Card */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2 text-sm font-bold text-stone-800">
              <Store className="w-4 h-4 text-red-600" />
              <span>สถานะร้านค้า (เปิด / ปิด)</span>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 ${
                isOpen
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              <span>{isOpen ? '🟢 ร้านเปิด' : '🔴 ร้านปิด'}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 space-y-1">
            <p>
              • <strong>ร้านเปิด:</strong> ลูกค้าสามารถกดสั่งอาหารและสร้างออเดอร์ใหม่ได้ตามปกติ
            </p>
            <p>
              • <strong>ร้านปิด:</strong> หน้าเว็บจะแสดงป้าย "ร้านปิด" และไม่อนุญาตให้สร้างออเดอร์ใหม่ พร้อมข้อความเตือน "ขณะนี้ร้านปิด ยังไม่สามารถสั่งอาหารได้"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleQuickToggleStore(true)}
              className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                isOpen
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
              }`}
            >
              <span className="text-base">🟢</span>
              <span>ร้านเปิด</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickToggleStore(false)}
              className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                !isOpen
                  ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
              }`}
            >
              <span className="text-base">🔴</span>
              <span>ร้านปิด</span>
            </button>
          </div>
        </div>

        {/* 2. LINE OA Settings Card */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2 text-sm font-bold text-stone-800">
              <MessageCircle className="w-4 h-4 text-[#06C755]" />
              <span>💬 ตั้งค่า LINE OA</span>
            </div>
            {/* Toggle Show/Hide on Customer website */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs font-semibold text-stone-600">
                {lineEnabled ? 'แสดงปุ่ม LINE' : 'ซ่อนปุ่ม LINE'}
              </span>
              <input
                type="checkbox"
                checked={lineEnabled}
                onChange={(e) => setLineEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#06C755] cursor-pointer"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                ชื่อ LINE OA (แสดงบนปุ่มหน้าลูกค้า)
              </label>
              <input
                type="text"
                required
                value={lineName}
                onChange={(e) => setLineName(e.target.value)}
                placeholder="บ้าน สเต็กออนไลน์"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:outline-none focus:border-[#06C755] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                LINE OA URL (ลิงก์สำหรับกดเพิ่มเพื่อนหรือแชท)
              </label>
              <input
                type="url"
                required
                value={lineUrl}
                onChange={(e) => setLineUrl(e.target.value)}
                placeholder="https://line.me/ti/p/~0850451606"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:outline-none focus:border-[#06C755] focus:bg-white"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                * เมื่อลูกค้ากดปุ่ม จะเปิดลิงก์ URL นี้จริงทันที
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                LINE OA ID (ข้อมูลเพิ่มเติม)
              </label>
              <input
                type="text"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                placeholder="@baansteak หรือ 0850451606"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:outline-none focus:border-[#06C755] focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* 3. Shop Phone Contact Card */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-100 text-sm font-bold text-stone-800">
            <PhoneCall className="w-4 h-4 text-red-600" />
            <span>เบอร์โทรศัพท์ร้าน</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              เบอร์โทรศัพท์ร้าน (แสดงให้ลูกค้าโทรสั่งอาหาร)
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="085-045-1606"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-medium focus:outline-none focus:border-red-500 focus:bg-white"
            />
            <p className="text-[11px] text-stone-500 mt-1">
              * แสดงเฉพาะเบอร์ 085-045-1606 และปุ่มโทรใช้ tel:0850451606
            </p>
          </div>
        </div>

        {/* 4. Shop GPS Coordinates Card */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div className="flex items-center gap-2 text-sm font-bold text-stone-800">
              <MapPin className="w-4 h-4 text-red-600" />
              <span>พิกัด GPS ร้านค้า (จุดคำนวณระยะทางจัดส่ง)</span>
            </div>
            <a
              href={`https://www.google.com/maps?q=${shopLatitude},${shopLongitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>ตรวจดูใน Google Maps</span>
            </a>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <strong>คำชี้แจง:</strong> พิกัดนี้คือจุดศูนย์กลางของร้านที่ใช้คำนวณระยะทางจริงไปยัง GPS ของลูกค้า
            (ระบบจะไม่ใช้ GPS ของเครื่อง Admin โดยอัตโนมัติ เพื่อความแม่นยำสูงสุดของหน้าร้าน)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Latitude (ละติจูดร้าน)
              </label>
              <input
                type="number"
                step="any"
                required
                value={shopLatitude}
                onChange={(e) => setShopLatitude(e.target.value)}
                placeholder="16.5447"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono font-medium focus:outline-none focus:border-red-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Longitude (ลองจิจูดร้าน)
              </label>
              <input
                type="number"
                step="any"
                required
                value={shopLongitude}
                onChange={(e) => setShopLongitude(e.target.value)}
                placeholder="102.1005"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm font-mono font-medium focus:outline-none focus:border-red-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* 5. GPS Rate Table Card */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-100 text-sm font-bold text-stone-800">
            <Truck className="w-4 h-4 text-red-600" />
            <span>เกณฑ์คำนวณค่าจัดส่งตามระยะทาง GPS</span>
          </div>

          <div className="divide-y divide-stone-100 text-xs">
            <div className="py-2 flex justify-between items-center font-medium">
              <span>0 - 2 กิโลเมตร</span>
              <span className="font-bold text-emerald-600">ฟรี 0 บาท</span>
            </div>
            <div className="py-2 flex justify-between items-center font-medium">
              <span>มากกว่า 2 - 4 กิโลเมตร</span>
              <span className="font-bold text-stone-900">20 บาท</span>
            </div>
            <div className="py-2 flex justify-between items-center font-medium">
              <span>มากกว่า 4 - 5 กิโลเมตร</span>
              <span className="font-bold text-stone-900">30 บาท</span>
            </div>
            <div className="py-2 flex justify-between items-center font-medium">
              <span>มากกว่า 5 - 6 กิโลเมตร</span>
              <span className="font-bold text-stone-900">40 บาท</span>
            </div>
            <div className="py-2 flex justify-between items-center font-medium">
              <span>มากกว่า 6 - 10 กิโลเมตร</span>
              <span className="font-bold text-stone-900">50 บาท</span>
            </div>
            <div className="py-2 flex justify-between items-center font-medium">
              <span>มากกว่า 10 - 12 กิโลเมตร</span>
              <span className="font-bold text-stone-900">80 บาท</span>
            </div>
            <div className="py-2 flex justify-between items-center font-medium">
              <span>มากกว่า 12 กิโลเมตรขึ้นไป</span>
              <span className="font-bold text-stone-900">100 บาท</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 active:scale-98 disabled:bg-stone-300 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกการตั้งค่าร้านและ LINE OA'}</span>
          </button>
        </div>
      </form>

      {/* Link Generator Modal */}
      <AdminLinkManagerModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onNotify={onNotify}
        initialTab={linkModalInitialTab}
      />
    </div>
  );
};
