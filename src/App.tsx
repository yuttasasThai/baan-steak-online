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
import { AdminSourceCodeExporter } from './components/AdminSourceCodeExporter';
import { AdminTableManager } from './components/AdminTableManager';
import { CustomerWebsite } from './components/CustomerWebsite';
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

// Helper to determine if current URL is targeting admin view (/admin, #admin, ?admin)
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

export default function App() {
  // Main view: 'customer' or 'admin' initialized from URL
  const [currentView, setCurrentView] = useState<'customer' | 'admin'>(() =>
    checkIsAdminPath() ? 'admin' : 'customer'
  );
  const [adminTab, setAdminTab] = useState<
    'orders' | 'menus' | 'tables' | 'customers' | 'analytics' | 'settings' | 'export'
  >('orders');

  // Admin authentication state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Link & QR Generator Modal state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkModalInitialTab, setLinkModalInitialTab] = useState<'admin' | 'user'>('user');

  // Firestore real-time state
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SHOP_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Toast notification system
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  // Real-time Firestore Subscriptions & Auto-initialization
  useEffect(() => {
    let isMounted = true;

    // 1. Ensure Firestore has the exact 5 items for "บ้าน สเต็กออนไลน์"
    initializeBaanSteakMenu(false).catch((err) => {
      console.warn('Initialization error:', err);
    });

    // 2. Subscribe to menus
    const unsubMenus = subscribeMenus(
      (items) => {
        if (!isMounted) return;
        setMenus(items);
        setIsLoading(false);
      },
      (error) => {
        console.error('Menus error:', error);
        setIsLoading(false);
      }
    );

    // 3. Subscribe to categories
    const unsubCategories = subscribeCategories(
      (items) => {
        if (!isMounted) return;
        setCategories(items);
      },
      (error) => {
        console.error('Categories error:', error);
      }
    );

    // 4. Subscribe to orders
    const unsubOrders = subscribeOrders(
      (items) => {
        if (!isMounted) return;
        setOrders(items);
      },
      (error) => {
        console.error('Orders error:', error);
      }
    );

    // 5. Subscribe to customers
    const unsubCustomers = subscribeCustomers(
      (items) => {
        if (!isMounted) return;
        setCustomers(items);
      },
      (error) => {
        console.error('Customers error:', error);
      }
    );

    // 6. Subscribe to Shop Settings
    const unsubSettings = subscribeShopSettings((s) => {
      if (!isMounted) return;
      setSettings(s);
    });

    // 7. Subscribe to Restaurant Tables (โต๊ะอาหาร ทานที่ร้าน)
    const unsubTables = subscribeTables((tblList) => {
      if (!isMounted) return;
      setTables(tblList);
    });

    return () => {
      isMounted = false;
      unsubMenus();
      unsubCategories();
      unsubOrders();
      unsubCustomers();
      unsubSettings();
      unsubTables();
    };
  }, []);

  // 8. Pending Incoming Orders (status === 'รับออเดอร์', not cancelled, not archived)
  const pendingIncomingOrders = useMemo(() => {
    return orders
      .filter(
        (o) => (o.status === 'รับออเดอร์' || !o.status) && !o.isCancelled && !o.isArchived
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  // Incoming Order Modal & Repeating Audio Loop States
  const [isIncomingModalOpen, setIsIncomingModalOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => audioAlert.isEnabled());
  const prevPendingCountRef = useRef<number | null>(null);

  // Global repeating audio alert loop & auto-popup modal for incoming orders
  useEffect(() => {
    // Only alert when in Admin view
    if (currentView !== 'admin') {
      audioAlert.stopRepeatingOrderAlert();
      return;
    }

    if (pendingIncomingOrders.length > 0) {
      // Auto pop up modal when new orders arrive or on first mount in admin view with pending orders
      if (
        prevPendingCountRef.current === null ||
        pendingIncomingOrders.length > prevPendingCountRef.current
      ) {
        setIsIncomingModalOpen(true);
      }

      // Start/update repeating voice audio loop until accepted
      audioAlert.updateRepeatingOrders(
        pendingIncomingOrders.map((o) => ({
          tableNumber: o.tableNumber,
          deliveryType: o.deliveryType,
          orderNumber: o.orderNumber,
        }))
      );
    } else {
      // All pending orders accepted: stop looping audio and close modal
      audioAlert.stopRepeatingOrderAlert();
      setIsIncomingModalOpen(false);
    }

    prevPendingCountRef.current = pendingIncomingOrders.length;
  }, [pendingIncomingOrders, currentView]);

  const handleToggleSound = () => {
    const next = !isSoundEnabled;
    setIsSoundEnabled(next);
    audioAlert.setEnabled(next);
    if (!next) {
      audioAlert.stopRepeatingOrderAlert();
      notify('ปิดเสียงเตือนชั่วคราวแล้ว', 'info');
    } else {
      notify('เปิดเสียงเตือน "มีออเดอร์เข้า" แล้ว', 'info');
      if (pendingIncomingOrders.length > 0 && currentView === 'admin') {
        audioAlert.startRepeatingOrderAlert(
          pendingIncomingOrders.map((o) => ({
            tableNumber: o.tableNumber,
            deliveryType: o.deliveryType,
            orderNumber: o.orderNumber,
          }))
        );
      }
    }
  };

  const handleAcceptOrder = async (order: Order) => {
    try {
      await updateOrderStatus(order, 'กำลังทำ');
      notify(
        `✅ รับออเดอร์ #${order.orderNumber} เรียบร้อยแล้ว (สถานะเปลี่ยนเป็น: กำลังทำ)`,
        'success'
      );
    } catch (err) {
      console.error('Accept order error:', err);
      notify('ไม่สามารถเปลี่ยนสถานะออเดอร์ได้', 'error');
    }
  };

  const handleAcceptAllOrders = async () => {
    try {
      for (const ord of pendingIncomingOrders) {
        await updateOrderStatus(ord, 'กำลังทำ');
      }
      notify(
        `✅ รับออเดอร์ทั้งหมด ${pendingIncomingOrders.length} รายการเรียบร้อยแล้ว`,
        'success'
      );
      setIsIncomingModalOpen(false);
    } catch (err) {
      console.error('Accept all orders error:', err);
      notify('เกิดข้อผิดพลาดในการรับออเดอร์ทั้งหมด', 'error');
    }
  };

  const handleCancelOrder = async (order: Order, reason?: string) => {
    try {
      await cancelOrder(order, reason || 'ร้านไม่สะดวกรับ');
      notify(`ยกเลิกออเดอร์ #${order.orderNumber} เรียบร้อย`, 'info');
    } catch (err) {
      console.error('Cancel order error:', err);
      notify('ไม่สามารถยกเลิกออเดอร์ได้', 'error');
    }
  };

  // Check existing admin session on mount
  useEffect(() => {
    const token = sessionStorage.getItem('admin_session_token');
    if (token) {
      if (token.startsWith('vcl_sess_')) {
        setIsAdminLoggedIn(true);
      } else {
        fetch('/api/admin/verify', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.valid) {
              setIsAdminLoggedIn(true);
            } else {
              sessionStorage.removeItem('admin_session_token');
              setIsAdminLoggedIn(false);
            }
          })
          .catch(() => {
            // If offline or static host, keep session if valid
            setIsAdminLoggedIn(true);
          });
      }
    }
  }, []);

  // View navigation helper that updates browser URL
  const navigateToView = (view: 'customer' | 'admin') => {
    setCurrentView(view);
    try {
      if (typeof window !== 'undefined') {
        if (view === 'admin') {
          if (!window.location.pathname.startsWith('/admin')) {
            window.history.pushState(null, '', '/admin');
          }
        } else {
          if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/customer')) {
            window.history.pushState(null, '', '/');
          }
        }
      }
    } catch {
      // fallback
    }
  };

  // Sync URL when browser back/forward or hash changes
  useEffect(() => {
    const handleUrlChange = () => {
      const onAdmin = checkIsAdminPath();
      if (onAdmin) {
        setCurrentView('admin');
        const token = sessionStorage.getItem('admin_session_token');
        if (!token) {
          setIsLoginModalOpen(true);
        }
      } else {
        setCurrentView('customer');
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    // Initial check on mount: if on admin URL and not logged in, prompt login modal
    if (checkIsAdminPath()) {
      const token = sessionStorage.getItem('admin_session_token');
      if (!token) {
        setIsLoginModalOpen(true);
      }
    }

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const handleLogout = async () => {
    const token = sessionStorage.getItem('admin_session_token');
    if (token) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    sessionStorage.removeItem('admin_session_token');
    setIsAdminLoggedIn(false);
    navigateToView('customer');
    notify('ออกจากระบบ Admin เรียบร้อย', 'info');
  };

  const handleOpenAdmin = () => {
    if (isAdminLoggedIn) {
      navigateToView('admin');
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const pendingOrdersCount = orders.filter((o) => o.status === 'รับออเดอร์').length;

  const totalUniqueCustomersCount = useMemo(() => {
    const phones = new Set<string>();
    customers.forEach((c) => {
      const clean = c.phone?.replace(/[^0-9]/g, '');
      if (clean) phones.add(clean);
    });
    orders.forEach((o) => {
      const clean = o.customerPhone?.replace(/[^0-9]/g, '');
      if (clean) phones.add(clean);
    });
    return Math.max(phones.size, customers.length);
  }, [customers, orders]);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-['Prompt',sans-serif]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Logo / Shop Name */}
          <div
            onClick={() => navigateToView('customer')}
            className="flex items-center gap-2 cursor-pointer"
            title="กลับไปหน้าหลัก"
          >
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-lg shadow-xs">
              บ
            </div>
            <div>
              <div className="font-extrabold text-base leading-tight text-red-600">
                {SHOP_INFO.name}
              </div>
              <div className="text-[10px] text-stone-500 font-medium">
                {SHOP_INFO.slogan} • อ.ชุมแพ
              </div>
            </div>
          </div>

          {/* Top Switcher: Customer vs Admin */}
          <div className="flex items-center gap-2">
            {currentView === 'admin' ? (
              <div className="flex items-center gap-2">
                {/* Store Status Quick Toggle */}
                <button
                  onClick={async () => {
                    const next = settings.isOpen === false;
                    await updateShopSettings({ isOpen: next });
                    notify(
                      next ? '🟢 เปิดร้านเรียบร้อย' : '🔴 ปิดร้านเรียบร้อย',
                      next ? 'success' : 'info'
                    );
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                    settings.isOpen !== false
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                  }`}
                  title="คลิกเพื่อสลับสถานะเปิด/ปิดร้าน"
                >
                  <span>{settings.isOpen !== false ? '🟢 ร้านเปิด' : '🔴 ร้านปิด'}</span>
                </button>

                <button
                  onClick={() => {
                    setLinkModalInitialTab('user');
                    setIsLinkModalOpen(true);
                  }}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  title="เปิดตัวสร้างลิงก์สำหรับ Admin และ ลิงก์สำหรับลูกค้า (User Link)"
                >
                  <Link2 className="w-3.5 h-3.5 text-red-600" />
                  <span className="hidden sm:inline">สร้างลิงก์ Admin / User</span>
                  <span className="sm:hidden">สร้างลิงก์</span>
                </button>

                <button
                  onClick={() => navigateToView('customer')}
                  className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition cursor-pointer"
                >
                  ดูหน้าเว็บลูกค้า
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-red-600 hover:bg-stone-100 cursor-pointer"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : isAdminLoggedIn ? (
              // If admin is already logged in and previewing customer view
              <button
                onClick={() => navigateToView('admin')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white hover:bg-stone-800 text-xs font-bold rounded-xl transition cursor-pointer"
                title="กลับหน้าระบบ Admin"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>กลับหน้า Admin</span>
                {pendingOrdersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {pendingOrdersCount}
                  </span>
                )}
              </button>
            ) : (
              // When on customer view and not logged in: display Admin button
              <button
                onClick={handleOpenAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer border border-stone-200 shadow-2xs"
                title="เข้าสู่ระบบ Admin สำหรับร้านค้า"
              >
                <Lock className="w-3.5 h-3.5 text-stone-600" />
                <span>Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Secondary Subnav for Admin Tabs */}
        {currentView === 'admin' && (
          <div className="bg-stone-50 border-t border-stone-200">
            <div className="max-w-4xl mx-auto px-4 flex items-center gap-2 py-2 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setAdminTab('orders')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  adminTab === 'orders'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>รายการออเดอร์</span>
                {orders.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                    {orders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setAdminTab('menus')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  adminTab === 'menus'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>จัดการรายการอาหาร</span>
                <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                  {menus.length}
                </span>
              </button>

              <button
                onClick={() => setAdminTab('tables')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  adminTab === 'tables'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
                title="จัดการจำนวนโต๊ะ และสถานะโต๊ะว่าง/เต็ม สำหรับลูกค้าทานที่ร้าน"
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>โต๊ะอาหาร (ทานที่ร้าน)</span>
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    tables.length > 0 && tables.every((t) => t.isOccupied)
                      ? 'bg-rose-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {tables.filter((t) => !t.isOccupied).length}/{tables.length} ว่าง
                </span>
              </button>

              <button
                onClick={() => setAdminTab('customers')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  adminTab === 'customers'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>ประวัติลูกค้า</span>
                <span className="ml-1 px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                  {totalUniqueCustomersCount}
                </span>
              </button>

              <button
                onClick={() => setAdminTab('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  adminTab === 'analytics'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>วิเคราะห์ยอดขาย</span>
              </button>

              <button
                onClick={() => setAdminTab('settings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  adminTab === 'settings'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>ตั้งค่าร้าน & LINE OA</span>
              </button>

              <button
                onClick={() => {
                  setLinkModalInitialTab('user');
                  setIsLinkModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 cursor-pointer shadow-2xs"
                title="สร้างลิงก์สำหรับ Admin และ ลิงก์สำหรับลูกค้า"
              >
                <Link2 className="w-3.5 h-3.5 text-red-600" />
                <span>สร้างลิงก์ร้าน & QR</span>
              </button>

              <button
                onClick={() => setAdminTab('export')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  adminTab === 'export'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>ดาวน์โหลดโค้ด (GitHub/Vercel)</span>
                <span className="px-1.5 py-0.2 bg-amber-400 text-stone-900 rounded-full text-[9px] font-black">
                  Android
                </span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Sticky Alert Banner if modal is minimized and pending orders are waiting */}
      {currentView === 'admin' && pendingIncomingOrders.length > 0 && !isIncomingModalOpen && (
        <div className="sticky top-16 z-30 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-4 py-3 shadow-md border-b-2 border-amber-300 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">🚨</span>
            <div className="truncate">
              <span className="font-black text-sm">
                มี {pendingIncomingOrders.length} ออเดอร์เข้าค้างรับ!
              </span>
              <span className="ml-1.5 text-xs text-amber-200 font-bold hidden sm:inline">
                ({pendingIncomingOrders[0].tableNumber
                  ? `โต๊ะ ${pendingIncomingOrders[0].tableNumber}`
                  : pendingIncomingOrders[0].deliveryType || 'ออเดอร์ใหม่'})
                {isSoundEnabled ? ' • 🔊 กำลังเตือนซ้ำจนกว่าจะกดรับ' : ' • 🔇 ปิดเสียงอยู่'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleSound}
              className="px-2.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title={isSoundEnabled ? 'ปิดเสียงเตือนชั่วคราว' : 'เปิดเสียงเตือน'}
            >
              {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isSoundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsIncomingModalOpen(true)}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-black rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 ring-2 ring-white"
            >
              <span>👉 เปิดหน้าต่างรับออเดอร์</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4">
        {currentView === 'customer' ? (
          <CustomerWebsite
            menus={menus}
            categories={categories}
            settings={settings}
            tables={tables}
            onNotify={notify}
            onOpenAdminLogin={handleOpenAdmin}
            isAdmin={isAdminLoggedIn}
          />
        ) : (
          <div className="space-y-4">
            {adminTab === 'orders' && (
              <AdminOrdersManager orders={orders} onNotify={notify} />
            )}
            {adminTab === 'menus' && (
              <AdminMenuManager
                menus={menus}
                categories={categories}
                isLoading={isLoading}
                onNotify={notify}
              />
            )}
            {adminTab === 'tables' && (
              <AdminTableManager tables={tables} onNotify={notify} />
            )}
            {adminTab === 'customers' && (
              <AdminCustomerHistory
                customers={customers}
                orders={orders}
                onNotify={notify}
              />
            )}
            {adminTab === 'analytics' && (
              <AdminSalesAnalytics orders={orders} />
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
        onClose={() => {
          setIsLoginModalOpen(false);
          if (!isAdminLoggedIn && checkIsAdminPath()) {
            navigateToView('customer');
          }
        }}
        onLoginSuccess={() => {
          setIsAdminLoggedIn(true);
          navigateToView('admin');
          notify('เข้าสู่ระบบ Admin สำเร็จ', 'success');
        }}
      />

      {/* Admin & Customer Link / QR Generator Modal */}
      <AdminLinkManagerModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onNotify={notify}
        initialTab={linkModalInitialTab}
        categories={categories}
      />

      {/* 🚨 Incoming Orders Popup Modal (เด้งขึ้นมากลางจอเมื่อมีออเดอร์เข้า พร้อมเตือนซ้ำจนกว่าจะกดรับ) */}
      <IncomingOrderModal
        isOpen={isIncomingModalOpen && currentView === 'admin'}
        pendingOrders={pendingIncomingOrders}
        onAcceptOrder={handleAcceptOrder}
        onAcceptAllOrders={handleAcceptAllOrders}
        onCancelOrder={handleCancelOrder}
        onClose={() => setIsIncomingModalOpen(false)}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3.5 rounded-2xl shadow-xl border text-xs font-semibold animate-fadeIn ${
              toast.type === 'error'
                ? 'bg-rose-600 text-white border-rose-700'
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
