import React, { useRef, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Tag,
  Upload,
  Utensils,
  X,
} from 'lucide-react';
import { compressImageFile, uploadImageToServer } from '../utils/imageCompressor';
import { CategoryItem, MenuItem } from '../types';
import { ImagePickerModal } from './ImagePickerModal';

interface MenuFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<MenuItem, 'id'>) => Promise<void>;
  initialData?: MenuItem | null;
  categories: CategoryItem[];
}

export const MenuFormModal: React.FC<MenuFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
}) => {
  const isEditing = Boolean(initialData);

  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData ? String(initialData.price) : '');
  const [category, setCategory] = useState(initialData?.category || (categories[0]?.name || 'สเต็ก'));
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [isAvailable, setIsAvailable] = useState(initialData ? initialData.isAvailable : true);
  const [isPublished, setIsPublished] = useState(initialData ? initialData.isPublished : true);
  const [orderIndex, setOrderIndex] = useState(initialData ? String(initialData.orderIndex) : '0');

  // Phone Image selection states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Handle phone image selection (Gallery / Camera / Files)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    try {
      setErrorMsg('');
      setSelectedFile(file);
      // Fast compress and preview
      const compressed = await compressImageFile(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.85,
        mimeType: 'image/jpeg',
      });
      setPreviewUrl(compressed.dataUrl);
    } catch (err) {
      console.warn('Compress failed, using object URL:', err);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('กรุณากรอกชื่อเมนูอาหาร');
      return;
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setErrorMsg('กรุณากรอกราคาเป็นตัวเลข (0 บาทขึ้นไป)');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');

      let finalImageUrl = imageUrl.trim();

      // If a file from phone is selected, compress and store permanently in Firestore
      if (selectedFile) {
        setSubmitStatus('กำลังประมวลผลรูปภาพ...');
        try {
          const compressed = await compressImageFile(selectedFile, {
            maxWidth: 640,
            maxHeight: 640,
            quality: 0.78,
            mimeType: 'image/jpeg',
          });
          // Store compressed base64 directly in Firestore to guarantee images never disappear on publish
          finalImageUrl = compressed.dataUrl;
          // Optionally also mirror to server uploads
          uploadImageToServer(compressed.dataUrl, 'menu').catch(() => {});
        } catch (storageErr) {
          console.warn('Image processing warning:', storageErr);
        }
      }

      setSubmitStatus('กำลังบันทึกข้อมูลลง Firestore...');
      await onSubmit({
        name: name.trim(),
        price: numPrice,
        category: category.trim(),
        imageUrl: finalImageUrl,
        description: description.trim(),
        isAvailable,
        isPublished,
        orderIndex: Number(orderIndex) || 0,
      });

      onClose();
    } catch (err) {
      console.error('Submit error:', err);
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
      setSubmitStatus('');
    }
  };

  const displayImage = previewUrl || imageUrl;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn text-stone-900">
        <div className="relative w-full max-w-lg max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-stone-50">
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-red-600" />
              <h3 className="font-extrabold text-base">
                {isEditing ? 'แก้ไขรายการอาหาร' : 'เพิ่มเมนูอาหารใหม่'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold">
                {errorMsg}
              </div>
            )}

            {/* Hidden native file input for phone gallery/photos */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Photo Selector Area */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2.5">
              <label className="block font-bold text-stone-800">
                รูปภาพอาหาร
              </label>

              <div className="flex gap-3 items-center">
                {/* Image Preview Box */}
                <div className="relative w-24 h-24 rounded-2xl bg-white border-2 border-stone-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                  {displayImage ? (
                    <>
                      <img
                        src={displayImage}
                        alt={name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {previewUrl && (
                        <div className="absolute inset-x-0 bottom-0 bg-red-600/90 text-white text-[9px] font-bold text-center py-0.5">
                          รูปใหม่
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center p-2 text-stone-400 space-y-1">
                      <ImageIcon className="w-6 h-6 mx-auto stroke-1 text-stone-300" />
                      <span className="text-[10px] block font-medium">ยังไม่มีรูป</span>
                    </div>
                  )}
                </div>

                {/* Direct Action Buttons */}
                <div className="flex-1 space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                  >
                    {isEditing ? (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>🔄 เปลี่ยนรูป</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4" />
                        <span>🖼️ เลือกรูปจากโทรศัพท์</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(true)}
                      className="flex-1 py-1.5 px-2 bg-white hover:bg-stone-100 text-stone-700 font-bold border border-stone-200 rounded-lg transition text-[11px]"
                    >
                      เลือกจากรูปของร้าน
                    </button>
                    {previewUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="py-1.5 px-2 text-stone-500 hover:text-red-600 text-[11px] font-semibold"
                      >
                        ยกเลิกรูปนี้
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {previewUrl && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 font-medium">
                  ✓ เลือกรูปเรียบร้อยแล้ว (ระบบจะอัปโหลดไปยัง Firebase Storage อัตโนมัติเมื่อกดบันทึก)
                </div>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                ชื่อเมนูอาหาร <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น สเต็กหมู, สเต็กไก่..."
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-medium focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Price and Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  ราคา (บาท) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="69"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-bold text-red-600 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">หมวดหมู่อาหาร</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-medium focus:outline-none focus:border-red-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  {!categories.some((c) => c.name === category) && (
                    <option value={category}>{category}</option>
                  )}
                </select>
              </div>
            </div>

            {/* Description (Saved in DB for admin reference) */}
            <div>
              <label className="block font-bold text-stone-700 mb-1">รายละเอียดอาหาร (บันทึกข้อมูลหลังบ้าน)</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ระบุส่วนผสม หรือรายละเอียดอาหาร..."
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:border-red-500"
              />
            </div>

            {/* Switches: Availability & Published */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              {/* เปิด/ปิดการขาย */}
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <div className="font-bold text-stone-800">เปิด/ปิดการขาย</div>
                  <div className="text-[11px] text-stone-500">
                    {isAvailable
                      ? 'พร้อมขาย ลูกค้าสามารถสั่งได้'
                      : 'สินค้าหมด หน้าเว็บลูกค้าจะขึ้น "สินค้าหมด" และกดสั่งไม่ได้'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAvailable(!isAvailable)}
                  className={`px-3 py-1 rounded-full font-bold text-xs ${
                    isAvailable
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {isAvailable ? '🟢 พร้อมขาย' : '🔴 สินค้าหมด'}
                </button>
              </div>

              {/* แสดงบนหน้าเว็บ */}
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <div className="font-bold text-stone-800">แสดงบนหน้าเว็บลูกค้า</div>
                  <div className="text-[11px] text-stone-500">
                    {isPublished ? 'แสดงให้ลูกค้าเห็น' : 'ซ่อนไว้ (ไม่แสดงบนเว็บ)'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublished(!isPublished)}
                  className={`px-3 py-1 rounded-lg font-semibold text-xs ${
                    isPublished
                      ? 'bg-stone-200 text-stone-800'
                      : 'bg-stone-100 text-stone-400 line-through'
                  }`}
                >
                  {isPublished ? 'แสดง' : 'ซ่อน'}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-2 py-3 bg-red-600 hover:bg-red-700 active:scale-98 disabled:bg-stone-300 text-white font-extrabold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{submitStatus || 'กำลังบันทึก...'}</span>
                  </>
                ) : (
                  <span>{isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มเมนู'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ImagePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={(url: string) => {
          setImageUrl(url);
          setPreviewUrl(null);
          setSelectedFile(null);
        }}
        currentUrl={imageUrl}
      />
    </>
  );
};
