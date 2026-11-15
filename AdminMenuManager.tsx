import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Camera,
  ChevronDown,
  ChevronUp,
  Edit3,
  Layers,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  Zap,
} from 'lucide-react';
import { CategoryItem, MenuItem, Order, ShopSettings } from '../types';
import { compressImageFile } from '../utils/imageCompressor';
import {
  addMenuItem,
  cleanupLegacyAutoSeededMenus,
  deleteMenuItem,
  initializeBaanSteakMenu,
  normalizeMenuImageUrl,
  reorderMenuItem,
  reorderMenusByCategoryAndPrice,
  SHOP_INFO,
  sortCategories,
  sortMenus,
  toggleMenuItemAvailability,
  toggleMenuItemPublish,
  updateMenuItem,
  updateShopSettings,
} from '../services/menuService';
import { CategoryManagerModal } from './CategoryManagerModal';
import { MenuFormModal } from './MenuFormModal';
import { AdminLinkManagerModal } from './AdminLinkManagerModal';

interface AdminMenuManagerProps {
  menus: MenuItem[];
  categories: CategoryItem[];
  settings?: ShopSettings;
  orders?: Order[];
  isLoading: boolean;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminMenuManager: React.FC<AdminMenuManagerProps> = ({
  menus,
  categories,
  settings,
  orders = [],
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
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isCleaningMockDrinks, setIsCleaningMockDrinks] = useState(false);
  const [isRecommendedExpanded, setIsRecommendedExpanded] = useState(true);
  const [selectedAddRecId, setSelectedAddRecId] = useState('');
  const [isSavingRecommended, setIsSavingRecommended] = useState(false);

  // Link Generator Modal state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkModalTab, setLinkModalTab] = useState<'admin' | 'user'>('user');

  // Quick inline edit for price
  const [inlinePriceId, setInlinePriceId] = useState<string | null>(null);
  const [inlinePriceVal, setInlinePriceVal] = useState<string>('');

  // Quick photo upload from phone/camera
  const [quickPhotoMenu, setQuickPhotoMenu] = useState<MenuItem | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<string | null>(null);
  const quickPhotoInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerQuickPhoto = (item: MenuItem) => {
    setQuickPhotoMenu(item);
    if (quickPhotoInputRef.current) {
      quickPhotoInputRef.current.value = '';
      quickPhotoInputRef.current.click();
    }
  };

  const handleQuickPhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickPhotoMenu) return;

    if (!file.type.startsWith('image/')) {
      onNotify('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
      return;
    }

    try {
      setIsUploadingPhoto(quickPhotoMenu.id);
      onNotify(`กำลังปรับขนาดและอัปโหลดรูปภาพ "${quickPhotoMenu.name}"...`, 'info');

      const compressed = await compressImageFile(file, {
        maxWidth: 640,
        maxHeight: 640,
        quality: 0.78,
        mimeType: 'image/jpeg',
      });

      await updateMenuItem(quickPhotoMenu.id, {
        imageUrl: compressed.dataUrl,
      });

      onNotify(`📸 อัปเดตรูปภาพเมนู "${quickPhotoMenu.name}" สำเร็จ เรียลไทม์ทันที`, 'success');
    } catch (err) {
      console.error('Quick photo upload failed:', err);
      onNotify('เกิดข้อผิดพลาดในการเปลี่ยนรูปภาพ', 'error');
    } finally {
      setIsUploadingPhoto(null);
      setQuickPhotoMenu(null);
    }
  };

  const [isReordering, setIsReordering] = useState(false);

  // Sort categories (สเต็ก -> สลัด -> ของทานเล่น -> เครื่องดื่ม)
  // and menus by category then price ascending (ราคาน้อยอยู่บน -> ราคาแพงอยู่ล่าง)
  const sortedCategories = sortCategories(categories);
  const sortedMenus = sortMenus(menus, sortedCategories);
  const autoSeededMockDrinks = sortedMenus.filter((m) => /^menu_drink_\d+$/.test(m.id));

