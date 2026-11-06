import React, { useRef, useState } from 'react';
import {
  Check,
  Edit3,
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

  // Synchronize form fields whenever modal opens or initialData changes
  React.useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setPrice(initialData ? String(initialData.price) : '');
      setCategory(initialData?.category || (categories[0]?.name || 'สเต็ก'));
      setImageUrl(initialData?.imageUrl || '');
      setDescription(initialData?.description || '');
      setIsAvailable(initialData ? initialData.isAvailable : true);
      setIsPublished(initialData ? initialData.isPublished : true);
      setOrderIndex(initialData ? String(initialData.orderIndex) : '0');
      setSelectedFile(null);
      setPreviewUrl(null);
      setErrorMsg('');
      setSubmitStatus('');
    }
  }, [isOpen, initialData, categories]);

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

      // If user selected an image file from their device
      if (selectedFile) {
        setSubmitStatus('กำลังบีบอัดและอัปโหลดรูปภาพ...');
        const uploadResult = await uploadImageToServer(selectedFile);
        if (uploadResult.url) {
          finalImageUrl = uploadResult.url;
        } else if (previewUrl) {
          finalImageUrl = previewUrl;
        }
      }

      setSubmitStatus(isEditing ? 'กำลังบันทึกการแก้ไขเมนูเดิม...' : 'กำลังสร้างเมนูใหม่...');

      await onSubmit({
        name: name.trim(),
        price: numPrice,
        category,
        imageUrl: finalImageUrl,
        description: description.trim(),
        isAvailable,
        isPublished,
        orderIndex: Number(orderIndex) || 0,
      });

      onClose();
    } catch (err: any) {
      console.error('Save menu error:', err);
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการบันทึกเมนู');
    } finally {
      setIsSubmitting(false);
      setSubmitStatus('');
    }
  };

  const displayImagePreview = previewUrl || imageUrl;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/80 backdrop-blur-xs animate-fadeIn text-stone-900 font-['Prompt',sans-serif]">
        <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs ${
                  isEditing ? 'bg-amber-600' : 'bg-red-600'
                }`}
              >
                {isEditing ? <Edit3 className="w-5 h-5" /> : <Utensils className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-extrabold text-base text-stone-900 leading-tight">
                  {isEditing ? 'แก้ไขเมนูอาหารเดิม' : 'เพิ่มเมนูอาหารใหม่'}
                </h3>
                <p className="text-xs text-stone-500">
                  {isEditing
                    ? 'ปรับเปลี่ยนชื่อ ราคา หรือรูปภาพ โดยบันทึกทับเมนูเดิม'
                    : 'เพิ่มรายการเมนูใหม่เข้าสู่ระบบ'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Edit Mode Notice Banner */}
          {isEditing && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 font-medium">
              <span className="text-base">✏️</span>
              <div>
                <strong className="font-bold">กำลังแก้ไขเมนูเดิม:</strong>{' '}
                <span className="text-amber-800 underline font-bold">{initialData?.name}</span>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  ระบบจะบันทึกทับเมนูเดิม ไม่สร้างเป็นเมนูใหม่
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Menu Name */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">
                ชื่อเมนูอาหาร <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น สเต็กหมูพริกไทยดำ, สเต็กเนื้อริบอาย"
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:border-red-500 outline-none transition"
              />
            </div>

            {/* Price & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  ราคา (บาท) <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="เช่น 150"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-900 focus:bg-white focus:border-red-500 outline-none transition"
                  />
                  <span className="absolute right-3 text-xs font-bold text-stone-400">บาท</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  หมวดหมู่ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:bg-white focus:border-red-500 outline-none transition appearance-none cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <Tag className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Photo Selection Section */}
            <div className="space-y-2 pt-1 border-t border-stone-100">
              <label className="block text-xs font-bold text-stone-700">
                รูปภาพเมนูอาหาร:
              </label>

              {/* Photo Preview */}
              {displayImagePreview ? (
                <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 group">
                  <img
                    src={displayImagePreview}
                    alt="ตัวอย่างรูปเมนู"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent flex items-end justify-between p-3">
                    <span className="text-[11px] font-bold text-white bg-black/60 px-2 py-1 rounded-lg backdrop-blur-xs">
                      {selectedFile ? '📷 รูปจากโทรศัพท์ของคุณ' : '🖼️ รูปภาพปัจจุบัน'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setImageUrl('');
                      }}
                      className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-xs cursor-pointer text-xs flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>ลบรูป</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-32 rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center bg-stone-50 text-stone-400 gap-1.5 p-3 text-center">
                  <ImageIcon className="w-8 h-8 text-stone-300" />
                  <span className="text-xs font-bold text-stone-600">ยังไม่มีรูปภาพ</span>
                  <p className="text-[11px] text-stone-400">เลือกรูปจากโทรศัพท์ หรือเลือกจากคลังรูปภาพ</p>
                </div>
              )}

              {/* Photo Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {/* Native Device Upload Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Upload className="w-4 h-4" />
                  <span>📷 เลือกรูปจากโทรศัพท์ / ถ่ายภาพ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl border border-stone-200 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ImageIcon className="w-4 h-4 text-stone-500" />
                  <span>🖼️ เลือกจากคลังรูป / ใส่ URL</span>
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">
                รายละเอียดเมนู (ไม่บังคับ)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ระบุส่วนผสมพิเศษ จุดเด่น หรือระดับความสุก"
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 focus:bg-white focus:border-red-500 outline-none transition resize-none"
              />
            </div>

            {/* Status Toggles */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex items-center gap-2 p-2.5 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-100 transition">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-stone-800">
                  {isAvailable ? '🟢 พร้อมขาย' : '🔴 สินค้าหมด'}
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-100 transition">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-stone-800">
                  {isPublished ? '👁️ แสดงบนเว็บ' : '🔒 ซ่อน'}
                </span>
              </label>
            </div>

            {/* Submission Status & Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 font-extrabold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2 text-white cursor-pointer ${
                  isEditing
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:bg-stone-300 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{submitStatus || 'กำลังบันทึก...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>
                      {isEditing
                        ? '💾 บันทึกการแก้ไข (อัปเดตทับเมนูเดิม)'
                        : '➕ เพิ่มเมนูใหม่เข้าระบบ'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Image Picker Modal */}
      <ImagePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelectImage={(url) => {
          setImageUrl(url);
          setPreviewUrl(url);
          setSelectedFile(null);
        }}
        currentImageUrl={imageUrl}
      />
    </>
  );
};

export default MenuFormModal;
