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
  const revisionCode = `rev-${currentRev.trim() || '2.4.0'}`;
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

  // Download Trigger Handler
  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const cleanRev = revisionCode;
      const downloadUrl = `/api/export-source?rev=${encodeURIComponent(cleanRev)}&t=${Date.now()}`;

      // Create hidden link and trigger download on Android browser
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = dynamicFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onNotify(
        `✅ เริ่มดาวน์โหลดไฟล์ "${dynamicFileName}" เรียบร้อยแล้ว! (ตรวจสอบในโฟลเดอร์ Downloads บนมือถือ)`,
        'success'
      );
    } catch (err) {
      console.error('Download error:', err);
      onNotify('เกิดข้อผิดพลาดในการดาวน์โหลด กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setTimeout(() => {
        setIsDownloading(false);
      }, 1500);
    }
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

      {/* 2. Primary Action: Download Button & Revision Control */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2 text-sm font-bold text-stone-800">
            <GitBranch className="w-4 h-4 text-red-600" />
            <span>กำหนด Revision และดาวน์โหลด</span>
          </div>
          <span className="text-[11px] text-stone-500">
            อัปเดตล่าสุด: {CURRENT_REVISION.formattedDateTh}
          </span>
        </div>

        {/* Revision Input & Bump Options */}
        <div className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="block text-xs font-bold text-stone-700">
                หมายเลข Revision (จะถูกระบุลงในชื่อไฟล์ ZIP อัตโนมัติ เพื่อป้องกันการสับสน):
              </label>
              <p className="text-[11px] text-stone-500">
                เมื่อแก้ไขโค้ดใหม่ ให้กดปรับ Revision เพื่อไม่ให้ชื่อไฟล์ซ้ำกัน
              </p>
            </div>
            {/* Quick Bump Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleBumpRevision('patch')}
                className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-xs font-bold text-stone-700 transition active:scale-95"
                title="เพิ่มรุ่นย่อย (เช่น 2.2.0 -> 2.2.1)"
              >
                +0.0.1 (Patch)
              </button>
              <button
                type="button"
                onClick={() => handleBumpRevision('minor')}
                className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-xs font-bold text-stone-700 transition active:scale-95"
                title="เพิ่มรุ่นฟังก์ชัน (เช่น 2.2.0 -> 2.3.0)"
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
                placeholder="2.2.0"
                className="w-full text-sm font-mono font-bold text-stone-900 focus:outline-none"
              />
            </div>
            <div className="text-xs font-mono text-stone-500 truncate flex-1 hidden sm:block">
              📦 ชื่อไฟล์: <span className="text-stone-800 font-bold">{dynamicFileName}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">
              บันทึกการแก้ไขในรุ่นนี้ (Changelog Note):
            </label>
            <input
              type="text"
              value={customRevNote}
              onChange={(e) => setCustomRevNote(e.target.value)}
              placeholder="เช่น เพิ่มระบบแยกหน้าลูกค้า/แอดมิน, ปรับปรุงตารางรับอาหาร"
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs text-stone-800 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Big Download Button */}
        <div className="pt-1">
          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownloadZip}
            className="w-full py-4 px-5 bg-red-600 hover:bg-red-700 active:scale-98 disabled:bg-stone-400 text-white font-extrabold text-base rounded-2xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2.5 cursor-pointer"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>กำลังเตรียมไฟล์ ZIP...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>ดาวน์โหลด Source Code (.ZIP) สำหรับมือถือ Android</span>
              </>
            )}
          </button>
          <div className="text-center mt-2">
            <span className="text-[11px] text-stone-500">
              📁 ไฟล์ที่จะได้รับ: <code className="font-mono font-bold text-red-600">{dynamicFileName}</code>
            </span>
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
