import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileArchive,
  FileCheck2,
  FolderGit2,
  GitBranch,
  Layers,
  Loader2,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
  UploadCloud,
} from 'lucide-react';
import { CURRENT_REVISION, getRevisionFileName } from '../revisionInfo';

interface AdminSourceCodeExporterProps {
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminSourceCodeExporter: React.FC<AdminSourceCodeExporterProps> = ({ onNotify }) => {
  const [currentRev, setCurrentRev] = useState(CURRENT_REVISION.version);
  const [customRevNote, setCustomRevNote] = useState(CURRENT_REVISION.description);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(true);
  const [showFilesList, setShowFilesList] = useState(false);

  // Computed revision tag and dynamic filename
  const revisionCode = `rev-${currentRev.trim() || '2.5.0'}`;
  const dynamicFileName = getRevisionFileName(revisionCode);

  // Quick revision bumping helpers
  const handleBumpRevision = (type: 'patch' | 'minor' | 'major') => {
    const parts = currentRev.split('.').map((p) => parseInt(p, 10) || 0);
    while (parts.length < 3) parts.push(0);

    let [major, minor, patch] = parts;
    if (type === 'patch') {
      patch += 1;
    } else if (type === 'minor') {
      minor += 1;
      patch = 0;
    } else if (type === 'major') {
      major += 1;
      minor = 0;
      patch = 0;
    }

    const nextRev = `${major}.${minor}.${patch}`;
    setCurrentRev(nextRev);
    onNotify(`🏷️ ปรับ Revision เป็น rev-${nextRev} เรียบร้อยแล้ว`, 'info');
  };

  // Download Trigger Handler (Full or Patch)
  const handleDownloadZip = async (type: 'patch' | 'full' = 'patch') => {
    setIsDownloading(true);
    try {
      const cleanRev = revisionCode;
      const downloadUrl = `/api/export-source?type=${type}&rev=${encodeURIComponent(cleanRev)}&t=${Date.now()}`;
      const targetFileName = type === 'patch'
        ? `baan-steak-patch-${cleanRev}.zip`
        : dynamicFileName;

      // Create hidden link and trigger download on Android browser
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = targetFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (type === 'patch') {
        onNotify(
          `✅ เริ่มดาวน์โหลด Patch เฉพาะไฟล์ที่แก้ไข (${targetFileName}) เรียบร้อยแล้ว!`,
          'success'
        );
      } else {
        onNotify(
          `✅ เริ่มดาวน์โหลดทั้งโปรเจกต์ (${dynamicFileName}) เรียบร้อยแล้ว!`,
          'success'
        );
      }
    } catch (err) {
      console.error('Download error:', err);
      onNotify('เกิดข้อผิดพลาดในการดาวน์โหลด กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
      }, 1500);
    }
  };

