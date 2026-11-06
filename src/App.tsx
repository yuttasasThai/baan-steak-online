import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Download,
  Link2,
  Lock,
  LogOut,
  Package,
  QrCode,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Store,
  Users,
  Utensils,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AdminCustomerHistory } from './components/AdminCustomerHistory';
import { AdminLinkManagerModal } from './components/AdminLinkManagerModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminMenuManager } from './components/AdminMenuManager';
import { AdminOrdersManager } from './components/AdminOrdersManager';
import { AdminSalesAnalytics } from './components/AdminSalesAnalytics';
import { AdminShopSettings } from './components/AdminShopSettings';
import * as AdminSourceCodeExporterModule from './components/AdminSourceCodeExporter';
import { AdminTableManager } from './components/AdminTableManager';
import { CustomerWebsite } from './components/CustomerWebsite';

// Safe export resolution to prevent any Vercel MISSING_EXPORT build failure
const AdminSourceCodeExporter: React.FC<{ onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void }> =
  (AdminSourceCodeExporterModule as any).AdminSourceCodeExporter ||
  (AdminSourceCodeExporterModule as any).default ||
  (({ onNotify }) => (
    <div className="p-6 bg-amber-50 border-2 border-amber-300 rounded-3xl text-center space-y-2 text-amber-950">
      <p className="font-bold text-sm">⚠️ ยังไม่พบโมดูล AdminSourceCodeExporter</p>
      <p className="text-xs text-amber-800">กรุณาอัปเดตไฟล์ <code>src/components/AdminSourceCodeExporter.tsx</code> บน GitHub</p>
    </div>
  ));

import { IncomingOrderModal } from './components/IncomingOrderModal';
import { audioAlert } from './utils/audioAlert';
import {
  cancelOrder,
  DEFAULT_SHOP_SETTINGS,
  initializeBaanSteakMenu,
  SHOP_INFO,
  subscribeCategories,
  subscribeCustomers,
  subscribeMenus,
  subscribeOrders,
  subscribeShopSettings,
  subscribeTables,
  updateOrderStatus,
  updateShopSettings,
} from './services/menuService';
import { CategoryItem, CustomerRecord, MenuItem, Order, RestaurantTable, ShopSettings } from './types';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const checkIsAdminPath = (): boolean => {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname.toLowerCase();
  const h = window.location.hash.toLowerCase();
  const s = window.location.search.toLowerCase();
  return (
    p.startsWith('/admin') ||
    p.includes('admin') ||
    h.includes('admin') ||
    s.includes('admin')
  );
};

