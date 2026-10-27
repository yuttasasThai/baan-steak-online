import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Edit3,
  Eye,
  EyeOff,
  Layers,
  Link2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Trash2,
  Utensils,
  Zap,
} from 'lucide-react';
import { CategoryItem, MenuItem } from '../types';
import {
  addMenuItem,
  deleteMenuItem,
  initializeBaanSteakMenu,
  normalizeMenuImageUrl,
  reorderMenuItem,
  SHOP_INFO,
  toggleMenuItemAvailability,
  toggleMenuItemPublish,
  updateMenuItem,
} from '../services/menuService';
import { CategoryManagerModal } from './CategoryManagerModal';
import { MenuFormModal } from './MenuFormModal';
import { AdminLinkManagerModal } from './AdminLinkManagerModal';

interface AdminMenuManagerProps {
  menus: MenuItem[];
  categories: CategoryItem[];
  isLoading: boolean;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminMenuManager: React.FC<AdminMenuManagerProps> = ({
  menus,
  categories,
  isLoading,
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Link Generator Modal state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkModalTab, setLinkModalTab] = useState<'admin' | 'user'>('user');

  // Quick inline edit for price
  const [inlinePriceId, setInlinePriceId] = useState<string | null>(null);
  const [inlinePriceVal, setInlinePriceVal] = useState<string>('');

  const filteredMenus = menus.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCat = selectedCategory === 'ทั้งหมด' || m.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const handleToggleAvail = async (item: MenuItem) => {
    try {
      const next = await toggleMenuItemAvailability(item.id, item.isAvailable);
      if (next) {
        onNotify(`🟢 "${item.name}" พร้อมขาย (ลูกค้าสามารถสั่งได้)`, 'success');
      } else {
        onNotify(
          `🔴 "${item.name}" สินค้าหมด (หน้าเว็บลูกค้าจะขึ้น "สินค้าหมด" และห้ามเพิ่มลงตะกร้า)`,
          'info'
        );
      }
    } catch (err) {
      onNotify('ไม่สามารถเปลี่ยนสถานะการขายได้', 'error');
    }
  };

  const handleTogglePub = async (item: MenuItem) => {
    try {
      const next = await toggleMenuItemPublish(item.id, item.isPublished);
      if (next) {
        onNotify(`แสดง "${item.name}" บนหน้าเว็บลูกค้าแล้ว`, 'success');
      } else {
        onNotify(`ซ่อน "${item.name}" จากหน้าเว็บลูกค้าแล้ว`, 'success');
      }
    } catch (err) {
      onNotify('ไม่สามารถเปลี่ยนการแสดงผลได้', 'error');
    }
  };

  const handleReorder = async (item: MenuItem, dir: 'up' | 'down') => {
    try {
      await reorderMenuItem(item, dir, menus);
      onNotify('จัดลำดับเรียบร้อย', 'success');
    } catch (err) {
      onNotify('ไม่สามารถจัดลำดับได้', 'error');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteMenuItem(itemToDelete.id);
      onNotify(`ลบเมนู "${itemToDelete.name}" เรียบร้อย`, 'success');
      setItemToDelete(null);
    } catch (err) {
      onNotify('ไม่สามารถลบได้', 'error');
    }
  };

  const handleSaveInlinePrice = async (item: MenuItem) => {
    const p = Number(inlinePriceVal);
    if (!isNaN(p) && p >= 0) {
      await updateMenuItem(item.id, { price: p });
      onNotify(`อัปเดตราคาเป็น ${p} บาทเรียบร้อย`, 'success');
    }
    setInlinePriceId(null);
  };

  const handleResetToBaanSteakExact = async () => {
    if (window.confirm('ต้องการรีเซ็ตเมนูในฐานข้อมูลให้เป็น 5 เมนูหลักของ "บ้าน สเต็กออนไลน์" หรือไม่?')) {
      try {
        setIsResetting(true);
        await initializeBaanSteakMenu(true);
        onNotify('รีเซ็ตเป็น 5 เมนูหลักของร้านเรียบร้อย', 'success');
      } catch (err) {
        onNotify('เกิดข้อผิดพลาดในการรีเซ็ต', 'error');
      } finally {
        setIsResetting(false);
      }
    }
  };

  const handleFormSubmit = async (data: Omit<MenuItem, 'id'>) => {
    if (editingItem) {
      await updateMenuItem(editingItem.id, data);
      onNotify(`แก้ไขเมนู "${data.name}" เรียบร้อย`, 'success');
    } else {
      await addMenuItem(data);
      onNotify(`เพิ่มเมนูใหม่ "${data.name}" เรียบร้อย`, 'success');
    }
  };

  return (
    <div className="space-y-4 text-stone-900">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-stone-900">จัดการรายการอาหาร</h2>
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded-md">
              {SHOP_INFO.name}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            เพิ่ม แก้ไขราคา เปลี่ยนรูป เปิด/ปิดการขาย หรือจัดลำดับเมนูในฐานข้อมูล Firestore
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>จัดการหมวดหมู่</span>
          </button>

          <button
            onClick={handleResetToBaanSteakExact}
            disabled={isResetting}
            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
            title="รีเซ็ตให้เป็น 5 เมนูหลักของร้านตามที่กำหนด"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>รีเซ็ต 5 เมนูหลัก</span>
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsFormOpen(true);
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>เพิ่มเมนูอาหารใหม่</span>
          </button>
        </div>
      </div>

      {/* Real-time Sync Banner & Quick Link Generators */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-emerald-950 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="font-extrabold text-emerald-900 text-xs sm:text-sm flex items-center gap-2">
              <span>ระบบ Real-Time Menu Sync กำลังทำงาน</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="text-emerald-700 text-xs font-medium mt-0.5">
              เมื่อแก้ไขราคา เพิ่มเมนู หรือสลับสถานะของหมด ลิงก์ของลูกค้าทุกคนจะเห็นข้อมูลใหม่ทันทีแบบ Real-Time จาก Firestore โดยไม่ต้องรีเฟรชหน้าเว็บ
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setLinkModalTab('admin');
              setIsLinkModalOpen(true);
            }}
            className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            title="สร้างลิงก์สำหรับ Admin เข้าจัดการร้าน"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>สร้างลิงก์ Admin</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLinkModalTab('user');
              setIsLinkModalOpen(true);
            }}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
            title="สร้างลิงก์สำหรับลูกค้า สั่งอาหารแยกตามโต๊ะ หรือเดลิเวอรี่"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>สร้างลิงก์สำหรับลูกค้า (User Link)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl p-3 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่ออาหาร..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-red-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('ทั้งหมด')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'ทั้งหมด'
                ? 'bg-red-600 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            ทั้งหมด ({menus.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === c.name
                  ? 'bg-red-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menus Table / List */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-stone-400 text-sm">กำลังโหลดข้อมูลเมนู...</div>
        ) : filteredMenus.length === 0 ? (
          <div className="py-16 text-center text-stone-400 text-sm space-y-2">
            <div>ไม่พบรายการอาหาร</div>
            <button
              onClick={handleResetToBaanSteakExact}
              className="text-xs text-red-600 font-bold underline"
            >
              คลิกเพื่อนำเข้า 5 เมนูหลักของร้านทันที
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                  <th className="py-3 px-3 w-14 text-center">ลำดับ</th>
                  <th className="py-3 px-3 min-w-[200px]">ชื่ออาหาร</th>
                  <th className="py-3 px-3">หมวดหมู่</th>
                  <th className="py-3 px-3">ราคา (บาท)</th>
                  <th className="py-3 px-3 text-center">เปิด/ปิดการขาย</th>
                  <th className="py-3 px-3 text-center">แสดงบนเว็บ</th>
                  <th className="py-3 px-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredMenus.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-stone-50/80 transition ${
                      !item.isAvailable ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    {/* Reorder */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={() => handleReorder(item, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-stone-400 hover:text-stone-800 disabled:opacity-20"
                          title="เลื่อนขึ้น"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleReorder(item, 'down')}
                          disabled={idx === filteredMenus.length - 1}
                          className="p-1 text-stone-400 hover:text-stone-800 disabled:opacity-20"
                          title="เลื่อนลง"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Food Photo and Name */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden border border-stone-200 shrink-0">
                          {item.imageUrl ? (
                            <img
                              src={normalizeMenuImageUrl(item.imageUrl, item.name)}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              className={`w-full h-full object-cover ${
                                !item.isAvailable ? 'grayscale brightness-75' : ''
                              }`}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                (e.currentTarget as HTMLImageElement).src = normalizeMenuImageUrl('', item.name);
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-400">
                              <Utensils className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-stone-900 text-sm truncate">
                            {item.name}
                          </div>
                          {item.description && (
                            <div className="text-[11px] text-stone-500 line-clamp-1">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-medium">
                        {item.category}
                      </span>
                    </td>

                    {/* Price with inline click-to-edit */}
                    <td className="py-3 px-3">
                      {inlinePriceId === item.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={inlinePriceVal}
                            onChange={(e) => setInlinePriceVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveInlinePrice(item);
                              if (e.key === 'Escape') setInlinePriceId(null);
                            }}
                            className="w-16 px-1.5 py-1 bg-white border border-red-500 rounded text-xs font-bold"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveInlinePrice(item)}
                            className="p-1 bg-red-600 text-white rounded font-bold"
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setInlinePriceId(item.id);
                            setInlinePriceVal(String(item.price));
                          }}
                          className="font-extrabold text-sm text-red-600 cursor-pointer hover:underline"
                          title="คลิกเพื่อแก้ไขราคาด่วน"
                        >
                          {item.price} บาท
                        </div>
                      )}
                    </td>

                    {/* Toggle: เปิด/ปิดการขาย */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleAvail(item)}
                        className={`px-3 py-1 rounded-full font-bold text-xs transition ${
                          item.isAvailable
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                        }`}
                      >
                        {item.isAvailable ? '🟢 พร้อมขาย' : '🔴 สินค้าหมด'}
                      </button>
                    </td>

                    {/* Toggle: แสดงบนเว็บลูกค้า */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleTogglePub(item)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                          item.isPublished
                            ? 'text-stone-700 bg-stone-100 hover:bg-stone-200'
                            : 'text-stone-400 bg-stone-50 line-through'
                        }`}
                      >
                        {item.isPublished ? 'แสดงบนเว็บ' : 'ซ่อนไว้'}
                      </button>
                    </td>

                    {/* Edit and Delete */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 text-stone-600 hover:text-red-600 hover:bg-stone-100 rounded-lg transition"
                          title="แก้ไข"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn text-stone-900">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-3 border border-stone-200">
            <h3 className="font-bold text-base text-red-600">ยืนยันการลบเมนู</h3>
            <p className="text-xs text-stone-600">
              ต้องการลบเมนู <strong>"{itemToDelete.name}"</strong> ออกจากฐานข้อมูลหรือไม่?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-3.5 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <MenuFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingItem}
        categories={categories}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onNotify={onNotify}
      />

      {/* Link Generator Modal */}
      <AdminLinkManagerModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onNotify={onNotify}
        initialTab={linkModalTab}
        categories={categories}
      />
    </div>
  );
};
