import React, { useState } from 'react';
import JSZip from 'jszip';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  FileCode,
  Loader2,
  Smartphone,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { CURRENT_REVISION, getRevisionFileName } from '../revisionInfo';

// Read all project source files client-side as raw strings
const rawSourceModules = import.meta.glob(
  [
    '/src/**/*.ts',
    '/src/**/*.tsx',
    '/src/**/*.css',
    '/package.json',
    '/vercel.json',
    '/index.html',
    '/vite.config.ts',
    '/tsconfig.json',
    '/firestore.rules',
    '/firebase-applet-config.json',
  ],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>;

interface AdminSourceCodeExporterProps {
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface PatchFileInfo {
  path: string;
  name: string;
  folder: string;
  isNew?: boolean;
  desc: string;
  badge: string;
  githubUrl: string;
  isCreateMode?: boolean;
}

export const AdminSourceCodeExporter: React.FC<AdminSourceCodeExporterProps> = ({ onNotify }) => {
  const [currentRev] = useState(CURRENT_REVISION.version);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(true);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [viewingCode, setViewingCode] = useState<{ filename: string; content: string } | null>(null);

  const revisionCode = `rev-${currentRev.trim() || '2.9.0'}`;
  const dynamicFileName = getRevisionFileName(revisionCode);
  const GITHUB_REPO_URL = 'https://github.com/yuttasasThai/baan-steak-online';

  const patchFiles: PatchFileInfo[] = [
    {
      path: 'src/components/IncomingOrderModal.tsx',
      name: 'IncomingOrderModal.tsx',
      folder: 'src/components',
      isNew: true,
      desc: 'หน้าต่างใหม่เด้งขึ้นกลางจอเมื่อมีออเดอร์เข้า พร้อมปุ่มกดรับทันที',
      badge: '🚨 ไฟล์ใหม่สำคัญที่สุด',
      githubUrl: `${GITHUB_REPO_URL}/new/main/src/components?filename=IncomingOrderModal.tsx`,
      isCreateMode: true,
    },
    {
      path: 'src/App.tsx',
      name: 'App.tsx',
      folder: 'src',
      desc: 'หน้าหลัก, ระบบเด้งหน้าต่างออเดอร์เข้า, ระบบเสียงเตือนซ้ำวนเรื่อยๆ จนกว่าจะกดรับ',
      badge: '⭐ หน้าหลัก',
      githubUrl: `${GITHUB_REPO_URL}/edit/main/src/App.tsx`,
    },
    {
      path: 'src/utils/audioAlert.ts',
      name: 'audioAlert.ts',
      folder: 'src/utils',
      desc: 'ระบบเสียงพูดจริงภาษาไทย "มีออเดอร์เข้า โต๊ะ..." เตือนซ้ำวนต่อเนื่องจนกว่าจะกดรับ',
      badge: '🔊 เสียงเตือนซ้ำ',
      githubUrl: `${GITHUB_REPO_URL}/edit/main/src/utils/audioAlert.ts`,
    },
    {
      path: 'src/components/CustomerWebsite.tsx',
      name: 'CustomerWebsite.tsx',
      folder: 'src/components',
      desc: 'หน้าเว็บลูกค้า: แสดงโต๊ะว่าง/เต็มใต้ปุ่มเปิดร้าน, สแกนโต๊ะไม่ต้องใส่เบอร์โทร',
      badge: '🍽️ หน้าเว็บลูกค้า',
      githubUrl: `${GITHUB_REPO_URL}/edit/main/src/components/CustomerWebsite.tsx`,
    },
    {
      path: 'src/services/menuService.ts',
      name: 'menuService.ts',
      folder: 'src/services',
      desc: 'ระบบคำสั่งโต๊ะอาหาร (subscribeTables), ฟังก์ชันลบออเดอร์ (deleteOrder, clearOrdersHistory)',
      badge: '⚡ ฟังก์ชันโต๊ะ/ออเดอร์',
      githubUrl: `${GITHUB_REPO_URL}/edit/main/src/services/menuService.ts`,
    },
    {
      path: 'src/components/AdminOrdersManager.tsx',
      name: 'AdminOrdersManager.tsx',
      folder: 'src/components',
      desc: 'หน้าจัดการออเดอร์: เพิ่มปุ่มลบประวัติออเดอร์ทดลอง, ปุ่มรับออเดอร์สีเขียวเด่น',
      badge: '✨ ลบประวัติออเดอร์',
      githubUrl: `${GITHUB_REPO_URL}/edit/main/src/components/AdminOrdersManager.tsx`,
    },
    {
      path: 'src/components/AdminTableManager.tsx',
      name: 'AdminTableManager.tsx',
      folder: 'src/components',
      desc: 'ระบบจัดการโต๊ะอาหาร: กำหนดจำนวนโต๊ะ แจ้งโต๊ะว่าง/เต็ม สร้าง QR Code',
      badge: '🪑 จัดการโต๊ะ',
      githubUrl: `${GITHUB_REPO_URL}/edit/main/src/components/AdminTableManager.tsx`,
    },
    {
      path: 'src/revisionInfo.ts',
      name: 'revisionInfo.ts',
      folder: 'src',
      desc: 'บันทึกหมายเลขเวอร์ชัน 2.9.0',
      badge: '🏷️ เลขเวอร์ชัน',
      githubUrl: `${GITHUB_REPO_URL}/edit/main/src/revisionInfo.ts`,
    },
    {
      path: 'src/types.ts',
      name: 'types.ts',
      folder: 'src',
      desc: 'โครงสร้างข้อมูล TypeScript: TableItem, OrderStatus',
      badge: '📑 Types',
      githubUrl: `${GITHUB_REPO_URL}/edit/main/src/types.ts`,
    },
  ];

  const getFileContent = (filePath: string): string | null => {
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    if (rawSourceModules[cleanPath]) return rawSourceModules[cleanPath];
    if (rawSourceModules[filePath]) return rawSourceModules[filePath];
    const match = Object.entries(rawSourceModules).find(([k]) => k.endsWith(filePath));
    return match ? match[1] : null;
  };

  const handleCopyCode = async (filePath: string, filename: string) => {
    const content = getFileContent(filePath);
    if (!content) {
      onNotify(`ไม่พบเนื้อหาโค้ดของไฟล์ ${filename}`, 'error');
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedFile(filename);
      setTimeout(() => setCopiedFile(null), 3000);
      onNotify(`📋 คัดลอกโค้ด ${filename} ทั้งหมดแล้ว! นำไปวางใน GitHub ได้ทันที`, 'success');
    } catch {
      setViewingCode({ filename, content });
      onNotify('กรุณาคัดลอกจากหน้าต่างแสดงโค้ด', 'info');
    }
  };

  const handleDownloadSingleFile = (filePath: string, filename: string) => {
    try {
      const content = getFileContent(filePath);
      if (!content) {
        onNotify(`ไม่พบเนื้อหาของไฟล์ ${filename}`, 'error');
        return;
      }
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      onNotify(`📥 ดาวน์โหลดไฟล์ ${filename} สำเร็จ (เป็นไฟล์แท้ ไม่ใช่ .html)`, 'success');
    } catch (err) {
      console.error('Download single file error:', err);
      onNotify('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์', 'error');
    }
  };

  const handleDownloadZip = async (type: 'patch' | 'full' = 'patch') => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const cleanRev = revisionCode;
      const targetFileName = type === 'patch'
        ? `baan-steak-patch-${cleanRev}.zip`
        : `baan-steak-full-${cleanRev}.zip`;

      const patchPathsList = patchFiles.map((f) => f.path);
      let count = 0;

      for (const [key, content] of Object.entries(rawSourceModules)) {
        const cleanPath = key.startsWith('/') ? key.slice(1) : key;
        if (type === 'patch') {
          if (patchPathsList.some((p) => cleanPath.endsWith(p) || cleanPath === p)) {
            zip.file(cleanPath, content);
            count++;
          }
        } else {
          zip.file(cleanPath, content);
          count++;
        }
      }

      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = targetFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      onNotify(`✅ ดาวน์โหลด ${targetFileName} (${count} ไฟล์) สำเร็จแล้ว!`, 'success');
    } catch (err) {
      console.error('Download error:', err);
      onNotify('เกิดข้อผิดพลาดในการสร้างไฟล์ ZIP', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-5 text-stone-900 max-w-2xl mx-auto">
      {/* Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 rounded-3xl p-5 text-white shadow-lg space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold leading-tight">
                ศูนย์อัปเดตโค้ดสำหรับโทรศัพท์ Android
              </h2>
              <p className="text-xs text-rose-100 mt-0.5">
                คัดลอกโค้ดไปวางบน GitHub ได้ใน 1 คลิก ไม่ต้องแตกไฟล์ ไม่ต้องหาโฟลเดอร์
              </p>
            </div>
          </div>
          <span className="shrink-0 px-2.5 py-1 bg-white/25 backdrop-blur-xs rounded-full text-[11px] font-black border border-white/30 flex items-center gap-1">
            <Tag className="w-3 h-3 text-amber-300" />
            <span>{revisionCode}</span>
          </span>
        </div>
      </div>

      {/* Files List with 1-Tap Copy & Open GitHub */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2 text-sm font-black text-stone-900">
            <Smartphone className="w-4 h-4 text-red-600" />
            <span>กดคัดลอกโค้ด แล้วกดเปิดหน้าแก้ไขบน GitHub:</span>
          </div>
        </div>

        <div className="space-y-3">
          {patchFiles.map((file, idx) => {
            const isCopied = copiedFile === file.name;
            return (
              <div
                key={file.path}
                className={`p-3.5 rounded-2xl border transition-all ${
                  file.isNew
                    ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-200'
                    : 'bg-stone-50/80 border-stone-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-5 h-5 rounded-full bg-stone-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-mono font-bold text-xs text-stone-900 break-all">
                      {file.path}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      file.isNew ? 'bg-red-600 text-white' : 'bg-stone-200 text-stone-700'
                    }`}>
                      {file.badge}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-stone-600 mb-3">{file.desc}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(file.path, file.name)}
                    className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95 ${
                      isCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>คัดลอกแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-emerald-600" />
                        <span>📋 คัดลอกโค้ด</span>
                      </>
                    )}
                  </button>

                  <a
                    href={file.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer text-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{file.isCreateMode ? '🌐 สร้างบน GitHub' : '🌐 เปิดแก้บน GitHub'}</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDownloadSingleFile(file.path, file.name)}
                    className="py-2 px-2.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-stone-500" />
                    <span>📥 โหลดไฟล์</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const content = getFileContent(file.path);
                      if (content) {
                        setViewingCode({ filename: file.name, content });
                      } else {
                        onNotify(`ไม่พบโค้ดของไฟล์ ${file.name}`, 'error');
                      }
                    }}
                    className="py-2 px-2.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-stone-500" />
                    <span>👁️ ดูโค้ด</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Code Modal */}
      {viewingCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
            <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-amber-400" />
                <span className="font-bold font-mono text-sm">{viewingCode.filename}</span>
              </div>
              <button
                type="button"
                onClick={() => setViewingCode(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto bg-stone-950 font-mono text-xs text-stone-200 whitespace-pre select-all">
              {viewingCode.content}
            </div>
            <div className="p-4 bg-stone-100 border-t border-stone-200 flex items-center justify-between gap-3">
              <span className="text-xs text-stone-600">
                ขนาด: {Math.round(viewingCode.content.length / 1024)} KB
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(viewingCode.content);
                  onNotify(`📋 คัดลอกโค้ด ${viewingCode.filename} แล้ว!`, 'success');
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>คัดลอกทั้งหมด</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSourceCodeExporter;