export function App() {
  const [currentView, setCurrentView] = useState<'customer' | 'admin'>(() =>
    checkIsAdminPath() ? 'admin' : 'customer'
  );
  const [adminTab, setAdminTab] = useState<
    'orders' | 'menus' | 'tables' | 'customers' | 'analytics' | 'settings' | 'export'
  >('orders');

  // Admin authentication state (checked synchronously from sessionStorage)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(sessionStorage.getItem('admin_session_token'));
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SHOP_SETTINGS);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showIncomingModal, setShowIncomingModal] = useState<boolean>(false);
  const [modalDismissed, setModalDismissed] = useState<boolean>(false);
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);

  const previousPendingOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(checkIsAdminPath() ? 'admin' : 'customer');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    initializeBaanSteakMenu().catch((err) =>
      console.warn('Init menu warning:', err)
    );

    const unsubMenus = subscribeMenus(setMenus);
    const unsubCategories = subscribeCategories(setCategories);
    const unsubOrders = subscribeOrders(setOrders);
    const unsubCustomers = subscribeCustomers(setCustomers);
    const unsubSettings = subscribeShopSettings(setSettings);
    const unsubTables = subscribeTables(setTables);

    return () => {
      unsubMenus();
      unsubCategories();
      unsubOrders();
      unsubCustomers();
      unsubSettings();
      unsubTables();
    };
  }, []);

  const pendingOrders = useMemo(() => {
    return orders.filter(
      (o) => !o.isCancelled && !o.isArchived && o.status === 'รับออเดอร์'
    );
  }, [orders]);

  useEffect(() => {
    if (isInitialLoadRef.current) {
      if (orders.length > 0) {
        previousPendingOrderIdsRef.current = new Set(pendingOrders.map((o) => o.id));
        isInitialLoadRef.current = false;
      }
      return;
    }

    const currentPendingIds = new Set(pendingOrders.map((o) => o.id));
    const newArrivals = pendingOrders.filter(
      (o) => !previousPendingOrderIdsRef.current.has(o.id)
    );

    if (newArrivals.length > 0) {
      setShowIncomingModal(true);
      setModalDismissed(false);

      if (!isMuted) {
        audioAlert.startRepeatingOrderAlert(pendingOrders);
      }
    } else {
      if (pendingOrders.length === 0) {
        audioAlert.stopRepeatingOrderAlert();
        setShowIncomingModal(false);
      } else {
        audioAlert.updateRepeatingOrders(pendingOrders);
      }
    }

    previousPendingOrderIdsRef.current = currentPendingIds;
  }, [pendingOrders, isMuted]);

  const handleAcceptSingleOrder = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'กำลังทำ');
      notify('✅ รับออเดอร์แล้ว! เปลี่ยนสถานะเป็น "กำลังทำ"', 'success');

      const remaining = pendingOrders.filter((o) => o.id !== orderId);
      if (remaining.length === 0) {
        setShowIncomingModal(false);
        audioAlert.stopRepeatingOrderAlert();
      } else {
        audioAlert.updateRepeatingOrders(remaining);
      }
    } catch {
      notify('ไม่สามารถเปลี่ยนสถานะออเดอร์ได้ กรุณาลองใหม่', 'error');
    }
  };

  const handleAcceptAllIncoming = async () => {
    try {
      for (const ord of pendingOrders) {
        await updateOrderStatus(ord.id, 'กำลังทำ');
      }
      notify(`✅ รับออเดอร์ทั้งหมด (${pendingOrders.length} รายการ) เรียบร้อยแล้ว`, 'success');
      setShowIncomingModal(false);
      audioAlert.stopRepeatingOrderAlert();
    } catch {
      notify('เกิดข้อผิดพลาดในการรับออเดอร์ทั้งหมด', 'error');
    }
  };

  const handleToggleSound = () => {
    if (isMuted) {
      setIsMuted(false);
      if (pendingOrders.length > 0) {
        audioAlert.startRepeatingOrderAlert(pendingOrders);
      }
      notify('🔊 เปิดเสียงแจ้งเตือนออเดอร์เข้าเรียบร้อย', 'info');
    } else {
      setIsMuted(true);
      audioAlert.stopRepeatingOrderAlert();
      notify('🔇 ปิดเสียงแจ้งเตือนออเดอร์ชั่วคราว', 'info');
    }
  };

  const navigateToAdmin = () => {
    if (!isAdminLoggedIn) {
      setIsLoginModalOpen(true);
    } else {
      setCurrentView('admin');
      window.history.pushState({}, '', '/admin');
    }
  };

  const navigateToCustomer = () => {
    setCurrentView('customer');
    window.history.pushState({}, '', '/');
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('admin_session_token');
    setIsAdminLoggedIn(false);
    setCurrentView('customer');
    window.history.pushState({}, '', '/');
    audioAlert.stopRepeatingOrderAlert();
    notify('ออกจากระบบแอดมินเรียบร้อยแล้ว', 'info');
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-900 selection:bg-red-500 selection:text-white">
      {pendingOrders.length > 0 && !showIncomingModal && modalDismissed && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white px-4 py-2.5 shadow-lg flex items-center justify-between sticky top-0 z-50 animate-pulse">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-300 animate-ping" />
            <span>มี {pendingOrders.length} ออเดอร์ใหม่ค้างรับ! กำลังเตือนซ้ำต่อเนื่อง...</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowIncomingModal(true)}
              className="px-3 py-1 bg-white text-red-700 hover:bg-stone-100 rounded-xl text-xs font-black shadow-xs cursor-pointer active:scale-95 transition"
            >
              เปิดหน้าต่างรับออเดอร์
            </button>
            <button
              onClick={handleToggleSound}
              className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-amber-200" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      <IncomingOrderModal
        isOpen={showIncomingModal && pendingOrders.length > 0}
        incomingOrders={pendingOrders}
        onAcceptOrder={handleAcceptSingleOrder}
        onAcceptAll={handleAcceptAllIncoming}
        onClose={() => {
          setShowIncomingModal(false);
          setModalDismissed(true);
        }}
        isMuted={isMuted}
        onToggleMute={handleToggleSound}
      />

      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            onClick={navigateToCustomer}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-md shadow-red-500/20 group-hover:scale-105 transition">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-stone-900 text-base sm:text-lg tracking-tight">
                  {SHOP_INFO.name}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 hidden sm:inline-block">
                  สาขาหลัก
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium -mt-0.5">
                สเต็กพรีเมียม สด ใหม่ จัดส่งรวดเร็ว
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                isMuted
                  ? 'bg-stone-100 text-stone-400 border-stone-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
              title={isMuted ? 'เปิดเสียงเตือนออเดอร์' : 'ปิดเสียงเตือนชั่วคราว'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-stone-400" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
              <span className="hidden md:inline">{isMuted ? 'ปิดเสียง' : 'เสียงเปิด'}</span>
            </button>

            {currentView === 'customer' ? (
              <button
                type="button"
                onClick={navigateToAdmin}
                className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>แอดมิน</span>
                {pendingOrders.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center animate-bounce">
                    {pendingOrders.length}
                  </span>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={navigateToCustomer}
                  className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>ดูหน้าเว็บลูกค้า</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinkModal(true)}
                  className="p-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition cursor-pointer"
                  title="ลิงก์ร้าน & QR Code"
                >
                  <QrCode className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition cursor-pointer"
                  title="ออกจากระบบแอดมิน"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {currentView === 'customer' ? (
          <CustomerWebsite
            menus={menus}
            categories={categories}
            tables={tables}
            settings={settings}
            onNotify={notify}
          />
        ) : (
          <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs font-bold">
              <button
                type="button"
                onClick={() => setAdminTab('orders')}
                className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 transition cursor-pointer ${
                  adminTab === 'orders'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                    : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>จัดการออเดอร์</span>
                {pendingOrders.length > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      adminTab === 'orders' ? 'bg-white text-red-600' : 'bg-red-600 text-white'
                    }`}
                  >
                    {pendingOrders.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAdminTab('tables')}
                className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 transition cursor-pointer ${
                  adminTab === 'tables'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                    : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
                }`}
              >
                <Utensils className="w-4 h-4" />
                <span>จัดการโต๊ะอาหาร ({tables.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminTab('menus')}
                className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 transition cursor-pointer ${
                  adminTab === 'menus'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                    : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>รายการเมนู ({menus.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminTab('customers')}
                className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 transition cursor-pointer ${
                  adminTab === 'customers'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                    : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>ลูกค้า ({customers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminTab('analytics')}
                className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 transition cursor-pointer ${
                  adminTab === 'analytics'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                    : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>สถิติยอดขาย</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminTab('settings')}
                className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 transition cursor-pointer ${
                  adminTab === 'settings'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                    : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>ตั้งค่าร้าน</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminTab('export')}
                className={`px-4 py-2.5 rounded-2xl flex items-center gap-2 shrink-0 transition cursor-pointer ${
                  adminTab === 'export'
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                    : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดโค้ด</span>
              </button>
            </div>

            {adminTab === 'orders' && (
              <AdminOrdersManager orders={orders} onNotify={notify} />
            )}
            {adminTab === 'tables' && (
              <AdminTableManager tables={tables} onNotify={notify} />
            )}
            {adminTab === 'menus' && (
              <AdminMenuManager
                menus={menus}
                categories={categories}
const handleToggleStoreStatus = async () => {
    if (!isAdminLoggedIn) {
      handleOpenAdmin();
      return;
    }
    const next = settings.isOpen === false;
    await updateShopSettings({ isOpen: next });
    notify(
      next ? '🟢 เปิดร้านเรียบร้อย (ลูกค้าสั่งอาหารได้แล้ว)' : '🔴 ปิดร้านเรียบร้อย (ระบบงดรับออเดอร์ใหม่)',
      next ? 'success' : 'info'
    );
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-['Prompt',sans-serif]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-xs">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
          {/* Logo / Shop Name */}
          <div
            onClick={() => navigateToView('customer')}
            className="flex items-center gap-2 cursor-pointer shrink-0"
            title="กลับไปหน้าหลัก"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-xs">
              บ
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base leading-tight text-red-600">
                {SHOP_INFO.name}
              </div>
              <div className="text-[9px] sm:text-[10px] text-stone-500 font-medium">
                {SHOP_INFO.slogan} • อ.ชุมแพ
              </div>
            </div>
          </div>

          {/* Top Switcher: Customer vs Admin */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Store Status Quick Toggle (แสดงถาวรในแถบด้านบน) */}
            <button
              type="button"
              onClick={handleToggleStoreStatus}
              className={`px-2 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold border transition flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs ${
                settings.isOpen !== false
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
              }`}
              title="คลิกเพื่อสลับสถานะเปิด/ปิดร้าน (สำหรับร้านค้า)"
            >
              <span>{settings.isOpen !== false ? '🟢 ร้านเปิด' : '🔴 ร้านปิด'}</span>
            </button>

            {currentView === 'admin' ? (
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setLinkModalInitialTab('user');
                    setIsLinkModalOpen(true);
                  }}
                  className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] sm:text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                  title="เปิดตัวสร้างลิงก์สำหรับ Admin และ ลิงก์สำหรับลูกค้า (User Link)"
                >
                  <Link2 className="w-3.5 h-3.5 text-red-600" />
                  <span className="hidden md:inline">สร้างลิงก์ Admin / User</span>
                  <span className="md:hidden">ลิงก์</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigateToView('customer')}
                  className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] sm:text-xs font-bold transition cursor-pointer shrink-0"
                >
                  <span className="hidden sm:inline">ดูหน้าเว็บลูกค้า</span>
                  <span className="sm:hidden">หน้าเว็บ</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1 sm:p-1.5 rounded-xl text-stone-400 hover:text-red-600 hover:bg-stone-100 cursor-pointer shrink-0"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : isAdminLoggedIn ? (
              <button
                type="button"
                onClick={() => navigateToView('admin')}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 bg-stone-900 text-white hover:bg-stone-800 text-[11px] sm:text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
                title="กลับหน้าระบบ Admin"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>แอดมิน</span>
                {pendingOrdersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {pendingOrdersCount}
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenAdmin}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] sm:text-xs font-bold rounded-xl transition cursor-pointer border border-stone-200 shadow-2xs shrink-0"
                title="เข้าสู่ระบบ Admin สำหรับร้านค้า"
              >
                <Lock className="w-3.5 h-3.5 text-stone-600" />
                <span>Admin</span>
              </button>
            )}
          </div>
        </div>
      </header>
            )}
          </div>
        )}
      </main>

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          const hasToken = typeof window !== 'undefined' && Boolean(sessionStorage.getItem('admin_session_token'));
          if (!hasToken && checkIsAdminPath()) {
            navigateToCustomer();
          }
        }}
        onLoginSuccess={() => {
          setIsAdminLoggedIn(true);
          setIsLoginModalOpen(false);
          setCurrentView('admin');
          window.history.pushState({}, '', '/admin');
          notify('เข้าสู่ระบบ Admin สำเร็จ', 'success');
        }}
      />

      <AdminLinkManagerModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onNotify={notify}
      />

      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl flex items-start gap-2.5 text-xs font-bold border transition-all animate-in fade-in slide-in-from-bottom-2 ${
              toast.type === 'error'
                ? 'bg-red-600 text-white border-red-700'
                : toast.type === 'info'
                ? 'bg-stone-800 text-white border-stone-900'
                : 'bg-emerald-600 text-white border-emerald-700'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-snug">{toast.message}</div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-white/80 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