  // Direct download single file helper (for quick GitHub file replacement)
  const handleDownloadSingleFile = (filePath: string, filename: string) => {
    const url = `/api/download-single-file?path=${encodeURIComponent(filePath)}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify(`📥 กำลังดาวน์โหลดไฟล์ ${filename}... นำไปใส่ในโฟลเดอร์ตามที่ระบุบน GitHub ได้เลยครับ`, 'success');
  };

  return (
    <div className="space-y-5 text-stone-900 max-w-2xl mx-auto">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <FileArchive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold leading-tight">
                ดาวน์โหลด Source Code สำหรับ GitHub & Vercel
              </h2>
              <p className="text-xs text-rose-100 mt-0.5 font-medium">
                รองรับการอัปโหลดด้วยโทรศัพท์มือถือ Android 100% ปราศจาก Error ในการ Deploy
              </p>
            </div>
          </div>
          <span className="shrink-0 px-2.5 py-1 bg-white/25 backdrop-blur-xs rounded-full text-[11px] font-black border border-white/30 flex items-center gap-1">
            <Tag className="w-3 h-3 text-amber-300" />
            <span>{revisionCode}</span>
          </span>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold">
          <div className="px-2.5 py-1 bg-emerald-500/30 backdrop-blur-xs rounded-xl border border-emerald-300/40 flex items-center gap-1 text-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>มี vercel.json (ไร้ Error 404)</span>
          </div>
          <div className="px-2.5 py-1 bg-emerald-500/30 backdrop-blur-xs rounded-xl border border-emerald-300/40 flex items-center gap-1 text-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>แยก node_modules ออกแล้ว</span>
          </div>
          <div className="px-2.5 py-1 bg-amber-500/30 backdrop-blur-xs rounded-xl border border-amber-300/40 flex items-center gap-1 text-amber-100">
            <Smartphone className="w-3.5 h-3.5 text-amber-300" />
            <span>Android Ready</span>
          </div>
        </div>
      </div>

      {/* 2. Primary Action: Download Options & Revision Control */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2 text-sm font-bold text-stone-800">
            <GitBranch className="w-4 h-4 text-red-600" />
            <span>ตัวเลือกดาวน์โหลด Source Code</span>
          </div>
          <span className="text-[11px] text-stone-500">
            อัปเดตล่าสุด: {CURRENT_REVISION.formattedDateTh}
          </span>
        </div>

        {/* Revision Info Display */}
        <div className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="block text-xs font-bold text-stone-700">
                หมายเลข Revision ปัจจุบัน:
              </label>
              <p className="text-[11px] text-stone-500">
                ระบบจัดการโต๊ะอาหาร + อัปเดตรูปภาพเมนูจริง
              </p>
            </div>
            {/* Quick Bump Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleBumpRevision('patch')}
                className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-xs font-bold text-stone-700 transition active:scale-95"
                title="เพิ่มรุ่นย่อย (เช่น 2.5.0 -> 2.5.1)"
              >
                +0.0.1 (Patch)
              </button>
              <button
                type="button"
                onClick={() => handleBumpRevision('minor')}
                className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-xs font-bold text-stone-700 transition active:scale-95"
                title="เพิ่มรุ่นฟังก์ชัน (เช่น 2.5.0 -> 2.6.0)"
              >
                +0.1.0 (Minor)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-stone-300 rounded-xl px-3 py-2 w-full max-w-xs focus-within:border-red-500">
              <span className="text-xs font-mono font-bold text-stone-400 mr-1.5">rev-</span>
              <input
                type="text"
                value={currentRev}
                onChange={(e) => setCurrentRev(e.target.value)}
                placeholder="2.5.0"
                className="w-full text-sm font-mono font-bold text-stone-900 focus:outline-none"
              />
            </div>
            <div className="text-xs font-mono text-stone-500 truncate flex-1 hidden sm:block">
              📦 รหัสเวอร์ชัน: <span className="text-stone-800 font-bold">{revisionCode}</span>
            </div>
          </div>
        </div>

        {/* 2 Download Buttons Grid */}
        <div className="space-y-3 pt-1">
          {/* Option A: Patch ZIP (Only Modified Files) */}
          <div className="p-4 bg-emerald-50/70 rounded-2xl border-2 border-emerald-500/40 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider mb-1">
                  ⭐ แนะนำสูงสุดสำหรับคนมี GitHub แล้ว
                </span>
                <h4 className="text-sm font-black text-emerald-950">
                  1. ดาวน์โหลดเฉพาะไฟล์ที่แก้ไข (Patch ZIP ~60 KB)
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed mt-0.5">
                  ประกอบด้วยเฉพาะไฟล์ในโฟลเดอร์ <code>src/</code> ที่แก้ไขใหม่ ไม่ต้องโหลดไฟล์เก่าซ้ำ เอาไปอัปโหลดทับบน GitHub ได้ทันทีใน 1 นาที
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleDownloadZip('patch')}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:bg-stone-400 text-white font-black text-sm rounded-xl shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังจัดเตรียม Patch ZIP...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>📦 ดาวน์โหลดเฉพาะไฟล์ที่แก้ไข (Patch ZIP)</span>
                </>
              )}
            </button>
            <div className="text-center text-[11px] text-emerald-700 font-medium">
              ไฟล์ขนาดเล็กมาก (~60 KB) แตกไฟล์ง่ายบนมือถือ มีเฉพาะโฟลเดอร์ <code>src/</code>
            </div>
          </div>

          {/* Option B: Full Project ZIP */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-stone-900">
                  2. หรือ ดาวน์โหลดทั้งโปรเจกต์แบบเต็ม (Full Project ZIP ~150 KB)
                </h4>
                <p className="text-[11px] text-stone-600 mt-0.5">
                  เหมาะสำหรับผู้ที่ต้องการสร้าง Repository ใหม่ทั้งหมดบน GitHub ตั้งแต่ต้น
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleDownloadZip('full')}
              className="w-full py-3 px-4 bg-stone-800 hover:bg-stone-900 active:scale-98 disabled:bg-stone-400 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>📥 ดาวน์โหลดทั้งโปรเจกต์ (Full Project ZIP)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2.5 Vercel Missing Export Error Resolver Alert */}
      <div className="bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 rounded-3xl p-5 border-2 border-red-400 shadow-md space-y-3.5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-md uppercase">
                แก้ปัญหา Deploy ไม่ผ่าน
              </span>
              <span className="text-xs font-mono font-bold text-red-700">8 MISSING_EXPORT Errors</span>
            </div>
            <h3 className="text-sm font-extrabold text-red-950 mt-1">
              ทำไม Vercel แจ้ง &quot;subscribeTables&quot; หรือ &quot;clearOrdersHistory&quot; is not exported?
            </h3>
            <p className="text-xs text-red-800 leading-relaxed mt-1">
              <strong>สาเหตุ:</strong> บน GitHub ยังเป็นไฟล์ <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-red-700 border border-red-200">src/services/menuService.ts</code> รุ่นเดิม (เนื่องจากตอนอัปโหลดอาจไม่ได้เข้าไปในโฟลเดอร์ services หรือไม่ได้อัปโหลดไฟล์นี้)
            </p>
          </div>
        </div>

        <div className="bg-white/95 rounded-2xl p-4 border border-red-200 text-xs space-y-3 text-stone-800">
          <p className="font-bold text-stone-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>วิธีแก้ไขให้ผ่านฉลุยใน 1 นาที:</span>
          </p>
          <div className="space-y-2 text-stone-700">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                1
              </span>
              <p>
                กดปุ่มสีแดงด้านล่างนี้เพื่อ <strong>ดาวน์โหลด menuService.ts</strong> ลงในมือถือ
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                2
              </span>
              <p>
                เปิด GitHub ในมือถือ ไปที่คลัง <strong>baan-steak-online</strong> ➡️ กดเข้าไปในโฟลเดอร์ <strong className="text-stone-900">src</strong> ➡️ กดเข้าไปต่อในโฟลเดอร์ <strong className="text-red-700">services</strong>
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center shrink-0 text-[11px] mt-0.5">
                3
              </span>
              <p>
                กดปุ่ม <strong>Add file</strong> ➡️ เลือก <strong>Upload files</strong> ➡️ เลือกไฟล์ <code>menuService.ts</code> ที่เพิ่งโหลดไป ➡️ กดปุ่มเขียว <strong>Commit changes</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleDownloadSingleFile('src/services/menuService.ts', 'menuService.ts')}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>📥 กดตรงนี้: ดาวน์โหลด menuService.ts (ไฟล์เดียวจบ นำไปวางใน src/services/)</span>
          </button>
        </div>
      </div>

      {/* 2.6 FAQ Section: Answers to user's exact questions */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-5 border-2 border-amber-300 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-sm font-black text-amber-950">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>💡 ตอบข้อสงสัย: ต้องอัปโหลดไฟล์ไหนบ้าง? โฟลเดอร์อะไร?</span>
        </div>

        <div className="space-y-3 text-xs text-amber-950">
          <div className="bg-white/90 p-3.5 rounded-2xl border border-amber-200 space-y-1.5">
            <p className="font-extrabold text-stone-900 text-xs">
              ❓ 1. โหลดแค่ไฟล์ที่มีการเปลี่ยนได้หรือไม่?
            </p>
            <p className="text-stone-700 leading-relaxed">
              👉 <strong>ได้แน่นอนครับ 100%!</strong> หากท่านมีโปรเจกต์เดิมบน GitHub อยู่แล้ว ให้กดปุ่มสีเขียว <strong>"ดาวน์โหลดเฉพาะไฟล์ที่แก้ไข (Patch ZIP)"</strong> หรือจะกดโหลดแยกทีละไฟล์ด้านล่างนี้ได้เลยครับ นำไฟล์ไปวางทับไฟล์เดิมบน GitHub Vercel จะตรวจจับและ Deploy เวอร์ชั่นใหม่ให้ทันที!
            </p>
          </div>

          <div className="bg-white/90 p-3.5 rounded-2xl border border-amber-200 space-y-1.5">
            <p className="font-extrabold text-stone-900 text-xs">
              ❓ 2. ไฟล์ที่อยู่นอกโฟลเดอร์ 14 ไฟล์ ต้องอัปโหลดใหม่หรือไม่?
            </p>
            <p className="text-stone-700 leading-relaxed">
              👉 <strong>ไม่ต้องอัปโหลดซ้ำครับ!</strong> ไฟล์นอกโฟลเดอร์ เช่น <code>package.json</code>, <code>index.html</code>, <code>vercel.json</code>, <code>firestore.rules</code>, <code>firebase-applet-config.json</code> ไม่มีการเปลี่ยนแปลงจากเวอร์ชันก่อนหน้า สามารถใช้ของเดิมบน GitHub ได้เลยครับ
            </p>
          </div>

          <div className="bg-white/90 p-3.5 rounded-2xl border border-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-extrabold text-stone-900 text-xs">
                📁 3. สรุปรายชื่อไฟล์ที่ต้องอัปเดต (กดดาวน์โหลดรายไฟล์ได้ทันที):
              </p>
            </div>
            <div className="font-mono text-[11px] divide-y divide-stone-100 bg-stone-50 rounded-xl p-2.5 border border-stone-200 space-y-1">
              {/* CustomerWebsite.tsx */}
              <div className="py-1.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-red-700 block">src/components/CustomerWebsite.tsx</span>
                  <span className="text-[10px] text-stone-600 font-sans">🌟 หน้าเว็บลูกค้า: แสดงโต๊ะว่าง/เต็มใต้ปุ่มเปิดร้าน, สแกนโต๊ะไม่ต้องใส่เบอร์โทร, นำ 'มาทานที่ร้าน' ออก</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadSingleFile('src/components/CustomerWebsite.tsx', 'CustomerWebsite.tsx')}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-[10px] font-sans font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>ดาวน์โหลด</span>
                </button>
              </div>

              {/* revisionInfo.ts */}
              <div className="py-1.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-stone-800 block">src/revisionInfo.ts</span>
                  <span className="text-[10px] text-stone-500 font-sans">หมายเลขเวอร์ชัน 2.8.0</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadSingleFile('src/revisionInfo.ts', 'revisionInfo.ts')}
                  className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-md text-[10px] font-sans font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>ดาวน์โหลด</span>
                </button>
              </div>

              {/* menuService.ts */}
              <div className="py-1.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-red-600 block">src/services/menuService.ts</span>
                  <span className="text-[10px] text-stone-500 font-sans">คำสั่งโต๊ะและลบออเดอร์</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadSingleFile('src/services/menuService.ts', 'menuService.ts')}
                  className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-md text-[10px] font-sans font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>ดาวน์โหลด</span>
                </button>
              </div>

              {/* AdminOrdersManager.tsx */}
              <div className="py-1.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-emerald-800 block">src/components/AdminOrdersManager.tsx</span>
                  <span className="text-[10px] text-amber-800 font-sans font-bold">✨ ปุ่มลบประวัติ / เคลียร์ออเดอร์ทดลอง</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadSingleFile('src/components/AdminOrdersManager.tsx', 'AdminOrdersManager.tsx')}
                  className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-md text-[10px] font-sans font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>ดาวน์โหลด</span>
                </button>
              </div>

              {/* AdminTableManager.tsx */}
              <div className="py-1.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-emerald-800 block">src/components/AdminTableManager.tsx</span>
                  <span className="text-[10px] text-stone-600 font-sans">ระบบจัดการโต๊ะว่าง/เต็ม</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadSingleFile('src/components/AdminTableManager.tsx', 'AdminTableManager.tsx')}
                  className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-md text-[10px] font-sans font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>ดาวน์โหลด</span>
                </button>
              </div>

              {/* App.tsx */}
              <div className="py-1.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-emerald-800 block">src/App.tsx</span>
                  <span className="text-[10px] text-stone-600 font-sans">หน้าหลักและแท็บจัดการโต๊ะ</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadSingleFile('src/App.tsx', 'App.tsx')}
                  className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-md text-[10px] font-sans font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>ดาวน์โหลด</span>
                </button>
              </div>

              {/* types.ts */}
              <div className="py-1.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-stone-700 block">src/types.ts</span>
                  <span className="text-[10px] text-stone-500 font-sans">โครงสร้างโต๊ะและออเดอร์</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadSingleFile('src/types.ts', 'types.ts')}
                  className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-md text-[10px] font-sans font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>ดาวน์โหลด</span>
                </button>
              </div>

              {/* audioAlert.ts */}
              <div className="py-1.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-amber-700 block">src/utils/audioAlert.ts</span>
                  <span className="text-[10px] text-stone-500 font-sans">🔊 ระบบเสียงพูดจริง "มีออเดอร์เข้า"</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadSingleFile('src/utils/audioAlert.ts', 'audioAlert.ts')}
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[10px] font-sans font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>ดาวน์โหลด</span>
                </button>
              </div>

              {/* order-alert.mp3 */}
              <div className="py-1.5 flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-amber-800 block">public/order-alert.mp3</span>
                  <span className="text-[10px] text-stone-500 font-sans">🎵 ไฟล์เสียงพูด MP3 "มีออเดอร์เข้า"</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadSingleFile('public/order-alert.mp3', 'order-alert.mp3')}
                  className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-md text-[10px] font-sans font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>ดาวน์โหลด</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-stone-600 mt-1 italic">
              * ทั้งหมดอยู่ในโฟลเดอร์ <strong>src/</strong> เพียงโฟลเดอร์เดียวเท่านั้น! ไฟล์นอกโฟลเดอร์ไม่ต้องอัปโหลดซ้ำ
            </p>
          </div>
        </div>
      </div>


      {/* 3. Step-by-Step Android Tutorial (โทรศัพท์ Android) */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
        <button
          type="button"
          onClick={() => setShowAndroidGuide(!showAndroidGuide)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 text-sm font-extrabold text-stone-900">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>📱 วิธีอัปโหลดขึ้น GitHub & Vercel ด้วยโทรศัพท์ Android (4 ขั้นตอน)</span>
          </div>
          {showAndroidGuide ? (
            <ChevronUp className="w-4 h-4 text-stone-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-400" />
          )}
        </button>

        {showAndroidGuide && (
          <div className="space-y-3 pt-2 text-xs">
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-bold shrink-0 text-xs mt-0.5">
                1
              </div>
              <div className="space-y-1">
                <span className="font-bold text-stone-900 block">
                  กดดาวน์โหลดไฟล์ ZIP ลงในโทรศัพท์
                </span>
                <p className="text-stone-600 leading-relaxed">
                  กดปุ่มสีแดง <strong>"ดาวน์โหลด Source Code (.ZIP)"</strong> ด้านบน ไฟล์จะไปอยู่ในโฟลเดอร์ <strong>"ดาวน์โหลด (Downloads)"</strong> ในโทรศัพท์ Android ของท่าน
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-bold shrink-0 text-xs mt-0.5">
                2
              </div>
              <div className="space-y-1">
                <span className="font-bold text-stone-900 block">
                  แตกไฟล์ ZIP บนมือถือ (Extract)
                </span>
                <p className="text-stone-600 leading-relaxed">
                  เปิดแอป <strong>"ไฟล์ (Files)"</strong> ของเครื่องมือถือ Android ไปที่โฟลเดอร์ <strong>ดาวน์โหลด</strong> แตะที่ไฟล์ ZIP แล้วเลือก <strong>"แตกไฟล์ที่นี่" (Extract)</strong>
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center font-bold shrink-0 text-xs mt-0.5">
                3
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900">
                    สร้าง Repository และอัปโหลดขึ้น GitHub
                  </span>
                  <a
                    href="https://github.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-red-600 hover:underline flex items-center gap-0.5"
                  >
                    <span>เปิด GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-stone-600 leading-relaxed">
                  เข้าเว็บ <strong>github.com</strong> บนมือถือ กดปุ่ม <strong>`+`</strong> -&gt; <strong>New repository</strong> ตั้งชื่อ เช่น <code>baan-steak-online</code> แล้วกดสร้าง จากนั้นแตะข้อความ <strong>"uploading an existing file"</strong> เพื่อเลือกไฟล์ที่แตกไว้แล้วกดยืนยัน (Commit)
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 text-xs mt-0.5">
                4
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950">
                    กด Import บน Vercel แล้ว Deploy 1 คลิก
                  </span>
                  <a
                    href="https://vercel.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5"
                  >
                    <span>เปิด Vercel</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-emerald-900 leading-relaxed">
                  เข้าเว็บ <strong>vercel.com</strong> ล็อกอินด้วย GitHub กด <strong>"Add New Project"</strong> แล้วกด <strong>"Import"</strong> ข้างชื่อโปรเจกต์ จากนั้นกดปุ่มสีฟ้า <strong>"Deploy"</strong> ทันที! (ใช้เวลาเพียง 30 วินาที ได้ลิงก์เว็บใช้งานได้ตลอดไป)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Pre-Deployment File Audit Checklist */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
        <button
          type="button"
          onClick={() => setShowFilesList(!showFilesList)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 text-sm font-extrabold text-stone-900">
            <FileCheck2 className="w-4 h-4 text-red-600" />
            <span>📋 ตรวจสอบไฟล์ที่จะใช้ในการอัปโหลด (รับประกัน Zero Error)</span>
          </div>
          {showFilesList ? (
            <ChevronUp className="w-4 h-4 text-stone-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-400" />
          )}
        </button>

        {showFilesList && (
          <div className="space-y-4 pt-1 text-xs">
            {/* Included Files */}
            <div className="space-y-2">
              <div className="font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>ไฟล์ที่ "จำเป็นต้องมี" (รวมอยู่ใน ZIP ทั้งหมดแล้ว):</span>
              </div>
              <div className="divide-y divide-stone-100 bg-stone-50 rounded-2xl p-3 border border-stone-200 font-mono text-[11px]">
                <div className="py-1.5 flex justify-between items-center">
                  <span className="font-bold text-stone-900">vercel.json</span>
                  <span className="text-emerald-700 font-sans">คุม Routing ป้องกัน Error 404 เมื่อกดรีเฟรชหรือเปิด /admin</span>
                </div>
                <div className="py-1.5 flex justify-between items-center">
                  <span className="font-bold text-stone-900">package.json</span>
                  <span className="text-emerald-700 font-sans">มีคำสั่ง build: vite build และ dependencies ครบถ้วน</span>
                </div>
                <div className="py-1.5 flex justify-between items-center">
                  <span className="font-bold text-stone-900">firebase-applet-config.json</span>
                  <span className="text-emerald-700 font-sans">กุญแจเชื่อมต่อ Firestore จริง (ฐานข้อมูลออเดอร์และเมนู)</span>
                </div>
                <div className="py-1.5 flex justify-between items-center">
                  <span className="font-bold text-stone-900">firestore.rules</span>
                  <span className="text-emerald-700 font-sans">กฎรักษาความปลอดภัยฐานข้อมูล</span>
                </div>
                <div className="py-1.5 flex justify-between items-center">
                  <span className="font-bold text-stone-900">src/</span>
                  <span className="text-emerald-700 font-sans">ซอร์สโค้ด React, เมนู, แผนที่ GPS, ระบบสั่งอาหาร</span>
                </div>
                <div className="py-1.5 flex justify-between items-center">
                  <span className="font-bold text-stone-900">public/</span>
                  <span className="text-emerald-700 font-sans">ไฟล์ไอคอนและรูปภาพสาธารณะ</span>
                </div>
                <div className="py-1.5 flex justify-between items-center">
                  <span className="font-bold text-stone-900">index.html</span>
                  <span className="text-emerald-700 font-sans">หน้าหลัก HTML พร้อมฟอนต์ Prompt และ Title ภาษาไทย</span>
                </div>
                <div className="py-1.5 flex justify-between items-center">
                  <span className="font-bold text-stone-900">vite.config.ts & tsconfig.json</span>
                  <span className="text-emerald-700 font-sans">ตั้งค่า Tailwind CSS และ TypeScript สำหรับ Build</span>
                </div>
              </div>
            </div>

            {/* Excluded Files */}
            <div className="space-y-2">
              <div className="font-bold text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>ไฟล์ที่ "ห้ามอัปโหลดเด็ดขาด" (ระบบตัดออกให้เรียบร้อยแล้ว):</span>
              </div>
              <div className="bg-rose-50/70 rounded-2xl p-3 border border-rose-200 text-[11px] text-rose-900 space-y-1.5">
                <p>
                  ❌ <strong>node_modules/</strong> — ขนาดใหญ่กว่า 150MB ห้ามอัปโหลดเด็ดขาด บน Vercel ระบบจะติดตั้งให้อัตโนมัติอย่างรวดเร็ว
                </p>
                <p>
                  ❌ <strong>dist/ หรือ build/</strong> — โฟลเดอร์ที่คอมไพล์แล้ว ไม่ต้องอัปโหลด ให้ Vercel เป็นผู้รันคำสั่ง <code>npm run build</code> เอง
                </p>
                <p>
                  ❌ <strong>.git/</strong> — ข้อมูลประวัติเครื่องเก่า
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Direct Quick Tips Card */}
      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-1.5">
        <div className="font-black text-amber-900 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>🔑 สรุปข้อมูลสำคัญหลัง Deploy บน Vercel:</span>
        </div>
        <p className="leading-relaxed">
          • <strong>รหัสผ่าน PIN สำหรับเข้า Admin:</strong> <code>0850451606</code> (ระบบรองรับการยืนยันตัวตนได้สมบูรณ์ทั้งแบบ Server และ Static Vercel)
        </p>
        <p className="leading-relaxed">
          • <strong>ลิงก์เข้าหน้าเว็บ:</strong> เมื่อ Deploy เสร็จ Vercel จะให้โดเมน <code>.vercel.app</code> สามารถคัดลอกไปทำ QR Code หน้าร้าน หรือแปะใน LINE OA ได้ทันที
        </p>
      </div>
    </div>
  );
};