  // Weekly Recommended Menus Calculation & Handlers
  const isManualRecommended = settings?.recommendedMenuMode === 'manual';

  const autoRecommendedMenus = React.useMemo(() => {
    const publishedAvail = sortedMenus.filter((m) => m.isPublished && m.isAvailable);
    if (publishedAvail.length === 0) return [];
    const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const validOrders = orders.filter((o) => !o.isCancelled && o.status !== 'ยกเลิก');
    const recentOrders = validOrders.filter((o) => {
      const t = o.createdAt ? new Date(o.createdAt).getTime() : 0;
      return !isNaN(t) && t >= sevenDaysAgoMs;
    });
    const sourceOrders = recentOrders.length > 0 ? recentOrders : validOrders;
    const qtyByMenuId: Record<string, number> = {};
    const qtyByName: Record<string, number> = {};
    for (const ord of sourceOrders) {
      if (!Array.isArray(ord.items)) continue;
      for (const it of ord.items) {
        const q = Number(it.quantity) || 1;
        if (it.menuId) qtyByMenuId[it.menuId] = (qtyByMenuId[it.menuId] || 0) + q;
        if (it.name) qtyByName[it.name] = (qtyByName[it.name] || 0) + q;
      }
    }
    const getSold = (m: MenuItem) => (qtyByMenuId[m.id] || 0) + (qtyByName[m.name] || 0);
    const bestSellers = [...publishedAvail].filter((m) => getSold(m) > 0).sort((a, b) => getSold(b) - getSold(a));
    const newest = [...publishedAvail].sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB !== tA ? tB - tA : b.id.localeCompare(a.id);
    });
    const out: MenuItem[] = [];
    const seen = new Set<string>();
    const maxSlots = Math.min(6, publishedAvail.length);
    let bIdx = 0;
    let nIdx = 0;
    let turn: 'b' | 'n' = bestSellers.length > 0 ? 'b' : 'n';
    for (let i = 0; i < publishedAvail.length * 3 && out.length < maxSlots; i++) {
      if (turn === 'b') {
        while (bIdx < bestSellers.length && seen.has(bestSellers[bIdx].id)) bIdx++;
        if (bIdx < bestSellers.length) {
          seen.add(bestSellers[bIdx].id);
          out.push(bestSellers[bIdx++]);
        }
        turn = 'n';
      } else {
        while (nIdx < newest.length && seen.has(newest[nIdx].id)) nIdx++;
        if (nIdx < newest.length) {
          seen.add(newest[nIdx].id);
          out.push(newest[nIdx++]);
        }
        turn = bestSellers.length > 0 ? 'b' : 'n';
      }
    }
    return out;
  }, [sortedMenus, orders]);

  const activeRecommendedMenus = React.useMemo(() => {
    if (isManualRecommended) {
      const byId = new Map(sortedMenus.map((m) => [m.id, m]));
      return (settings?.recommendedMenuIds || [])
        .map((id) => byId.get(id))
        .filter((m): m is MenuItem => Boolean(m));
    }
    return autoRecommendedMenus;
  }, [isManualRecommended, settings?.recommendedMenuIds, sortedMenus, autoRecommendedMenus]);

  const activeRecommendedIdSet = React.useMemo(
    () => new Set(activeRecommendedMenus.map((m) => m.id)),
    [activeRecommendedMenus]
  );

  const availableToRecommend = sortedMenus.filter((m) => !activeRecommendedIdSet.has(m.id));

  const saveRecommendedList = async (nextIds: string[], nextMode: 'manual' | 'auto' = 'manual') => {
    try {
      setIsSavingRecommended(true);
      await updateShopSettings({
        recommendedMenuMode: nextMode,
        recommendedMenuIds: nextIds,
      });
    } catch (err) {
      console.error('Update recommended menus error:', err);
      onNotify('ไม่สามารถบันทึกเมนูแนะนำประจำสัปดาห์ได้', 'error');
    } finally {
      setIsSavingRecommended(false);
    }
  };

  const handleAddRecommended = async (menuId: string) => {
    if (!menuId) return;
    const baseIds = isManualRecommended
      ? activeRecommendedMenus.map((m) => m.id)
      : activeRecommendedMenus.map((m) => m.id);
    if (baseIds.includes(menuId)) {
      onNotify('เมนูนี้อยู่ในรายการแนะนำอยู่แล้ว', 'info');
      return;
    }
    const menuName = menus.find((m) => m.id === menuId)?.name || 'เมนู';
    await saveRecommendedList([...baseIds, menuId], 'manual');
    setSelectedAddRecId('');
    onNotify(`⭐ เพิ่ม "${menuName}" เข้าเมนูแนะนำประจำสัปดาห์แล้ว`, 'success');
  };

  const handleRemoveRecommended = async (menuId: string) => {
    const baseIds = activeRecommendedMenus.map((m) => m.id);
    const nextIds = baseIds.filter((id) => id !== menuId);
    const menuName = menus.find((m) => m.id === menuId)?.name || 'เมนู';
    await saveRecommendedList(nextIds, 'manual');
    onNotify(`ลบ "${menuName}" ออกจากเมนูแนะนำประจำสัปดาห์แล้ว`, 'info');
  };

  const handleMoveRecommended = async (index: number, direction: 'up' | 'down') => {
    const ids = activeRecommendedMenus.map((m) => m.id);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= ids.length) return;
    const next = [...ids];
    [next[index], next[targetIdx]] = [next[targetIdx], next[index]];
    await saveRecommendedList(next, 'manual');
  };

  const handleResetAutoRecommended = async () => {
    await saveRecommendedList([], 'auto');
    onNotify('🔄 กลับไปใช้ระบบแนะนำเมนูขายดี/ใหม่ล่าสุดอัตโนมัติแล้ว', 'success');
  };

  const handleClearAllRecommended = async () => {
    await saveRecommendedList([], 'manual');
    onNotify('ซ่อน/ล้างรายการเมนูแนะนำประจำสัปดาห์แล้ว (สามารถเพิ่มใหม่ได้ทุกเมื่อ)', 'info');
  };

  const filteredMenus = sortedMenus.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCat = selectedCategory === 'ทั้งหมด' || m.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const handleAutoReorder = async () => {
    try {
      setIsReordering(true);
      await reorderMenusByCategoryAndPrice(sortedCategories);
      onNotify('⚡ จัดเรียงลำดับเมนู (อาหารราคาถูก->แพง และเครื่องดื่มไว้ด้านล่าง) ใน Firestore เรียบร้อยแล้ว', 'success');
    } catch (err) {
      console.error('Auto reorder error:', err);
      onNotify('เกิดข้อผิดพลาดในการจัดเรียงเมนู', 'error');
    } finally {
      setIsReordering(false);
    }
  };

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

  const handleCleanupAutoSeededDrinks = async () => {
    if (autoSeededMockDrinks.length === 0) return;
    try {
      setIsCleaningMockDrinks(true);
      const count = await cleanupLegacyAutoSeededMenus(autoSeededMockDrinks.map((m) => m.id));
      onNotify(
        `🧹 ลบเมนูเครื่องดื่มตัวอย่างที่ระบบเดิมสร้างอัตโนมัติออกแล้ว ${count} รายการ (เมนูของร้านยังอยู่ครบทั้งหมด)`,
        'success'
      );
    } catch (err) {
      console.error('Cleanup legacy drinks error:', err);
      onNotify('ไม่สามารถลบเมนูตัวอย่างอัตโนมัติได้', 'error');
    } finally {
      setIsCleaningMockDrinks(false);
    }
  };

  const handleConfirmResetToBaanSteakExact = async () => {
    try {
      setIsResetting(true);
      await initializeBaanSteakMenu(true);
      setIsResetConfirmOpen(false);
      onNotify('รีเซ็ตเป็นเมนูเริ่มต้นเรียบร้อยแล้ว', 'success');
    } catch (err) {
      onNotify('เกิดข้อผิดพลาดในการรีเซ็ต', 'error');
    } finally {
      setIsResetting(false);
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
      {/* Hidden native input for quick mobile photo uploads */}
      <input
        ref={quickPhotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleQuickPhotoFileChange}
      />

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
            onClick={handleAutoReorder}
            disabled={isReordering}
            className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
            title="จัดเรียงเมนูอัตโนมัติ: เมนูอาหารเรียงจากราคาถูกไปแพง และจัดเครื่องดื่มไว้ด้านล่าง"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-600 ${isReordering ? 'animate-spin' : ''}`} />
            <span>⚡ จัดเรียงลำดับเมนู (ถูก-&gt;แพง)</span>
          </button>

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>จัดการหมวดหมู่</span>
          </button>

          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            disabled={isResetting}
            className="px-3 py-2 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-600 border border-stone-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
            title="คำเตือน: รีเซ็ตล้างเมนูทั้งหมดกลับเป็นชุดเริ่มต้น"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>รีเซ็ตเมนูเริ่มต้น</span>
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

      {/* Alert Banner when legacy auto-injected mock drinks exist in Firestore */}
      {autoSeededMockDrinks.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <div className="font-extrabold text-amber-900">
                พบเมนูเครื่องดื่มตัวอย่าง {autoSeededMockDrinks.length} รายการ ที่ระบบเวอร์ชันเดิมสร้างอัตโนมัติ:
              </div>
              <div className="text-amber-800 mt-0.5">
                {autoSeededMockDrinks.map((d) => `"${d.name}"`).join(', ')} (เมนูที่ร้านเพิ่มเองจะไม่ถูกลบ)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCleanupAutoSeededDrinks}
            disabled={isCleaningMockDrinks}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
          >
            {isCleaningMockDrinks ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>ลบเมนูตัวอย่างอัตโนมัติออก ({autoSeededMockDrinks.length})</span>
          </button>
        </div>
      )}

      {/* Weekly Recommended Menus Manager (ร้านค้าเพิ่ม/ลบ/จัดลำดับได้เอง) */}
      <div className="bg-gradient-to-br from-amber-50/90 via-white to-rose-50/70 rounded-2xl border-2 border-amber-200/90 shadow-xs overflow-hidden">
        <div className="p-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsRecommendedExpanded(!isRecommendedExpanded)}
            className="flex items-center gap-2.5 text-left min-w-0 flex-1 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-stone-900">
                  ⭐ เมนูแนะนำประจำสัปดาห์ (แสดงหน้าลูกค้า)
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    isManualRecommended
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {isManualRecommended
                    ? `ร้านค้ากำหนดเอง (${activeRecommendedMenus.length} รายการ)`
                    : `เลือกอัตโนมัติ (${activeRecommendedMenus.length} รายการ)`}
                </span>
              </div>
              <p className="text-[11px] text-stone-600 mt-0.5">
                ทางร้านสามารถ เพิ่ม/ลบ หรือเลื่อนลำดับเมนูที่จะโชว์ในแถบสไลเดอร์หน้าแรกของลูกค้าได้เองทันที
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsRecommendedExpanded(!isRecommendedExpanded)}
            className="p-2 rounded-xl bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 shrink-0 cursor-pointer"
            aria-label="พับ/กางส่วนจัดการเมนูแนะนำ"
          >
            {isRecommendedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {isRecommendedExpanded && (
          <div className="px-4 pb-4 pt-1 border-t border-amber-200/60 space-y-3">
            {/* Add Menu Dropdown + Mode Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
              <div className="flex-1 flex items-center gap-2">
                <select
                  value={selectedAddRecId}
                  onChange={(e) => setSelectedAddRecId(e.target.value)}
                  disabled={isSavingRecommended || availableToRecommend.length === 0}
                  className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:border-red-500"
                >
                  <option value="">
                    {availableToRecommend.length > 0
                      ? '-- เลือกเมนูที่ต้องการเพิ่มเข้าเมนูแนะนำ --'
                      : 'เลือกครบทุกเมนูแล้ว'}
                  </option>
                  {availableToRecommend.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.price} บ. • {m.category})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedAddRecId || isSavingRecommended}
                  onClick={() => handleAddRecommended(selectedAddRecId)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition"
                >
                  {isSavingRecommended ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>เพิ่มแนะนำ</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isManualRecommended && (
                  <button
                    type="button"
                    disabled={isSavingRecommended}
                    onClick={handleResetAutoRecommended}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition"
                    title="ให้ระบบเลือกเมนูขายดี/ใหม่ล่าสุดให้อัตโนมัติ"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ใช้อัตโนมัติ</span>
                  </button>
                )}
                {activeRecommendedMenus.length > 0 && (
                  <button
                    type="button"
                    disabled={isSavingRecommended}
                    onClick={handleClearAllRecommended}
                    className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition"
                    title="ลบทุกรายการออกจากแถบเมนูแนะนำ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ล้างรายการ</span>
                  </button>
                )}
              </div>
            </div>

            {/* Active Recommended List */}
            {activeRecommendedMenus.length === 0 ? (
              <div className="bg-white/80 rounded-xl p-4 border border-dashed border-stone-300 text-center text-xs text-stone-500">
                ยังไม่มีรายการในแถบเมนูแนะนำ (แถบแนะนำบนหน้าลูกค้าจะถูกซ่อนอยู่จนกว่าจะเพิ่มเมนู หรือกด "ใช้อัตโนมัติ")
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeRecommendedMenus.map((rec, rIdx) => (
                  <div
                    key={`rec_mgr_${rec.id}`}
                    className="flex items-center justify-between gap-2 bg-white rounded-xl p-2 border border-amber-200 shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                        {rIdx + 1}
                      </span>
                      <img
                        src={normalizeMenuImageUrl(rec.imageUrl, rec.name)}
                        alt={rec.name}
                        className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = normalizeMenuImageUrl('', rec.name);
                        }}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-stone-900 truncate">{rec.name}</div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                          <span className="font-black text-red-600">{rec.price} บ.</span>
                          <span>• {rec.category}</span>
                          {!rec.isPublished && (
                            <span className="text-rose-600 font-bold">(ซ่อนอยู่)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={rIdx === 0 || isSavingRecommended}
                        onClick={() => handleMoveRecommended(rIdx, 'up')}
                        className="p-1 text-stone-400 hover:text-stone-800 disabled:opacity-25 rounded-lg hover:bg-stone-100 cursor-pointer"
                        title="เลื่อนขึ้น"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={rIdx === activeRecommendedMenus.length - 1 || isSavingRecommended}
                        onClick={() => handleMoveRecommended(rIdx, 'down')}
                        className="p-1 text-stone-400 hover:text-stone-800 disabled:opacity-25 rounded-lg hover:bg-stone-100 cursor-pointer"
                        title="เลื่อนลง"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isSavingRecommended}
                        onClick={() => handleRemoveRecommended(rec.id)}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        title="ลบออกจากเมนูแนะนำ"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>ลบ</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
          {sortedCategories.map((c) => (
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
            {menus.length === 0 && (
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="text-xs text-red-600 font-bold underline"
              >
                คลิกเพื่อนำเข้าเมนูเริ่มต้นของร้าน
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Cards View (Visible on phones & tablets) */}
            <div className="block md:hidden divide-y divide-stone-100">
              {filteredMenus.map((item, idx) => (
                <div key={item.id} className="p-4 space-y-3 bg-white">
                  <div className="flex items-start gap-3">
                    {/* Food Photo with Camera Icon */}
                    <div
                      onClick={() => handleTriggerQuickPhoto(item)}
                      title="แตะเพื่อเปลี่ยนรูปภาพเมนูนี้"
                      className="relative w-16 h-16 rounded-2xl bg-stone-100 overflow-hidden border border-stone-200 shrink-0 cursor-pointer shadow-xs active:scale-95 transition"
                    >
                      {isUploadingPhoto === item.id ? (
                        <div className="w-full h-full flex items-center justify-center bg-black/60 text-white">
                          <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <img
                            src={normalizeMenuImageUrl(item.imageUrl, item.name)}
                            alt={item.name}
                            className={`w-full h-full object-cover ${!item.isAvailable ? 'grayscale opacity-75' : ''}`}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = normalizeMenuImageUrl('', item.name);
                            }}
                          />
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center text-white opacity-80">
                            <Camera className="w-4 h-4" />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Food Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-extrabold text-sm text-stone-900 truncate">{item.name}</h4>
                        <span className="text-sm font-black text-red-600 shrink-0">{item.price} บาท</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-bold">
                          {item.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {item.isAvailable ? '🟢 พร้อมขาย' : '🔴 หมด'}
                        </span>
                        {/^menu_drink_\d+$/.test(item.id) && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            ตัวอย่างระบบเดิม
                          </span>
                        )}
                        <span className="text-[10px] text-stone-400">
                          {item.isPublished ? 'แสดงบนเว็บ' : 'ซ่อน'}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-stone-500 line-clamp-1 mt-1">{item.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Primary Edit Buttons for Mobile */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(item);
                        setIsFormOpen(true);
                      }}
                      className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-950 font-extrabold text-xs rounded-xl border-2 border-amber-300 shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                      <span>✏️ แก้ไขเมนู (ชื่อ/ราคา/รูป)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTriggerQuickPhoto(item)}
                      className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 font-bold text-xs rounded-xl border border-stone-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-stone-600" />
                      <span>📸 เปลี่ยนรูปภาพ</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleAvail(item)}
                      className={`flex-1 py-1.5 px-2 rounded-xl font-bold border transition ${
                        item.isAvailable
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-rose-50 text-rose-800 border-rose-300'
                      }`}
                    >
                      {item.isAvailable ? '🟢 พร้อมขาย (แตะเพื่อตั้งเป็นหมด)' : '🔴 หมด (แตะเพื่อตั้งเป็นพร้อมขาย)'}
                    </button>

                    <button
                      type="button"
                      disabled={isSavingRecommended}
                      onClick={() =>
                        activeRecommendedIdSet.has(item.id)
                          ? handleRemoveRecommended(item.id)
                          : handleAddRecommended(item.id)
                      }
                      className={`py-1.5 px-2.5 rounded-xl font-bold border flex items-center gap-1 transition cursor-pointer shrink-0 ${
                        activeRecommendedIdSet.has(item.id)
                          ? 'bg-amber-100 text-amber-900 border-amber-400'
                          : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-amber-50'
                      }`}
                      title={
                        activeRecommendedIdSet.has(item.id)
                          ? 'ลบออกจากเมนูแนะนำประจำสัปดาห์'
                          : 'เพิ่มเข้าเมนูแนะนำประจำสัปดาห์'
                      }
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          activeRecommendedIdSet.has(item.id)
                            ? 'fill-amber-500 text-amber-600'
                            : 'text-stone-400'
                        }`}
                      />
                      <span>{activeRecommendedIdSet.has(item.id) ? 'แนะนำแล้ว' : 'แนะนำ'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setItemToDelete(item)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-stone-200"
                      title="ลบเมนู"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
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
                          {/* Interactive Photo Thumbnail */}
                          <div
                            onClick={() => handleTriggerQuickPhoto(item)}
                            title="แตะเพื่อเปลี่ยนรูปภาพเมนูนี้จากโทรศัพท์ทันที"
                            className="relative w-12 h-12 rounded-xl bg-stone-100 overflow-hidden border border-stone-200 shrink-0 cursor-pointer group shadow-2xs hover:border-red-400 transition"
                          >
                            {isUploadingPhoto === item.id ? (
                              <div className="w-full h-full flex items-center justify-center bg-black/60 text-white">
                                <Loader2 className="w-5 h-5 animate-spin text-white" />
                              </div>
                            ) : item.imageUrl ? (
                              <>
                                <img
                                  src={normalizeMenuImageUrl(item.imageUrl, item.name)}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  className={`w-full h-full object-cover transition group-hover:scale-105 ${
                                    !item.isAvailable ? 'grayscale brightness-75' : ''
                                  }`}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    (e.currentTarget as HTMLImageElement).src = normalizeMenuImageUrl('', item.name);
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                  <Camera className="w-4 h-4" />
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 group-hover:text-red-600">
                                <Camera className="w-4 h-4" />
                                <span className="text-[8px] font-bold">ใส่รูป</span>
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="font-bold text-stone-900 text-sm truncate flex items-center gap-1.5">
                              <span>{item.name}</span>
                              {/^menu_drink_\d+$/.test(item.id) && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                  ตัวอย่างระบบเดิม
                                </span>
                              )}
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isSavingRecommended}
                            onClick={() =>
                              activeRecommendedIdSet.has(item.id)
                                ? handleRemoveRecommended(item.id)
                                : handleAddRecommended(item.id)
                            }
                            className={`px-2 py-1.5 rounded-xl font-bold border transition flex items-center gap-1 text-xs cursor-pointer ${
                              activeRecommendedIdSet.has(item.id)
                                ? 'bg-amber-100 text-amber-900 border-amber-400'
                                : 'bg-white text-stone-600 border-stone-200 hover:bg-amber-50'
                            }`}
                            title={
                              activeRecommendedIdSet.has(item.id)
                                ? 'ลบออกจากเมนูแนะนำประจำสัปดาห์'
                                : 'เพิ่มเข้าเมนูแนะนำประจำสัปดาห์'
                            }
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                activeRecommendedIdSet.has(item.id)
                                  ? 'fill-amber-500 text-amber-600'
                                  : 'text-stone-400'
                              }`}
                            />
                            <span>{activeRecommendedIdSet.has(item.id) ? 'แนะนำ' : '+แนะนำ'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setIsFormOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-950 font-bold border border-amber-300 rounded-xl transition flex items-center gap-1 text-xs cursor-pointer shadow-2xs"
                            title="แก้ไขชื่อเมนู, ราคา หรือเปลี่ยนรูปภาพ"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                            <span>แก้ไข</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTriggerQuickPhoto(item)}
                            className="p-1.5 text-stone-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="เปลี่ยนรูปภาพจากโทรศัพท์"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
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
          </>
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

      {/* Explicit Two-Step Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn text-stone-900">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-3 border-2 border-rose-300">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-extrabold text-base">คำเตือน: ล้างและรีเซ็ตเมนูทั้งหมด</h3>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              การกดปุ่มนี้จะ <strong className="text-rose-600">ลบรายการเมนูและราคาปัจจุบันทั้งหมด</strong> ที่ร้านแก้ไขไว้ แล้วแทนที่ด้วยเมนูเริ่มต้นจากเทมเพลต (สเต็กไก่ 59 บ., เกี๊ยวน้ำ, เกี๊ยวทอด ฯลฯ)
            </p>
            <p className="text-[11px] text-stone-500">
              หากไม่ต้องการล้างเมนูที่ร้านตั้งไว้ กรุณากด "ยกเลิก"
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmResetToBaanSteakExact}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                {isResetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>ยืนยันล้างและรีเซ็ต</span>
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
