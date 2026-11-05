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
  updateShopSettings,
} from './services/menuService';
import {
  Category,
  CustomerRecord,
  MenuItem,
  Order,
  ShopSettings,
  TableItem,
} from './types';

export function App() {
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    return window.location.pathname.startsWith('/admin');
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<'orders' | 'menu' | 'tables' | 'analytics' | 'customers' | 'settings' | 'export'>('orders');

  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SHOP_SETTINGS);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  // Audio & Incoming Order State
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);

  const previousPendingOrderIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  // Synchronize URL routing
  useEffect(() => {
    const handlePopState = () => {
      setIsAdminMode(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Subscriptions
  useEffect(() => {
    initializeBaanSteakMenu();
    const unsubMenus = subscribeMenus(setMenus);
    const unsubCats = subscribeCategories(setCategories);
    const unsubOrders = subscribeOrders(setOrders);
    const unsubCust = subscribeCustomers(setCustomers);
    const unsubSettings = subscribeShopSettings(setSettings);
    const unsubTables = subscribeTables(setTables);

    return () => {
      unsubMenus();
      unsubCats();
      unsubOrders();
      unsubCust();
      unsubSettings();
      unsubTables();
    };
  }, []);

  // Filter incoming pending orders
  const pendingOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'pending');
  }, [orders]);

  // Handle incoming order alerts
  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      if (orders.length > 0) {
        initialLoadDoneRef.current = true;
        previousPendingOrderIdsRef.current = new Set(pendingOrders.map((o) => o.id));
      }
      return;
    }

    const currentPendingIds = new Set(pendingOrders.map((o) => o.id));
    const newIncoming = pendingOrders.filter((o) => !previousPendingOrderIdsRef.current.has(o.id));

    if (newIncoming.length > 0) {
      setShowIncomingModal(true);
      setModalDismissed(false);
      audioAlert.updateRepeatingOrders(pendingOrders);
      if (!isSoundMuted) {
        audioAlert.startRepeatingOrderAlert(pendingOrders);
      }
    } else {
      audioAlert.updateRepeatingOrders(pendingOrders);
      if (pendingOrders.length === 0) {
        audioAlert.stopRepeatingOrderAlert();
        setShowIncomingModal(false);
      }
    }

    previousPendingOrderIdsRef.current = currentPendingIds;
  }, [pendingOrders, isSoundMuted]);

  const toggleAdmin = () => {
    if (!isAdminMode) {
      if (!isAuthenticated) {
        setIsLoginModalOpen(true);
      } else {
        setIsAdminMode(true);
        window.history.pushState({}, '', '/admin');
      }
    } else {
      setIsAdminMode(false);
      window.history.pushState({}, '', '/');
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl text-white text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 ${
            notification.type === 'success'
              ? 'bg-emerald-600'
              : notification.type === 'error'
              ? 'bg-red-600'
              : 'bg-stone-800'
          }`}
        >
          {notification.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
          {notification.type === 'error' && <AlertCircle className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Repeating Audio / Incoming Order Banner when Minimized */}
      {pendingOrders.length > 0 && !showIncomingModal && modalDismissed && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between text-xs font-bold sticky top-0 z-40 shadow-md">
          <div className="flex items-center gap-2 animate-pulse">
            <AlertCircle className="w-4 h-4 text-amber-300" />
            <span>มี {pendingOrders.length} ออเดอร์ค้างรับ! กำลังเตือนซ้ำต่อเนื่อง...</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowIncomingModal(true)}
              className="px-2.5 py-1 bg-white text-red-700 hover:bg-stone-100 rounded-lg text-xs font-black shadow-xs cursor-pointer"
            >
              เปิดหน้าต่างรับออเดอร์
            </button>
            <button
              onClick={() => {
                if (isSoundMuted) {
                  setIsSoundMuted(false);
                  audioAlert.startRepeatingOrderAlert(pendingOrders);
                } else {
                  setIsSoundMuted(true);
                  audioAlert.stopRepeatingOrderAlert();
                }
              }}
              className="p-1 rounded bg-red-700 hover:bg-red-800 cursor-pointer text-white"
              title={isSoundMuted ? 'เปิดเสียงเตือน' : 'ปิดเสียงเตือนชั่วคราว'}
            >
              {isSoundMuted ? <VolumeX className="w-4 h-4 text-amber-200" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Main Incoming Order Pop-up Modal */}
      <IncomingOrderModal
        isOpen={showIncomingModal && pendingOrders.length > 0}
        pendingOrders={pendingOrders}
        onClose={() => {
          setShowIncomingModal(false);
          setModalDismissed(true);
        }}
        onOrderAccepted={() => {
          if (pendingOrders.length <= 1) {
            setShowIncomingModal(false);
            audioAlert.stopRepeatingOrderAlert();
          }
        }}
        onAllAccepted={() => {
          setShowIncomingModal(false);
          audioAlert.stopRepeatingOrderAlert();
        }}
        onNotify={notify}
      />

      {/* Top Navbar */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-sm font-black text-lg">
              🥩
            </div>
            <div>
              <h1 className="font-extrabold text-stone-900 leading-tight text-base sm:text-lg">
                {SHOP_INFO.name}
              </h1>
              <p className="text-[11px] text-stone-500 font-medium hidden sm:block">
                ระบบจัดการร้านสเต็กออนไลน์ & สั่งอาหารผ่าน QR Code
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLinkModalOpen(true)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-stone-500" />
              <span className="hidden sm:inline">QR Code ร้าน</span>
            </button>

            <button
              onClick={toggleAdmin}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition ${
                isAdminMode
                  ? 'bg-stone-900 text-white hover:bg-stone-800'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isAdminMode ? (
                <>
                  <Store className="w-4 h-4" />
                  <span>ไปหน้าลูกค้า</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบแอดมิน</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main View Router */}
      <main className="flex-1 pb-16">
        {!isAdminMode ? (
          <CustomerWebsite
            menus={menus}
            categories={categories}
            settings={settings}
            tables={tables}
            onNotify={notify}
          />
        ) : (
          <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
            {/* Admin Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                onClick={() => setAdminTab('orders')}
                className={`px-4 py-2 rounded-2xl font-bold text-xs shrink-0 flex items-center gap-2 cursor-pointer transition ${
                  adminTab === 'orders'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>จัดการออเดอร์</span>
                {pendingOrders.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-white text-red-600 text-[10px] font-black flex items-center justify-center">
                    {pendingOrders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setAdminTab('menu')}
                className={`px-4 py-2 rounded-2xl font-bold text-xs shrink-0 flex items-center gap-2 cursor-pointer transition ${
                  adminTab === 'menu'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Utensils className="w-4 h-4" />
                <span>จัดการเมนูอาหาร</span>
              </button>

              <button
                onClick={() => setAdminTab('tables')}
                className={`px-4 py-2 rounded-2xl font-bold text-xs shrink-0 flex items-center gap-2 cursor-pointer transition ${
                  adminTab === 'tables'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>จัดการโต๊ะอาหาร</span>
              </button>

              <button
                onClick={() => setAdminTab('analytics')}
                className={`px-4 py-2 rounded-2xl font-bold text-xs shrink-0 flex items-center gap-2 cursor-pointer transition ${
                  adminTab === 'analytics'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>ยอดขาย & สถิติ</span>
              </button>

              <button
                onClick={() => setAdminTab('customers')}
                className={`px-4 py-2 rounded-2xl font-bold text-xs shrink-0 flex items-center gap-2 cursor-pointer transition ${
                  adminTab === 'customers'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>ประวัติลูกค้า</span>
              </button>

              <button
                onClick={() => setAdminTab('settings')}
                className={`px-4 py-2 rounded-2xl font-bold text-xs shrink-0 flex items-center gap-2 cursor-pointer transition ${
                  adminTab === 'settings'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>ตั้งค่าร้าน</span>
              </button>

              <button
                onClick={() => setAdminTab('export')}
                className={`px-4 py-2 rounded-2xl font-bold text-xs shrink-0 flex items-center gap-2 cursor-pointer transition ${
                  adminTab === 'export'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลด Source Code</span>
              </button>
            </div>

            {/* Tab Contents */}
            {adminTab === 'orders' && (
              <AdminOrdersManager orders={orders} onNotify={notify} />
            )}
            {adminTab === 'menu' && (
              <AdminMenuManager menus={menus} categories={categories} onNotify={notify} />
            )}
            {adminTab === 'tables' && (
              <AdminTableManager tables={tables} onNotify={notify} />
            )}
            {adminTab === 'analytics' && (
              <AdminSalesAnalytics orders={orders} />
            )}
            {adminTab === 'customers' && (
              <AdminCustomerHistory customers={customers} orders={orders} />
            )}
            {adminTab === 'settings' && (
              <AdminShopSettings
                settings={settings}
                onNotify={notify}
                onNavigateToExport={() => setAdminTab('export')}
              />
            )}
            {adminTab === 'export' && (
              <AdminSourceCodeExporter onNotify={notify} />
            )}
          </div>
        )}
      </main>

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          setIsAuthenticated(true);
          setIsAdminMode(true);
          window.history.pushState({}, '', '/admin');
          notify('เข้าสู่ระบบแอดมินสำเร็จ', 'success');
        }}
      />

      {/* Store Link & QR Code Modal */}
      <AdminLinkManagerModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
      />
    </div>
  );
}
