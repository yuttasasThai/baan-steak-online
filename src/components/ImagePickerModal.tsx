import React, { useState } from 'react';
import { Check, Image as ImageIcon, Link, X } from 'lucide-react';

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  currentUrl?: string;
  category?: string;
}

const BAAN_STEAK_PRESETS = [
  {
    category: 'สเต็ก',
    title: 'สเต็กหมู',
    url: '/src/assets/images/steak_moo_1791353856229.jpg',
  },
  {
    category: 'สเต็ก',
    title: 'สเต็กไก่',
    url: '/src/assets/images/steak_gai_1791353798435.jpg',
  },
  {
    category: 'สลัด',
    title: 'สลัดไก่',
    url: '/src/assets/images/salad_gai_1791353810767.jpg',
  },
  {
    category: 'ของทานเล่น',
    title: 'เกี๊ยวน้ำหมูสับ',
    url: '/src/assets/images/kiao_nam_1791353821099.jpg',
  },
  {
    category: 'ของทานเล่น',
    title: 'เกี๊ยวหมูสับทอด',
    url: '/src/assets/images/kiao_thod_1791353830468.jpg',
  },
  {
    category: 'ป้ายร้าน',
    title: 'ป้ายร้าน บ้าน สเต็กออนไลน์',
    url: '/IMG_20261007_161813.jpg',
  },
];

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentUrl,
}) => {
  const [customUrl, setCustomUrl] = useState(currentUrl || '');

  if (!isOpen) return null;

  const handleApplyCustom = () => {
    if (customUrl.trim()) {
      onSelect(customUrl.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn text-stone-900">
      <div className="relative w-full max-w-xl bg-white border border-stone-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-base">เลือกรูปภาพอาหาร</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Custom URL Input */}
        <div className="p-4 border-b border-stone-100 bg-white space-y-2">
          <label className="block text-xs font-bold text-stone-700">
            ใส่ URL รูปภาพ (Direct Link)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="flex-1 px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-red-500"
            />
            <button
              onClick={handleApplyCustom}
              disabled={!customUrl.trim()}
              className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 disabled:bg-stone-200 disabled:text-stone-400 transition"
            >
              ใช้ลิงก์นี้
            </button>
          </div>
        </div>

        {/* Preset Gallery */}
        <div className="p-4 overflow-y-auto max-h-80 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BAAN_STEAK_PRESETS.map((img, idx) => {
            const isSelected = currentUrl === img.url;
            return (
              <div
                key={idx}
                onClick={() => {
                  onSelect(img.url);
                  onClose();
                }}
                className={`group relative aspect-[4/3] rounded-xl overflow-hidden border cursor-pointer transition ${
                  isSelected ? 'border-red-600 ring-2 ring-red-500/40' : 'border-stone-200 hover:border-red-400'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-2">
                  <span className="text-[11px] font-bold text-white leading-tight truncate">
                    {img.title}
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-stone-100 bg-stone-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 text-stone-700 text-xs font-bold rounded-xl hover:bg-stone-300 transition"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
