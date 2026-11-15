import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { updateShopHeroBanner, updateShopSettings } from '../services/menuService';
import { ShopSettings } from '../types';
import defaultHero from '../assets/IMG_20261007_161813.jpg';
import { compressImageFile, uploadImageToServer } from '../utils/imageCompressor';

interface AdminHeroImageManagerProps {
  settings: ShopSettings;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminHeroImageManager: React.FC<AdminHeroImageManagerProps> = ({
  settings,
  onNotify,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedDataUrl, setCompressedDataUrl] = useState<string | null>(null);
  const [fileStats, setFileStats] = useState<{ origSize: string; compSize: string } | null>(null);

  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isUrlMode, setIsUrlMode] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentBanner =
    settings.heroBannerUrl &&
    !settings.heroBannerUrl.includes('file_00000000322c8230a99655a0452e2494')
      ? settings.heroBannerUrl
      : defaultHero;

  // Handle image file selection (Gallery / Camera / Files)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onNotify('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)', 'error');
      return;
    }

    try {
      setSelectedFile(file);
      setUploadStatus('กำลังปรับขนาดและลดขนาดไฟล์เพื่อการโหลดที่รวดเร็ว...');

      // Compress and optimize image to fit permanently in Cloud Firestore
      const origSizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const result = await compressImageFile(file, {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 0.82,
        mimeType: 'image/jpeg',
      });

      const compSizeKb = Math.round(result.sizeBytes / 1024);
      setCompressedDataUrl(result.dataUrl);
      setPreviewUrl(result.dataUrl);
      setFileStats({
        origSize: `${origSizeMb} MB`,
        compSize: `${compSizeKb} KB`,
      });
      setUploadStatus('');
    } catch (err) {
      console.error('Compress error:', err);
      onNotify('ไม่สามารถประมวลผลไฟล์รูปภาพได้ กรุณาลองใหม่อีกครั้ง', 'error');
      setUploadStatus('');
    }
  };

  // Upload and Save Cover Image permanently to Firestore Cloud Database
  const handleSaveUpload = async () => {
    if (!compressedDataUrl) {
      onNotify('กรุณาเลือกไฟล์รูปภาพก่อนกดบันทึก', 'error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('กำลังบันทึกภาพหน้าปกถาวรลงฐานข้อมูลคลาวด์...');

    try {
      // 1. Save directly into Firestore (settings/shop -> heroBannerUrl) for 100% permanent cloud persistence
      await updateShopSettings({
        heroBannerUrl: compressedDataUrl,
      });

      // 2. Also update local hero banner listeners
      await updateShopHeroBanner(compressedDataUrl);

      // 3. Background server upload backup
      uploadImageToServer(compressedDataUrl, 'hero').catch(() => {});

      onNotify('✅ บันทึกภาพหน้าปกใหม่แบบถาวรเรียบร้อยแล้ว! ข้อมูลจะคงอยู่ตลอดไป', 'success');
      setSelectedFile(null);
      setPreviewUrl(null);
      setCompressedDataUrl(null);
      setFileStats(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Save hero banner error:', err);
      onNotify('เกิดข้อผิดพลาดในการบันทึกภาพหน้าปก กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  // Save by direct URL
  const handleSaveByUrl = async () => {
    const trimmed = customUrlInput.trim();
    if (!trimmed) {
      onNotify('กรุณากรอก URL ของรูปภาพ', 'error');
      return;
    }

    setIsUploading(true);
    setUploadStatus('กำลังบันทึก URL...');
    try {
      await updateShopSettings({
        heroBannerUrl: trimmed,
      });
      await updateShopHeroBanner(trimmed);
      onNotify('เปลี่ยนภาพหน้าปกด้วย URL สำเร็จแล้ว!', 'success');
      setCustomUrlInput('');
      setIsUrlMode(false);
    } catch (err) {
      onNotify('เกิดข้อผิดพลาดในการบันทึก URL', 'error');
    } finally {
      setIsUploading(false);
      setUploadStatus('');
    }
  };

  // Reset to default shop cover
  const handleResetToDefault = async () => {
    try {
      setIsUploading(true);
      const defaultUrl = '/IMG_20261007_161813.jpg';
      await updateShopSettings({
        heroBannerUrl: defaultUrl,
      });
      await updateShopHeroBanner(defaultUrl);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCompressedDataUrl(null);
      setFileStats(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onNotify('รีเซ็ตภาพหน้าปกเป็นภาพตั้งต้นของร้านเรียบร้อยแล้ว', 'success');
    } catch (err) {
      onNotify('ไม่สามารถรีเซ็ตภาพหน้าปกได้', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <ImageIcon className="w-4 h-4 text-red-600" />
          <span>🖼️ จัดการภาพหน้าปกเว็บไซต์ (Hero Image)</span>
        </div>
        <button
          type="button"
          onClick={handleResetToDefault}
          disabled={isUploading}
          className="text-xs font-semibold text-stone-500 hover:text-red-600 flex items-center gap-1 transition"
          title="ใช้ภาพหน้าปกเริ่มต้นของร้าน"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>รีเซ็ตเป็นภาพเริ่มต้น</span>
        </button>
      </div>

      <div className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
        เลือกรูปภาพใหม่จากโทรศัพท์หรือคอมพิวเตอร์ ระบบจะทำการบีบอัดภาพให้อัตโนมัติ (โหลดเร็ว ประหยัดเน็ต) และบันทึกลง <strong>Firestore</strong> แบบ Real-time ทันที
      </div>

      {/* Current Active Banner Preview */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-stone-700">
            ภาพหน้าปกที่แสดงอยู่ในปัจจุบัน:
          </label>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> ออนไลน์อยู่
          </span>
        </div>
        <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 aspect-16/7 max-h-48 flex items-center justify-center shadow-xs">
          <img
            src={currentBanner}
            alt="ภาพหน้าปกปัจจุบัน"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = defaultHero;
            }}
          />
          <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold rounded-lg">
            ภาพปัจจุบันบนหน้าเว็บลูกค้า
          </div>
        </div>
      </div>

      {/* Mode toggle: File upload vs URL input */}
      <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
        <button
          type="button"
          onClick={() => setIsUrlMode(false)}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            !isUrlMode
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>เลือกรูปจากโทรศัพท์ / เครื่อง</span>
        </button>
        <button
          type="button"
          onClick={() => setIsUrlMode(true)}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            isUrlMode
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>ระบุด้วย URL รูปภาพ</span>
        </button>
      </div>

      {/* Mode 1: File Upload */}
      {!isUrlMode && (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
            id="hero-file-input"
          />

          {previewUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border-2 border-red-500 bg-stone-900 aspect-16/7 max-h-48 flex items-center justify-center shadow-md">
                <img
                  src={previewUrl}
                  alt="ภาพตัวอย่างก่อนบันทึก"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2.5 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg shadow-sm">
                  ตัวอย่างภาพใหม่ (กำลังรอบันทึก)
                </div>
                {fileStats && (
                  <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/75 backdrop-blur-xs text-white text-[10px] font-medium rounded-lg">
                    ขนาด: {fileStats.compSize} (บีบอัดจาก {fileStats.origSize})
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveUpload}
                  disabled={isUploading}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 active:scale-98 disabled:bg-stone-300 text-white font-extrabold text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{uploadStatus || 'กำลังบันทึก...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>บันทึกและใช้เป็นภาพหน้าปกทันที</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setCompressedDataUrl(null);
                    setFileStats(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  disabled={isUploading}
                  className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm rounded-xl transition"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="hero-file-input"
              className="flex flex-col items-center justify-center border-2 border-dashed border-stone-300 hover:border-red-500 rounded-2xl p-6 cursor-pointer bg-stone-50 hover:bg-red-50/30 transition group text-center space-y-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-800">
                  แตะที่นี่เพื่อเลือกภาพหน้าปกใหม่จากโทรศัพท์
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  เปิดรูปภาพ / กล้อง / อัลบั้ม (ระบบบีบอัดให้โหลดไวทันที)
                </p>
              </div>
            </label>
          )}
        </div>
      )}

      {/* Mode 2: Direct URL Input */}
      {isUrlMode && (
        <div className="space-y-3 bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
          <label className="block text-xs font-bold text-stone-700">
            ใส่ลิงก์ URL รูปภาพที่ต้องการ:
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://images.unsplash.com/... หรือ URL รูปภาพ"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              type="button"
              onClick={handleSaveByUrl}
              disabled={isUploading || !customUrlInput.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>บันทึก URL</span>
            </button>
          </div>

          {customUrlInput.trim() && (
            <div className="mt-2 rounded-xl overflow-hidden border border-stone-300 aspect-16/7 max-h-36 bg-black flex items-center justify-center">
              <img
                src={customUrlInput}
                alt="ตัวอย่างรูปภาพจาก URL"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = defaultHero;
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
