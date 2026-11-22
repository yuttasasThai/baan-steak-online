import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Ban,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Gift,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Printer,
  ShoppingBag,
  Store,
  Timer,
  Truck,
  Trash2,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react';
import { DiningType, MenuItem, Order, OrderStatus, RestaurantTable } from '../types';
import {
  adjustOrderPrepTime,
  cancelOrder,
  clearOrdersHistory,
  deleteOrder,
  extractOrderTableIdentifier,
  getOrderCompletionSummary,
  isOrderHoldingTable,
  NEXT_ORDER_STATUS_MAP,
  normalizeOrderStatus,
  updateOrderStatus,
  updateTableStatus,
} from '../services/menuService';
import { audioAlert } from '../utils/audioAlert';
import {
  DEFAULT_SHOP_PREP_MINUTES,
  getDailyKitchenSpeedStats,
  getOrderTimingMetrics,
  isOrderItemCancelled,
} from '../utils/orderPrepUtils';
import { OrderReceiptModal } from './OrderReceiptModal';
import { AdminCreateOrderModal } from './AdminCreateOrderModal';
import { AdminAppendItemModal } from './AdminAppendItemModal';
import { CircularStatusStepper, OrderCompletionBadge } from './CircularStatusStepper';
import { OrderStatusModal } from './OrderStatusModal';
import { CheckBillModal } from './CheckBillModal';
import { TableDetailModal } from './TableDetailModal';

interface AdminOrdersManagerProps {
  orders: Order[];
  menus?: MenuItem[];
  tables?: RestaurantTable[];
  defaultPrepTimeMinutes?: number;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ACTIVE_STATUS_FILTERS: Array<'ทั้งหมด' | 'รับออเดอร์' | 'กำลังทำ' | 'ส่งออเดอร์' | 'กำลังส่ง'> = [
  'ทั้งหมด',
  'รับออเดอร์',
  'กำลังทำ',
  'ส่งออเดอร์',
  'กำลังส่ง',
];

const STATUS_BADGE_STYLES: Record<
  OrderStatus,
  { bg: string; text: string; border: string; label: string }
> = {
  รับออเดอร์: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
    label: '🟡 รับออเดอร์',
  },
  กำลังทำ: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300',
    label: '🔵 กำลังทำ',
  },
  ส่งออเดอร์: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
    label: '🚚 ส่งออเดอร์',
  },
  กำลังส่ง: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
    label: '🚚 กำลังส่ง',
  },
  ส่งแล้ว: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    label: '🟢 ส่งแล้ว',
  },
  เช็คบิล: {
    bg: 'bg-teal-100',
    text: 'text-teal-900',
    border: 'border-teal-400',
    label: '💰 เช็คบิลแล้ว',
  },
  ยกเลิก: {
    bg: 'bg-rose-100',
    text: 'text-rose-800',
    border: 'border-rose-300',
    label: '❌ ยกเลิก',
  },
};

// Render Delivery / Dining Type Badge: มาเอง, สั่งกลับบ้าน, นำส่ง, นัดรับ
export function renderDeliveryTypeBadge(deliveryType?: DiningType, tableNumber?: number | string) {
  if (deliveryType === 'สั่งกลับบ้าน') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded-xl text-xs font-black whitespace-nowrap shadow-2xs">
        <ShoppingBag className="w-3.5 h-3.5 text-purple-700 shrink-0" />
        <span>🛍️ สั่งกลับบ้าน</span>
      </span>
    );
  }
  if (deliveryType === 'นัดรับอาหาร') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-stone-950 border-2 border-amber-600 rounded-xl text-xs font-black shadow-md ring-2 ring-amber-300 whitespace-nowrap animate-pulse">
        <MapPin className="w-3.5 h-3.5 text-stone-950 shrink-0 fill-amber-700" />
        <span>📍 นัดรับ (นัดหมายร้าน)</span>
      </span>
    );
  }
  if (deliveryType === 'มาทานที่ร้าน') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black whitespace-nowrap shadow-2xs">
        <Store className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <span>{tableNumber ? `🍽️ ทานที่ร้าน (โต๊ะ ${tableNumber})` : '🍽️ มาเอง (ทานร้าน)'}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-100 text-sky-900 border border-sky-300 rounded-xl text-xs font-black whitespace-nowrap shadow-2xs">
      <Truck className="w-3.5 h-3.5 text-sky-700 shrink-0" />
      <span>🛵 นำส่ง (ส่งถึงบ้าน)</span>
    </span>
  );
}

// Format Date: e.g. "8 ต.ค. 2026"
export function formatOrderDate(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    const day = d.getDate();
    const thaiMonths = [
      'ม.ค.',
      'ก.พ.',
      'มี.ค.',
      'เม.ย.',
      'พ.ค.',
      'มิ.ย.',
      'ก.ค.',
      'ส.ค.',
      'ก.ย.',
      'ต.ค.',
      'พ.ย.',
      'ธ.ค.',
    ];
    const month = thaiMonths[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return '-';
  }
}

// Format Time: e.g. "22:08 น."
export function formatOrderTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} น.`;
  } catch {
    return '-';
  }
}

// Combined Date & Time format helper
export function formatOrderDateTime(isoString?: string): string {
  if (!isoString) return '-';
  return `${formatOrderDate(isoString)} ${formatOrderTime(isoString)}`;
}

export type OrderDateRangeFilter = 'all' | 'today' | 'yesterday' | '7days';

export function isOrderInDateRange(
  isoString: string | undefined,
  range: OrderDateRangeFilter
): boolean {
  if (range === 'all') return true;
  if (!isoString) return false;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return false;

  const now = new Date();
  const orderDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  const sevenDaysStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();

  if (range === 'today') return orderDayStart === todayStart;
  if (range === 'yesterday') return orderDayStart === yesterdayStart;
  if (range === '7days') return orderDayStart >= sevenDaysStart && orderDayStart <= todayStart;
  return true;
}

const DATE_RANGE_OPTIONS: Array<{
  id: OrderDateRangeFilter;
  label: string;
  shortDesc: string;
}> = [
  { id: 'all', label: 'ทั้งหมด', shortDesc: 'ทุกวัน' },
  { id: 'today', label: 'วันนี้', shortDesc: 'เฉพาะวันนี้' },
  { id: 'yesterday', label: 'เมื่อวาน', shortDesc: 'เมื่อวานนี้' },
  { id: '7days', label: '7 วันล่าสุด', shortDesc: 'ย้อนหลัง 7 วัน' },
];

export const AdminOrdersManager: React.FC<AdminOrdersManagerProps> = ({
  orders,
  menus = [],
  tables = [],
  defaultPrepTimeMinutes = DEFAULT_SHOP_PREP_MINUTES,
  onNotify,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<
    'ทั้งหมด' | 'รับออเดอร์' | 'กำลังทำ' | 'ส่งออเดอร์' | 'กำลังส่ง'
  >('ทั้งหมด');
  const [viewTab, setViewTab] = useState<'active' | 'archived' | 'checkedout' | 'cancelled'>('active');
  const [dateRange, setDateRange] = useState<OrderDateRangeFilter>('all');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('ลูกค้ายกเลิก / ร้านพิจารณาไม่รับ');
  const [isCancelling, setIsCancelling] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // New order modal & append order modal states
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [createOrderPresetTable, setCreateOrderPresetTable] = useState<string | undefined>(undefined);
  const [orderToAppend, setOrderToAppend] = useState<Order | null>(null);

  // Dedicated Popups: Circular Status Popup, Check-Bill Summary Popup, Real-time Table Popup
  const [statusModalOrderId, setStatusModalOrderId] = useState<string | null>(null);
  const [checkBillOrderId, setCheckBillOrderId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Audio alert state (global audio alert is managed in App.tsx)
  const [isAudioEnabled, setIsAudioEnabled] = useState(() => audioAlert.isEnabled());

  // Delete & Clear Order History states (Admin only)
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearScope, setClearScope] = useState<'all' | 'archived_and_cancelled' | 'active_only'>('all');
  const [resetCustomerStats, setResetCustomerStats] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [adjustingPrepId, setAdjustingPrepId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const handleAdjustPrepTarget = async (order: Order, currentTarget: number, delta: number) => {
    const nextTarget = Math.max(1, Math.min(180, currentTarget + delta));
    if (nextTarget === currentTarget) return;
    setAdjustingPrepId(order.id);
    try {
      await adjustOrderPrepTime(order.id, nextTarget);
      onNotify(`⏱️ ปรับเวลาเป้าหมายออเดอร์ #${order.orderNumber} เป็น ${nextTarget} นาที`, 'info');
    } catch {
      onNotify('ไม่สามารถปรับเวลาทำอาหารได้', 'error');
    } finally {
      setAdjustingPrepId(null);
    }
  };

  const toggleAudio = () => {
    const next = !isAudioEnabled;
    setIsAudioEnabled(next);
    audioAlert.setEnabled(next);
    if (next) {
      audioAlert.triggerNewOrderAlert();
      onNotify('เปิดเสียงเตือน "มีออเดอร์เข้า" เรียบร้อย', 'info');
    } else {
      onNotify('ปิดเสียงเตือนแล้ว', 'info');
    }
  };

  const handleTestSound = () => {
    audioAlert.testVoiceAlert({ tableNumber: 1, deliveryType: 'มาทานที่ร้าน' }, 'รับออเดอร์');
    onNotify('📢 กำลังเล่นเสียงพูด: "ออเดอร์ของ โต๊ะที่ 1 ทานที่ร้าน รับออเดอร์"', 'info');
  };

  const handleFreeTable = async (tableNumber: number | string) => {
    try {
      const rawNum = String(tableNumber).trim();
      const parsed = parseInt(rawNum, 10);
      const tableId = !isNaN(parsed) ? `table_${parsed}` : `table_${rawNum}`;
      await updateTableStatus(tableId, false);
      onNotify(`🟢 คืนสถานะ "โต๊ะ ${rawNum}" เป็นโต๊ะว่างเรียบร้อยแล้ว`, 'success');
    } catch {
      onNotify(`ไม่สามารถเปลี่ยนสถานะโต๊ะ ${tableNumber} ได้`, 'error');
    }
  };

  // Handle bulk order history clearing
  const handleExecuteClearOrders = async () => {
    setIsClearing(true);
    try {
      const res = await clearOrdersHistory({
        scope: clearScope,
        resetCustomerPoints: resetCustomerStats,
      });

      const scopeName =
        clearScope === 'all'
          ? 'ออเดอร์ทั้งหมด'
          : clearScope === 'archived_and_cancelled'
          ? 'ออเดอร์ส่งแล้วและยกเลิก'
          : 'ออเดอร์ที่ค้างอยู่';

      let msg = `🗑️ เคลียร์ประวัติ${scopeName}เรียบร้อยแล้ว (${res.deletedOrdersCount} รายการ)`;
      if (res.resetCustomersCount > 0) {
        msg += ` พร้อมรีเซ็ตแต้มสะสมลูกค้า ${res.resetCustomersCount} ราย`;
      }
      onNotify(msg, 'success');
      setShowClearModal(false);
    } catch (err) {
      console.error('Clear orders error:', err);
      onNotify('เกิดข้อผิดพลาดในการเคลียร์ประวัติออเดอร์', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  // Handle single order permanent deletion
  const handleExecuteDeleteSingleOrder = async () => {
    if (!orderToDelete) return;
    setIsDeletingSingle(true);
    try {
      await deleteOrder(orderToDelete.id);
      onNotify(`🗑️ ลบออเดอร์ #${orderToDelete.orderNumber} ออกจากระบบเรียบร้อยแล้ว`, 'info');
      if (detailOrder?.id === orderToDelete.id) {
        setDetailOrder(null);
      }
      setOrderToDelete(null);
    } catch (err) {
      console.error('Delete single order error:', err);
      onNotify('เกิดข้อผิดพลาดในการลบออเดอร์', 'error');
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // Normalize order statuses and sort newest first
  const normalizedOrders = useMemo(() => {
    return orders
      .map((o) => ({
        ...o,
        status: normalizeOrderStatus(o.status),
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  const speedStats = useMemo(
    () => getDailyKitchenSpeedStats(normalizedOrders, menus, defaultPrepTimeMinutes, nowMs),
    [normalizedOrders, menus, defaultPrepTimeMinutes, nowMs]
  );

  // Apply date-range filter to normalized orders for review tabs while keeping live table state intact
  const dateFilteredOrders = useMemo(() => {
    if (dateRange === 'all') return normalizedOrders;
    return normalizedOrders.filter((o) => isOrderInDateRange(o.createdAt, dateRange));
  }, [normalizedOrders, dateRange]);

  const totalLiveActiveCount = useMemo(() => {
    return normalizedOrders.filter(
      (o) =>
        o.status !== 'ส่งแล้ว' &&
        o.status !== 'เช็คบิล' &&
        o.status !== 'ยกเลิก' &&
        !o.isArchived &&
        !o.isCancelled
    ).length;
  }, [normalizedOrders]);

  // 1. Active Orders: NOT 'ส่งแล้ว', NOT 'เช็คบิล', NOT 'ยกเลิก' AND NOT isArchived
  const activeOrders = useMemo(() => {
    return dateFilteredOrders.filter(
      (o) =>
        o.status !== 'ส่งแล้ว' &&
        o.status !== 'เช็คบิล' &&
        o.status !== 'ยกเลิก' &&
        !o.isArchived &&
        !o.isCancelled
    );
  }, [dateFilteredOrders]);

  // 2. Archived / Delivered Orders awaiting checkout: status is 'ส่งแล้ว'
  const archivedOrders = useMemo(() => {
    return dateFilteredOrders.filter(
      (o) => o.status === 'ส่งแล้ว' && !o.isCancelled
    );
  }, [dateFilteredOrders]);

  // 2.5 Checked-out Orders: status is 'เช็คบิล'
  const checkedOutOrders = useMemo(() => {
    return dateFilteredOrders.filter(
      (o) => o.status === 'เช็คบิล' && !o.isCancelled
    );
  }, [dateFilteredOrders]);

  // 3. Cancelled Orders: status is 'ยกเลิก' or isCancelled
  const cancelledOrders = useMemo(() => {
    return dateFilteredOrders.filter(
      (o) => o.status === 'ยกเลิก' || o.isCancelled
    );
  }, [dateFilteredOrders]);

  // Per-range counts specifically for the currently active viewTab
  const currentTabDateCounts = useMemo(() => {
    const matchesCurrentTab = (o: Order) => {
      if (viewTab === 'active') {
        return (
          o.status !== 'ส่งแล้ว' &&
          o.status !== 'เช็คบิล' &&
          o.status !== 'ยกเลิก' &&
          !o.isArchived &&
          !o.isCancelled
        );
      }
      if (viewTab === 'archived') return o.status === 'ส่งแล้ว' && !o.isCancelled;
      if (viewTab === 'checkedout') return o.status === 'เช็คบิล' && !o.isCancelled;
      return o.status === 'ยกเลิก' || Boolean(o.isCancelled);
    };

    const tabOrders = normalizedOrders.filter(matchesCurrentTab);
    return {
      all: tabOrders.length,
      today: tabOrders.filter((o) => isOrderInDateRange(o.createdAt, 'today')).length,
      yesterday: tabOrders.filter((o) => isOrderInDateRange(o.createdAt, 'yesterday')).length,
      '7days': tabOrders.filter((o) => isOrderInDateRange(o.createdAt, '7days')).length,
    };
  }, [normalizedOrders, viewTab]);

  // Financial totals for selected historical tabs
  const archivedTotalAmount = useMemo(
    () => archivedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0),
    [archivedOrders]
  );
  const checkedOutTotalAmount = useMemo(
    () => checkedOutOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0),
    [checkedOutOrders]
  );
  const cancelledTotalAmount = useMemo(
    () => cancelledOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0),
    [cancelledOrders]
  );

  // Apply active status filter
  const displayedActiveOrders = useMemo(() => {
    if (selectedFilter === 'ทั้งหมด') return activeOrders;
    return activeOrders.filter((o) => o.status === selectedFilter);
  }, [activeOrders, selectedFilter]);

  // Counts for filters
  const counts = useMemo(() => {
    return {
      ทั้งหมด: activeOrders.length,
      รับออเดอร์: activeOrders.filter((o) => o.status === 'รับออเดอร์').length,
      กำลังทำ: activeOrders.filter((o) => o.status === 'กำลังทำ').length,
      ส่งออเดอร์: activeOrders.filter((o) => o.status === 'ส่งออเดอร์' || o.status === 'กำลังส่ง').length,
      กำลังส่ง: activeOrders.filter((o) => o.status === 'กำลังส่ง').length,
      ส่งแล้ว: archivedOrders.length,
      เช็คบิล: checkedOutOrders.length,
      ยกเลิก: cancelledOrders.length,
    };
  }, [activeOrders, archivedOrders, checkedOutOrders, cancelledOrders]);

  // Live Real-time Map of active orders per table number
  const ordersByTableKey = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const ord of normalizedOrders) {
      if (!isOrderHoldingTable(ord)) continue;
      const key = extractOrderTableIdentifier(ord);
      if (!key) continue;
      const parsed = parseInt(key, 10);
      const normKey = !isNaN(parsed) ? String(parsed) : key;
      const existing = map.get(normKey) || [];
      existing.push(ord);
      map.set(normKey, existing);
    }
    return map;
  }, [normalizedOrders]);

  // Live synced references for modals
  const liveStatusModalOrder = useMemo(
    () => (statusModalOrderId ? normalizedOrders.find((o) => o.id === statusModalOrderId) || null : null),
    [normalizedOrders, statusModalOrderId]
  );

  const liveCheckBillOrder = useMemo(
    () => (checkBillOrderId ? normalizedOrders.find((o) => o.id === checkBillOrderId) || null : null),
    [normalizedOrders, checkBillOrderId]
  );

  const liveSelectedTable = useMemo(
    () => (selectedTableId ? tables.find((t) => t.id === selectedTableId) || null : null),
    [tables, selectedTableId]
  );

  const liveSelectedTableOrders = useMemo(() => {
    if (!liveSelectedTable) return [];
    return ordersByTableKey.get(String(liveSelectedTable.number)) || [];
  }, [liveSelectedTable, ordersByTableKey]);

  const availableTablesCount = useMemo(
    () => tables.filter((t) => !t.isOccupied && !(ordersByTableKey.get(String(t.number))?.length)).length,
    [tables, ordersByTableKey]
  );

  // Handle strictly 1-way status change with voice alert
  const handleNextStatus = async (order: Order, nextStatus: OrderStatus) => {
    try {
      setUpdatingId(order.id);
      await updateOrderStatus(order, nextStatus);

      // 🔊 เล่นเสียงเตือนพูดระบุสถานะออเดอร์ตามขั้นตอน:
      audioAlert.playOrderStatusAlert(
        {
          customerName: order.customerName,
          tableNumber: order.tableNumber,
          deliveryType: order.deliveryType,
          orderNumber: order.orderNumber,
          status: nextStatus,
        },
        nextStatus
      );

      if (nextStatus === 'เช็คบิล') {
        const hasTable = Boolean(order.tableNumber || /โต๊ะ\s*\d+/.test(order.customerName || ''));
        onNotify(
          hasTable
            ? `💰 เช็คบิลออเดอร์ #${order.orderNumber} เรียบร้อย (อัปเดตโต๊ะเป็น "โต๊ะว่าง" แล้ว)`
            : `💰 เช็คบิลออเดอร์ #${order.orderNumber} เรียบร้อยแล้ว`,
          'success'
        );
        if (detailOrder?.id === order.id) {
          setDetailOrder(null);
        }
      } else if (nextStatus === 'ส่งแล้ว') {
        onNotify(
          `ออเดอร์ #${order.orderNumber} ส่งแล้ว และบันทึกประวัติลูกค้าเรียบร้อย (กด "เช็คบิล" ได้เมื่อชำระเงิน)`,
          'success'
        );
        if (detailOrder?.id === order.id) {
          setDetailOrder(null);
        }
      } else {
        onNotify(`อัปเดตสถานะเป็น "${nextStatus}" เรียบร้อย`, 'success');
      }
    } catch (err) {
      console.error('Update status error:', err);
      const msg = err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยนสถานะได้';
      onNotify(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Confirm cancel order action with voice alert
  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    try {
      setIsCancelling(true);
      await cancelOrder(orderToCancel, cancelReasonInput.trim() || 'ยกเลิกโดยทางร้าน');

      // 🔊 แจ้งเตือนเสียงยกเลิก
      audioAlert.playOrderStatusAlert(
        {
          customerName: orderToCancel.customerName,
          tableNumber: orderToCancel.tableNumber,
          deliveryType: orderToCancel.deliveryType,
          orderNumber: orderToCancel.orderNumber,
          status: 'ยกเลิก',
        },
        'ยกเลิก'
      );

      onNotify(
        `ยกเลิกออเดอร์ #${orderToCancel.orderNumber} เรียบร้อย (ลบออกจากรายการออเดอร์ และบันทึกประวัติเมนูเรียบร้อย)`,
        'info'
      );
      setOrderToCancel(null);
      if (detailOrder?.id === orderToCancel.id) {
        setDetailOrder(null);
      }
    } catch (err) {
      console.error('Cancel order error:', err);
      onNotify('เกิดข้อผิดพลาดในการยกเลิกออเดอร์', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-4 text-stone-900 w-full max-w-full min-w-0">
      {/* 1. Header & Active Orders Count (Mobile-safe wrapping) */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200 shadow-xs flex flex-col gap-3 w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-xl font-black text-stone-900 flex items-center gap-1.5">
                <ShoppingBag className="w-5 h-5 text-red-600 shrink-0" />
                <span>รายการออเดอร์</span>
              </h2>
              <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-black rounded-full shrink-0">
                Active: {totalLiveActiveCount}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5 leading-relaxed">
              แตะไอคอนวงกลมหรือโต๊ะเพื่ออัปเดตสถานะรายเมนู • กดเช็คบิลเพื่อสรุปยอดล่าสุด
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* ปุ่ม ➕ คีย์ออเดอร์ใหม่ (POS) */}
            <button
              type="button"
              onClick={() => {
                setCreateOrderPresetTable(undefined);
                setIsCreateOrderModalOpen(true);
              }}
              className="px-3 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap active:scale-95 shadow-sm cursor-pointer"
              title="แอดมินคีย์ออเดอร์ใหม่ สั่งหน้าร้าน โต๊ะ หรือทางโทรศัพท์"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>คีย์ออเดอร์ (POS)</span>
            </button>

            {/* ปุ่มลบประวัติ / เคลียร์ออเดอร์ทดลอง (Admin Only) */}
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap active:scale-95 shadow-2xs cursor-pointer"
              title="ลบประวัติออเดอร์ หรือเคลียร์ออเดอร์ทดลองเพื่อเปิดร้านจริง"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>ลบประวัติ</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs - Wraps cleanly on all mobile widths */}
        <div className="flex flex-wrap items-center gap-1.5 w-full min-w-0 pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={() => setViewTab('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              viewTab === 'active'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
          >
            <span>⚡ รอจัดการ ({activeOrders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewTab('archived')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              viewTab === 'archived'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
            title="ออเดอร์ที่จัดส่งแล้ว รอเช็คบิล"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>ส่งแล้ว ({archivedOrders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewTab('checkedout')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              viewTab === 'checkedout'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
            title="ออเดอร์ที่เช็คบิลและคืนสถานะโต๊ะว่างเรียบร้อยแล้ว"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>เช็คบิลแล้ว ({checkedOutOrders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewTab('cancelled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              viewTab === 'cancelled'
                ? 'bg-stone-800 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
            title="ออเดอร์ที่ยกเลิก บันทึกประวัติเมนูขายดีโดยไม่สะสมแต้ม"
          >
            <Ban className="w-3.5 h-3.5 text-rose-400" />
            <span>ยกเลิกแล้ว ({cancelledOrders.length})</span>
          </button>
        </div>

        {/* Date-Range Filter Bar (ทั้งหมด, วันนี้, เมื่อวาน, 7 วันล่าสุด) */}
        <div className="flex flex-wrap items-center justify-between gap-2 w-full min-w-0 pt-2 border-t border-stone-100">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-stone-600 mr-0.5 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>ช่วงเวลา:</span>
            </span>
            {DATE_RANGE_OPTIONS.map((opt) => {
              const isSelected = dateRange === opt.id;
              const rangeCount = currentTabDateCounts[opt.id];
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDateRange(opt.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                  title={opt.shortDesc}
                >
                  <span>{opt.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black tabular-nums ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-white text-stone-600'
                    }`}
                  >
                    {rangeCount}
                  </span>
                </button>
              );
            })}
          </div>

          {dateRange !== 'all' && (
            <button
              type="button"
              onClick={() => setDateRange('all')}
              className="text-[11px] font-bold text-red-600 hover:text-red-700 underline whitespace-nowrap cursor-pointer"
            >
              แสดงทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* 2. เสียงเตือนเวลาออเดอร์เข้า & ปุ่มทดสอบเสียง */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 px-3 flex flex-wrap items-center justify-between gap-2 text-xs w-full max-w-full min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={toggleAudio}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black transition active:scale-95 shadow-2xs cursor-pointer ${
              isAudioEnabled
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
            }`}
            title={isAudioEnabled ? 'คลิกเพื่อปิดเสียงเตือน' : 'คลิกเพื่อเปิดเสียงเตือน'}
          >
            {isAudioEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>เสียงเตือน: เปิดอยู่</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>เสียงเตือน: ปิดอยู่</span>
              </>
            )}
          </button>
          <span className="text-stone-600 text-[11px] hidden sm:inline">
            🔔 มีเสียงเตือนพูด "มีออเดอร์เข้า" อัตโนมัติเมื่อมีออเดอร์ใหม่เข้ามา
          </span>
        </div>

        <button
          type="button"
          onClick={handleTestSound}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 text-amber-900 border border-amber-300 rounded-xl font-black text-xs active:scale-95 transition shadow-2xs cursor-pointer"
          title="กดเพื่อทดสอบเสียงเตือน 'มีออเดอร์เข้า' และปลดล็อกเสียงบนเบราว์เซอร์"
        >
          <Bell className="w-3.5 h-3.5 text-red-600" />
          <span>🔊 ทดสอบเสียง</span>
        </button>
      </div>

      {/* 2.2 KITCHEN SERVICE-SPEED SLA SUMMARY BAR (ความเร็วครัววันนี้) */}
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-stone-200 shadow-xs space-y-2 w-full max-w-full min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-stone-900">
            <Timer className="w-4 h-4 text-red-600 shrink-0" />
            <span>ความเร็วครัววันนี้ (Service Speed)</span>
          </div>
          <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
            เกณฑ์มาตรฐานร้าน ~{defaultPrepTimeMinutes} น.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="px-2.5 py-1 rounded-xl bg-stone-100 text-stone-800 font-bold">
            กำลังทำ {speedStats.activeCount} ออเดอร์
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
            🟢 ทันเวลา {speedStats.onTrackCount}
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-bold">
            🟡 ใกล้ครบ {speedStats.warningCount}
          </span>
          <span
            className={`px-2.5 py-1 rounded-xl border font-bold ${
              speedStats.overdueCount > 0
                ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                : 'bg-stone-50 text-stone-600 border-stone-200'
            }`}
          >
            🔴 ล่าช้า {speedStats.overdueCount}
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-sky-50 text-sky-900 border border-sky-200 font-bold">
            ✅ เสร็จวันนี้ {speedStats.completedTodayCount}
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-stone-50 text-stone-800 border border-stone-200 font-bold">
            ⏱️ เฉลี่ยจริง ~{speedStats.avgActualPrepMinutes} น. • ทันเป้า {speedStats.onTimeRatePct}%
          </span>
        </div>
      </div>

      {/* 2.5 REAL-TIME TABLE STATUS BOARD IN ADMIN (Requirement 4) */}
      {tables.length > 0 && (
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200 shadow-xs space-y-2.5 w-full max-w-full min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <h3 className="text-xs sm:text-sm font-black text-stone-900 truncate">
                🍽️ สถานะโต๊ะแบบเรียลไทม์ (แตะโต๊ะเพื่อเพิ่มเมนู / อัปเดตสถานะ)
              </h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border shrink-0 ${
                availableTablesCount === 0
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              ว่าง {availableTablesCount}/{tables.length} โต๊ะ
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {tables.map((tbl) => {
              const tblOrders = ordersByTableKey.get(String(tbl.number)) || [];
              const primaryOrd = tblOrders[0];
              const isBusy = tbl.isOccupied || tblOrders.length > 0;
              const ordSummary = primaryOrd ? getOrderCompletionSummary(primaryOrd) : null;

              return (
                <button
                  key={tbl.id}
                  type="button"
                  onClick={() => setSelectedTableId(tbl.id)}
                  className={`p-2.5 rounded-2xl border-2 text-left transition active:scale-[0.97] cursor-pointer flex flex-col justify-between gap-1.5 min-h-[76px] ${
                    isBusy
                      ? 'bg-rose-50/80 border-rose-300 hover:border-rose-500 shadow-2xs'
                      : 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className="font-black text-xs sm:text-sm text-stone-900 truncate">
                      {tbl.name}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isBusy ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                      }`}
                    />
                  </div>

                  {primaryOrd ? (
                    <div className="space-y-0.5 w-full">
                      <div className="text-[11px] font-black text-red-600 tabular-nums truncate">
                        ฿{primaryOrd.totalAmount.toLocaleString()}
                      </div>
                      {ordSummary && (
                        <div
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded-full inline-block ${
                            ordSummary.isAllCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {ordSummary.isAllCompleted
                            ? `✓ ครบ ${ordSummary.completedLines}/${ordSummary.totalLines}`
                            : `ได้ ${ordSummary.completedLines}/${ordSummary.totalLines}`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`text-[10px] font-bold ${
                        tbl.isOccupied ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {tbl.isOccupied ? '🔴 ล็อคเต็ม' : '🟢 ว่าง'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Status Filters (Only for Active Orders) */}
      {viewTab === 'active' && (
        <div className="flex flex-wrap items-center gap-1.5 w-full min-w-0">
          {ACTIVE_STATUS_FILTERS.map((st) => {
            const count = counts[st];
            const isActive = selectedFilter === st;

            return (
              <button
                key={st}
                onClick={() => setSelectedFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                <span>{st}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive ? 'bg-white/25 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 4. ORDERS HORIZONTAL SCROLLING TABLE (1 ออเดอร์ต่อ 1 แถว) */}
      {viewTab === 'active' && (
        displayedActiveOrders.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 space-y-2.5 w-full">
            <Clock className="w-10 h-10 mx-auto text-stone-300" />
            <div className="text-sm font-bold text-stone-700">
              {dateRange === 'all' ? 'ไม่มีออเดอร์ในสถานะนี้' : 'ไม่พบออเดอร์ในช่วงวันที่ที่เลือก'}
            </div>
            <p className="text-xs text-stone-400">
              {dateRange === 'all'
                ? 'เมื่อลูกค้ากดสั่งอาหารผ่านหน้าเว็บ ออเดอร์ใหม่จะปรากฏขึ้นที่นี่ทันที'
                : 'ลองเปลี่ยนช่วงเวลาเป็น "ทั้งหมด" หรือเลือกแท็บ ส่งแล้ว / เช็คบิลแล้ว เพื่อดูประวัติ'}
            </p>
            {dateRange !== 'all' && (
              <button
                type="button"
                onClick={() => setDateRange('all')}
                className="px-3.5 py-1.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                แสดงทุกช่วงเวลา
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden w-full max-w-full min-w-0">
            {/* Scrollable table container */}
            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[980px]">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-700 font-extrabold text-[11px] uppercase tracking-wide">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 min-w-[110px]">เลขออเดอร์</th>
                    <th className="py-3 px-3 min-w-[95px]">วันที่</th>
                    <th className="py-3 px-3 min-w-[80px]">เวลา</th>
                    <th className="py-3 px-3 min-w-[110px]">ลูกค้า</th>
                    <th className="py-3 px-3 min-w-[120px]">เบอร์โทร</th>
                    <th className="py-3 px-3 min-w-[200px]">รายการออเดอร์</th>
                    <th className="py-3 px-3 min-w-[150px] text-center bg-amber-50/70 border-x border-amber-200 text-amber-950 font-black">
                      มาเอง,นำส่ง,นัดรับ
                    </th>
                    <th className="py-3 px-3 min-w-[100px] text-right">ยอดรวม</th>
                    <th className="py-3 px-3 min-w-[130px] text-center">สถานะ</th>
                    <th className="py-3 px-3 min-w-[170px] text-center">ปุ่มจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {displayedActiveOrders.map((order, idx) => {
                    const statusStyle =
                      STATUS_BADGE_STYLES[order.status] || STATUS_BADGE_STYLES['รับออเดอร์'];
                    const nextStatus = NEXT_ORDER_STATUS_MAP[order.status];
                    const timing = getOrderTimingMetrics(order, nowMs, menus, defaultPrepTimeMinutes);
                    const isOutOfZone =
                      Boolean(order.isOutOfDeliveryZone) ||
                      (typeof order.distanceKm === 'number' && order.distanceKm > 12);
                    const isPickup = order.deliveryType === 'นัดรับอาหาร';
                    const hasRewards =
                      Array.isArray(order.earnedRewardsNotice) &&
                      order.earnedRewardsNotice.length > 0;

                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-stone-50/80 transition group ${
                          isOutOfZone ? 'bg-amber-50/40' : ''
                        } ${
                          isPickup ? 'bg-amber-50/60 border-l-4 border-l-amber-500 font-medium' : ''
                        }`}
                      >
                        {/* Index */}
                        <td className="py-3.5 px-3 text-center font-bold text-stone-400">
                          {idx + 1}
                        </td>

                        {/* Order Number */}
                        <td className="py-3.5 px-3">
                          <button
                            type="button"
                            onClick={() => setDetailOrder(order)}
                            className="font-black text-red-600 hover:underline hover:text-red-700 text-left text-xs whitespace-nowrap cursor-pointer flex items-center gap-1"
                            title="กดดูรายละเอียดแบบเต็ม"
                          >
                            <span>#{order.orderNumber}</span>
                          </button>
                        </td>

                        {/* Date (e.g. 8 ต.ค. 2026) */}
                        <td className="py-3.5 px-3 text-stone-700 font-bold whitespace-nowrap">
                          {formatOrderDate(order.createdAt)}
                        </td>

                        {/* Time (e.g. 22:08 น.) */}
                        <td className="py-3.5 px-3 text-stone-600 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>{formatOrderTime(order.createdAt)}</span>
                          </span>
                        </td>

                        {/* Customer Name */}
                        <td className="py-3.5 px-3 font-extrabold text-stone-900 max-w-[130px] truncate" title={order.customerName}>
                          {order.customerName}
                        </td>

                        {/* Customer Phone (Callable) */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <a
                            href={`tel:${order.customerPhone}`}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-lg font-bold text-xs transition border border-stone-200"
                            title="กดเพื่อโทรออก"
                          >
                            <Phone className="w-3 h-3 text-red-600" />
                            <span>{order.customerPhone}</span>
                          </a>
                        </td>

                        {/* Items Summary (รายการออเดอร์) */}
                        <td className="py-3.5 px-3 max-w-[240px]">
                          <div className="space-y-1">
                            {order.items.map((it, i) => {
                              const cancelled = isOrderItemCancelled(it);
                              return (
                                <div
                                  key={i}
                                  className={`flex items-center gap-1 text-xs font-semibold leading-tight ${
                                    cancelled ? 'text-stone-400 line-through' : 'text-stone-800'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      cancelled ? 'bg-rose-400' : 'bg-red-500'
                                    }`}
                                  ></span>
                                  <span className="truncate max-w-[140px]">{it.name}</span>
                                  <span
                                    className={`font-black text-[12px] shrink-0 ${
                                      cancelled ? 'text-rose-400' : 'text-red-600'
                                    }`}
                                  >
                                    ×{it.quantity}
                                  </span>
                                  {cancelled && (
                                    <span className="no-underline text-[10px] font-black text-rose-700 bg-rose-50 px-1 rounded shrink-0">
                                      (ยกเลิก)
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* Delivery / Dining Type (มาเอง, นำส่ง, นัดรับ) */}
                        <td className={`py-3.5 px-3 text-center whitespace-nowrap ${
                          isPickup ? 'bg-amber-100/70 border-x border-amber-300' : ''
                        }`}>
                          {renderDeliveryTypeBadge(order.deliveryType, order.tableNumber)}
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <strong className="text-sm font-black text-red-600">
                            {order.totalAmount.toLocaleString()} บ.
                          </strong>
                        </td>

                        {/* Status Circular Stepper & SLA Timer & Warnings */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <CircularStatusStepper
                              compact
                              currentStatus={order.status}
                              onOpenModal={() => setStatusModalOrderId(order.id)}
                            />
                            <div className="flex items-center gap-1 flex-wrap justify-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} whitespace-nowrap`}
                              >
                                {statusStyle.label}
                              </span>
                              <OrderCompletionBadge
                                order={order}
                                onClick={() => setStatusModalOrderId(order.id)}
                              />
                            </div>

                            {/* SLA Timer Badge & Quick -2/+2 Target Controls */}
                            <div className="flex items-center gap-1 flex-wrap justify-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${
                                  timing.speedState === 'overdue'
                                    ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                                    : timing.speedState === 'warning'
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                }`}
                              >
                                <Timer className="w-2.5 h-2.5" />
                                <span>
                                  {timing.speedState === 'overdue'
                                    ? `🔴 +${timing.overdueMinutes} น.`
                                    : timing.speedState === 'warning'
                                    ? '🟡 ใกล้ครบ'
                                    : '🟢 ทันเวลา'}{' '}
                                  ({timing.elapsedMinutes}/{timing.targetMinutes} น.)
                                </span>
                              </span>
                              <div className="inline-flex items-center gap-0.5 bg-stone-100 border border-stone-200 rounded-md px-0.5">
                                <button
                                  type="button"
                                  disabled={adjustingPrepId === order.id || timing.targetMinutes <= 2}
                                  onClick={() => handleAdjustPrepTarget(order, timing.targetMinutes, -2)}
                                  className="px-1 py-0.5 text-[10px] font-black text-stone-700 hover:bg-white rounded cursor-pointer disabled:opacity-40"
                                  title="ลดเป้าหมายเวลาลง 2 นาที"
                                >
                                  -2
                                </button>
                                <button
                                  type="button"
                                  disabled={adjustingPrepId === order.id || timing.targetMinutes >= 180}
                                  onClick={() => handleAdjustPrepTarget(order, timing.targetMinutes, 2)}
                                  className="px-1 py-0.5 text-[10px] font-black text-stone-700 hover:bg-white rounded cursor-pointer disabled:opacity-40"
                                  title="เพิ่มเป้าหมายเวลาอีก 2 นาที"
                                >
                                  +2
                                </button>
                              </div>
                            </div>

                            {/* เกิน 12 กม. Warning badge */}
                            {isOutOfZone && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[10px] font-black"
                                title="เกิน 12 กม. ร้านพิจารณารับหรือยกเลิก"
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                                <span>นอกเขต ({order.distanceKm ?? '>12'} กม.)</span>
                              </span>
                            )}

                            {/* Loyalty rewards earned badge */}
                            {hasRewards && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-[10px] font-black"
                                title={order.earnedRewardsNotice?.join(', ')}
                              >
                                <Gift className="w-2.5 h-2.5 text-emerald-700" />
                                <span>มีสิทธิ์ของฟรี</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Management Actions */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col gap-1.5 min-w-[155px]">
                            {/* ปุ่มเปิดหน้าต่างอัปเดตสถานะออเดอร์ & รายการอาหาร */}
                            <button
                              type="button"
                              onClick={() => setStatusModalOrderId(order.id)}
                              className="w-full py-1.5 px-2.5 bg-stone-900 hover:bg-black text-white rounded-lg font-black text-[11px] transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                              title="เปิดหน้าต่างอัปเดตสถานะออเดอร์และติ๊กสถานะแต่ละรายการอาหาร"
                            >
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                              <span>อัปเดตสถานะ (รายเมนู)</span>
                            </button>

                            {/* ปุ่มเปลี่ยนเป็นสถานะถัดไปด่วน */}
                            {nextStatus && (
                              <button
                                type="button"
                                onClick={() =>
                                  nextStatus === 'เช็คบิล'
                                    ? setCheckBillOrderId(order.id)
                                    : handleNextStatus(order, nextStatus)
                                }
                                disabled={updatingId === order.id}
                                className={`w-full py-1.5 px-2.5 active:scale-98 disabled:bg-stone-300 text-white text-[11px] font-bold rounded-lg shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer ${
                                  order.status === 'รับออเดอร์'
                                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 font-extrabold ring-2 ring-emerald-300'
                                    : 'bg-red-600 hover:bg-red-700'
                                }`}
                              >
                                {updatingId === order.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : order.status === 'รับออเดอร์' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                                <span className="whitespace-nowrap">
                                  {order.status === 'รับออเดอร์' ? '✅ กดรับออเดอร์' : `เป็น ${nextStatus}`}
                                </span>
                              </button>
                            )}

                            {/* ปุ่ม เช็คบิล (เปิด Pop up สรุปรายการ & แก้ไขยอดล่าสุด) */}
                            <button
                              type="button"
                              onClick={() => setCheckBillOrderId(order.id)}
                              disabled={updatingId === order.id}
                              className="w-full py-1.5 px-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-98 disabled:bg-stone-300 text-white text-[11px] font-black rounded-lg shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer"
                              title="เปิดหน้าต่างเช็คบิล สรุปรายการ เพิ่มเมนู และแก้ไขยอดล่าสุด"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                              <span>💰 เช็คบิล (สรุปยอด)</span>
                            </button>

                            {/* ปุ่ม ยกเลิก ออเดอร์ */}
                            <button
                              type="button"
                              onClick={() => {
                                setOrderToCancel(order);
                                setCancelReasonInput('ลูกค้ายกเลิก / ร้านพิจารณาไม่รับ');
                              }}
                              className="w-full py-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 active:scale-98 rounded-lg font-bold text-[11px] transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                              title="ยกเลิกออเดอร์นี้ (ลบออกจากรายการออเดอร์ และบันทึกประวัติเมนูขายดี)"
                            >
                              <Ban className="w-3 h-3 text-rose-600" />
                              <span>ยกเลิกออเดอร์</span>
                            </button>

                            {/* ปุ่มคืนสถานะโต๊ะว่าง (สำหรับออเดอร์ทานที่ร้าน) */}
                            {order.deliveryType === 'มาทานที่ร้าน' && order.tableNumber && (
                              <button
                                type="button"
                                onClick={() => handleFreeTable(order.tableNumber!)}
                                className="w-full py-1 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                                title={`คืนสถานะโต๊ะ ${order.tableNumber} เป็น 'โต๊ะว่าง'`}
                              >
                                <span>🟢 คืนสถานะโต๊ะ {order.tableNumber} ว่าง</span>
                              </button>
                            )}

                            {/* ปุ่มพิมพ์ใบเสร็จ (Print Receipt) */}
                            <button
                              type="button"
                              onClick={() => setReceiptOrder(order)}
                              className="w-full py-1.5 px-2 bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 text-amber-950 border border-amber-300 active:scale-98 rounded-lg font-black text-[11px] transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                              title="พิมพ์ใบเสร็จออเดอร์นี้ (Thermal POS & A4)"
                            >
                              <Printer className="w-3.5 h-3.5 text-amber-800" />
                              <span>พิมพ์ใบเสร็จ</span>
                            </button>

                            {/* ปุ่มสั่งอาหารเพิ่มในออเดอร์เดิม (Admin append items) */}
                            <button
                              type="button"
                              onClick={() => setOrderToAppend(order)}
                              className="w-full py-1.5 px-2 bg-gradient-to-r from-stone-800 to-stone-900 hover:bg-black text-amber-300 border border-stone-700 active:scale-98 rounded-lg font-black text-[11px] transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                              title="เพิ่มเมนูอาหารหรือเครื่องดื่มลงในออเดอร์นี้"
                            >
                              <Plus className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
                              <span>สั่งอาหารเพิ่ม</span>
                            </button>

                            {/* Link ดูรายละเอียด และ ลบออเดอร์ */}
                            <div className="flex items-center justify-between pt-1 border-t border-stone-200/60">
                              <button
                                type="button"
                                onClick={() => setDetailOrder(order)}
                                className="text-[10px] font-bold text-stone-500 hover:text-red-600 underline transition cursor-pointer"
                              >
                                ดูรายละเอียด
                              </button>
                              <button
                                type="button"
                                onClick={() => setOrderToDelete(order)}
                                className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-0.5 rounded flex items-center gap-0.5 transition cursor-pointer"
                                title="ลบออเดอร์นี้ออกจากระบบ"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>ลบ</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* 5. ARCHIVED / DELIVERED ORDERS VIEW (ตารางส่งแล้ว) */}
      {viewTab === 'archived' && (
        archivedOrders.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 space-y-2.5">
            <Archive className="w-10 h-10 mx-auto text-stone-300" />
            <div className="text-sm font-bold text-stone-700">
              {dateRange === 'all' ? 'ยังไม่มีออเดอร์ที่จัดส่งแล้ว' : 'ไม่มีออเดอร์ที่จัดส่งแล้วในช่วงวันที่ที่เลือก'}
            </div>
            <p className="text-xs text-stone-400">
              เมื่อเปลี่ยนสถานะออเดอร์เป็น "ส่งแล้ว" ข้อมูลจะถูกจัดเก็บไว้ที่นี่และนำไปคำนวณยอดขาย
            </p>
            {dateRange !== 'all' && (
              <button
                type="button"
                onClick={() => setDateRange('all')}
                className="px-3.5 py-1.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                แสดงทุกช่วงเวลา
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-800 flex flex-wrap items-center justify-between gap-2 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  ออเดอร์ที่จัดส่งแล้ว <strong>{archivedOrders.length}</strong> รายการ
                  {dateRange !== 'all' && ` (${DATE_RANGE_OPTIONS.find((d) => d.id === dateRange)?.label})`}
                </span>
              </div>
              <span className="font-black text-emerald-900 tabular-nums">
                ยอดรวม ฿{archivedTotalAmount.toLocaleString()}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[880px]">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-700 font-extrabold text-[11px] uppercase">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3 min-w-[110px]">เลขออเดอร์</th>
                      <th className="py-3 px-3 min-w-[95px]">วันที่</th>
                      <th className="py-3 px-3 min-w-[80px]">เวลา</th>
                      <th className="py-3 px-3 min-w-[120px]">ลูกค้า</th>
                      <th className="py-3 px-3 min-w-[120px]">เบอร์โทร</th>
                      <th className="py-3 px-3 min-w-[200px]">รายการออเดอร์</th>
                      <th className="py-3 px-3 min-w-[145px] text-center bg-amber-50/70 border-x border-amber-200 text-amber-950 font-black">
                        มาเอง,นำส่ง,นัดรับ
                      </th>
                      <th className="py-3 px-3 min-w-[100px] text-right">ยอดรวม</th>
                      <th className="py-3 px-3 min-w-[100px] text-center">สถานะ</th>
                      <th className="py-3 px-3 w-28 text-center">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {archivedOrders.map((order, idx) => {
                      const isPickup = order.deliveryType === 'นัดรับอาหาร';
                      return (
                      <tr key={order.id} className={`hover:bg-stone-50/80 transition ${isPickup ? 'bg-amber-50/50' : ''}`}>
                        <td className="py-3 px-3 text-center text-stone-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-3 font-black text-stone-800">#{order.orderNumber}</td>
                        <td className="py-3 px-3 text-stone-700 font-bold">{formatOrderDate(order.createdAt)}</td>
                        <td className="py-3 px-3 text-stone-600">{formatOrderTime(order.createdAt)}</td>
                        <td className="py-3 px-3 font-extrabold text-stone-900">{order.customerName}</td>
                        <td className="py-3 px-3">
                          <a href={`tel:${order.customerPhone}`} className="text-stone-800 font-bold hover:underline">
                            {order.customerPhone}
                          </a>
                        </td>
                        <td className="py-3 px-3 text-stone-700 max-w-[220px]">
                          <div className="space-y-0.5">
                            {order.items.map((it, i) => {
                              const cancelled = isOrderItemCancelled(it);
                              return (
                                <div
                                  key={i}
                                  className={`text-xs truncate ${
                                    cancelled ? 'line-through text-stone-400' : 'text-stone-800'
                                  }`}
                                  title={`${it.name} ×${it.quantity}${cancelled ? ' (ยกเลิก)' : ''}`}
                                >
                                  • {it.name}{' '}
                                  <strong className={cancelled ? 'text-rose-400' : 'text-red-600'}>
                                    ×{it.quantity}
                                  </strong>
                                  {cancelled && <span className="ml-1 text-[10px] text-rose-600">(ยกเลิก)</span>}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className={`py-3 px-3 text-center whitespace-nowrap ${isPickup ? 'bg-amber-100/60 border-x border-amber-300' : ''}`}>
                          {renderDeliveryTypeBadge(order.deliveryType, order.tableNumber)}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-emerald-700">
                          {order.totalAmount.toLocaleString()} บ.
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            🟢 ส่งแล้ว
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setCheckBillOrderId(order.id)}
                              disabled={updatingId === order.id}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer transition shadow-2xs"
                              title="เปิดหน้าต่างเช็คบิล สรุปรายการ เพิ่มเมนู และแก้ไขยอดล่าสุด"
                            >
                              <Wallet className="w-3 h-3" />
                              <span>เช็คบิล</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderToAppend(order)}
                              className="px-2 py-1 bg-stone-900 hover:bg-black text-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                              title="สั่งอาหารเพิ่มในออเดอร์นี้"
                            >
                              <Plus className="w-3 h-3 text-amber-400" />
                              <span>สั่งอาหารเพิ่ม</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setReceiptOrder(order)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                              title="พิมพ์ใบเสร็จออเดอร์นี้"
                            >
                              <Printer className="w-3 h-3 text-amber-700" />
                              <span>พิมพ์ใบเสร็จ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDetailOrder(order)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              ดูข้อมูล
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderToDelete(order)}
                              className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="ลบออเดอร์นี้ออกจากระบบถาวร"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* 5.5 CHECKED-OUT ORDERS VIEW (ตารางเช็คบิลแล้ว) */}
      {viewTab === 'checkedout' && (
        checkedOutOrders.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 space-y-2.5">
            <Wallet className="w-10 h-10 mx-auto text-stone-300" />
            <div className="text-sm font-bold text-stone-700">
              {dateRange === 'all' ? 'ยังไม่มีออเดอร์ที่เช็คบิลแล้ว' : 'ไม่มีออเดอร์ที่เช็คบิลแล้วในช่วงวันที่ที่เลือก'}
            </div>
            <p className="text-xs text-stone-400">
              เมื่อกดปุ่ม "💰 เช็คบิล" ออเดอร์จะย้ายมาอยู่ที่นี่ พร้อมคืนสถานะโต๊ะเป็นโต๊ะว่างอัตโนมัติ
            </p>
            {dateRange !== 'all' && (
              <button
                type="button"
                onClick={() => setDateRange('all')}
                className="px-3.5 py-1.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                แสดงทุกช่วงเวลา
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-teal-50 border border-teal-200 p-3 rounded-xl text-xs text-teal-900 flex flex-wrap items-center justify-between gap-2 font-medium">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-teal-700 shrink-0" />
                <span>
                  ออเดอร์ที่เช็คบิลแล้ว <strong>{checkedOutOrders.length}</strong> รายการ
                  {dateRange !== 'all' && ` (${DATE_RANGE_OPTIONS.find((d) => d.id === dateRange)?.label})`}
                </span>
              </div>
              <span className="font-black text-teal-950 tabular-nums">
                ยอดรวม ฿{checkedOutTotalAmount.toLocaleString()}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[880px]">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-700 font-extrabold text-[11px] uppercase">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3 min-w-[110px]">เลขออเดอร์</th>
                      <th className="py-3 px-3 min-w-[95px]">วันที่</th>
                      <th className="py-3 px-3 min-w-[80px]">เวลา</th>
                      <th className="py-3 px-3 min-w-[120px]">ลูกค้า</th>
                      <th className="py-3 px-3 min-w-[120px]">เบอร์โทร</th>
                      <th className="py-3 px-3 min-w-[200px]">รายการออเดอร์</th>
                      <th className="py-3 px-3 min-w-[145px] text-center bg-amber-50/70 border-x border-amber-200 text-amber-950 font-black">
                        มาเอง,นำส่ง,นัดรับ
                      </th>
                      <th className="py-3 px-3 min-w-[100px] text-right">ยอดรวม</th>
                      <th className="py-3 px-3 min-w-[110px] text-center">สถานะ</th>
                      <th className="py-3 px-3 w-28 text-center">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {checkedOutOrders.map((order, idx) => {
                      const isPickup = order.deliveryType === 'นัดรับอาหาร';
                      return (
                      <tr key={order.id} className={`hover:bg-stone-50/80 transition ${isPickup ? 'bg-amber-50/50' : ''}`}>
                        <td className="py-3 px-3 text-center text-stone-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-3 font-black text-stone-800">#{order.orderNumber}</td>
                        <td className="py-3 px-3 text-stone-700 font-bold">{formatOrderDate(order.createdAt)}</td>
                        <td className="py-3 px-3 text-stone-600">{formatOrderTime(order.createdAt)}</td>
                        <td className="py-3 px-3 font-extrabold text-stone-900">{order.customerName}</td>
                        <td className="py-3 px-3">
                          <a href={`tel:${order.customerPhone}`} className="text-stone-800 font-bold hover:underline">
                            {order.customerPhone}
                          </a>
                        </td>
                        <td className="py-3 px-3 text-stone-700 max-w-[220px]">
                          <div className="space-y-0.5">
                            {order.items.map((it, i) => {
                              const cancelled = isOrderItemCancelled(it);
                              return (
                                <div
                                  key={i}
                                  className={`text-xs truncate ${
                                    cancelled ? 'line-through text-stone-400' : 'text-stone-800'
                                  }`}
                                  title={`${it.name} ×${it.quantity}${cancelled ? ' (ยกเลิก)' : ''}`}
                                >
                                  • {it.name}{' '}
                                  <strong className={cancelled ? 'text-rose-400' : 'text-red-600'}>
                                    ×{it.quantity}
                                  </strong>
                                  {cancelled && <span className="ml-1 text-[10px] text-rose-600">(ยกเลิก)</span>}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className={`py-3 px-3 text-center whitespace-nowrap ${isPickup ? 'bg-amber-100/60 border-x border-amber-300' : ''}`}>
                          {renderDeliveryTypeBadge(order.deliveryType, order.tableNumber)}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-teal-700 tabular-nums">
                          {order.totalAmount.toLocaleString()} บ.
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-900 border border-teal-400">
                            💰 เช็คบิลแล้ว
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setReceiptOrder(order)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                              title="พิมพ์ใบเสร็จออเดอร์นี้"
                            >
                              <Printer className="w-3 h-3 text-amber-700" />
                              <span>พิมพ์ใบเสร็จ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDetailOrder(order)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              ดูข้อมูล
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderToDelete(order)}
                              className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="ลบออเดอร์นี้ออกจากระบบถาวร"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* 6. CANCELLED ORDERS VIEW (ตารางออเดอร์ที่ยกเลิก) */}
      {viewTab === 'cancelled' && (
        cancelledOrders.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 space-y-2.5">
            <Ban className="w-10 h-10 mx-auto text-stone-300" />
            <div className="text-sm font-bold text-stone-700">
              {dateRange === 'all' ? 'ไม่มีออเดอร์ที่ยกเลิก' : 'ไม่มีออเดอร์ที่ยกเลิกในช่วงวันที่ที่เลือก'}
            </div>
            <p className="text-xs text-stone-400">
              เมื่อกด "ยกเลิกออเดอร์" รายการจะถูกย้ายมาเก็บไว้ที่นี่ และนำรายการอาหารไปใช้วิเคราะห์เมนูขายดี
            </p>
            {dateRange !== 'all' && (
              <button
                type="button"
                onClick={() => setDateRange('all')}
                className="px-3.5 py-1.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                แสดงทุกช่วงเวลา
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-800 flex flex-wrap items-center justify-between gap-2 font-medium">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  ออเดอร์ที่ยกเลิก <strong>{cancelledOrders.length}</strong> รายการ
                  {dateRange !== 'all' && ` (${DATE_RANGE_OPTIONS.find((d) => d.id === dateRange)?.label})`}
                </span>
              </div>
              <span className="font-black text-rose-900 tabular-nums">
                ยอดรวม ฿{cancelledTotalAmount.toLocaleString()}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[880px]">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-700 font-extrabold text-[11px] uppercase">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3 min-w-[110px]">เลขออเดอร์</th>
                      <th className="py-3 px-3 min-w-[95px]">วันที่</th>
                      <th className="py-3 px-3 min-w-[80px]">เวลา</th>
                      <th className="py-3 px-3 min-w-[120px]">ลูกค้า</th>
                      <th className="py-3 px-3 min-w-[120px]">เบอร์โทร</th>
                      <th className="py-3 px-3 min-w-[200px]">รายการออเดอร์</th>
                      <th className="py-3 px-3 min-w-[145px] text-center bg-amber-50/70 border-x border-amber-200 text-amber-950 font-black">
                        มาเอง,นำส่ง,นัดรับ
                      </th>
                      <th className="py-3 px-3 min-w-[100px] text-right">ยอดรวม</th>
                      <th className="py-3 px-3 min-w-[120px]">เหตุผลที่ยกเลิก</th>
                      <th className="py-3 px-3 w-28 text-center">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {cancelledOrders.map((order, idx) => {
                      const isPickup = order.deliveryType === 'นัดรับอาหาร';
                      return (
                      <tr key={order.id} className={`hover:bg-stone-50/80 transition ${isPickup ? 'bg-amber-50/50' : ''}`}>
                        <td className="py-3 px-3 text-center text-stone-400 font-bold">{idx + 1}</td>
                        <td className="py-3 px-3 font-black text-stone-800">#{order.orderNumber}</td>
                        <td className="py-3 px-3 text-stone-700 font-bold">{formatOrderDate(order.createdAt)}</td>
                        <td className="py-3 px-3 text-stone-600">{formatOrderTime(order.createdAt)}</td>
                        <td className="py-3 px-3 font-extrabold text-stone-900">{order.customerName}</td>
                        <td className="py-3 px-3">
                          <a href={`tel:${order.customerPhone}`} className="text-stone-800 font-bold hover:underline">
                            {order.customerPhone}
                          </a>
                        </td>
                        <td className="py-3 px-3 text-stone-700 max-w-[220px]">
                          <div className="space-y-0.5">
                            {order.items.map((it, i) => {
                              const cancelled = isOrderItemCancelled(it);
                              return (
                                <div
                                  key={i}
                                  className={`text-xs truncate ${
                                    cancelled ? 'line-through text-stone-400' : 'text-stone-800'
                                  }`}
                                  title={`${it.name} ×${it.quantity}${cancelled ? ' (ยกเลิก)' : ''}`}
                                >
                                  • {it.name}{' '}
                                  <strong className={cancelled ? 'text-rose-400' : 'text-red-600'}>
                                    ×{it.quantity}
                                  </strong>
                                  {cancelled && <span className="ml-1 text-[10px] text-rose-600">(ยกเลิก)</span>}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className={`py-3 px-3 text-center whitespace-nowrap ${isPickup ? 'bg-amber-100/60 border-x border-amber-300' : ''}`}>
                          {renderDeliveryTypeBadge(order.deliveryType, order.tableNumber)}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-rose-700">
                          {order.totalAmount.toLocaleString()} บ.
                        </td>
                        <td className="py-3 px-3 text-stone-500 text-[11px]">
                          {order.cancelReason || 'ยกเลิกโดยทางร้าน'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setReceiptOrder(order)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                              title="พิมพ์ใบเสร็จออเดอร์นี้"
                            >
                              <Printer className="w-3 h-3 text-amber-700" />
                              <span>พิมพ์ใบเสร็จ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDetailOrder(order)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-bold cursor-pointer"
                            >
                              ดูข้อมูล
                            </button>
                            <button
                              type="button"
                              onClick={() => setOrderToDelete(order)}
                              className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="ลบออเดอร์นี้ออกจากระบบถาวร"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* 7. CONFIRM CANCEL ORDER MODAL */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn text-stone-900">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-rose-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-black text-stone-900">
                  ยืนยันการยกเลิกออเดอร์
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 space-y-1.5 text-xs text-rose-900">
              <div className="font-bold text-sm">
                ออเดอร์ #{orderToCancel.orderNumber}
              </div>
              <div>ลูกค้า: <strong>{orderToCancel.customerName}</strong> ({orderToCancel.customerPhone})</div>
              <div>ยอดรวม: <strong>{orderToCancel.totalAmount.toLocaleString()} บาท</strong></div>
              <div className="pt-1.5 border-t border-rose-200 text-[11px] text-rose-700 leading-relaxed">
                ⚠️ เมื่อกดยืนยัน ออเดอร์นี้จะถูก<strong>ลบออกจากหน้ารายการออเดอร์</strong>ทันที
                โดยระบบจะ<strong>บันทึกประวัติรายการอาหารไว้สำหรับวิเคราะห์เมนูขายดี</strong> แต่จะ<strong>ไม่มีการสะสมแต้ม</strong>ให้ลูกค้า
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-stone-700">ระบุเหตุผลในการยกเลิก (ถ้ามี):</label>
              <input
                type="text"
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="เช่น ลูกค้ายกเลิก, นอกเขตบริการ, สินค้าหมด"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                disabled={isCancelling}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                ไม่ยกเลิก (กลับไป)
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-98 disabled:bg-stone-300 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isCancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
                <span>ยืนยันยกเลิกออเดอร์</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. ORDER DETAILS MODAL (View Full Address, GPS, Google Maps, Breakdown) */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn text-stone-900">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-200 space-y-4 p-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-black text-red-600">
                  รายละเอียดออเดอร์ #{detailOrder.orderNumber}
                </h3>
                <p className="text-[11px] text-stone-500">
                  {formatOrderDateTime(detailOrder.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailOrder(null)}
                className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* นัดรับอาหาร Highlight Banner */}
            {detailOrder.deliveryType === 'นัดรับอาหาร' && (
              <div className="bg-amber-100 border-2 border-amber-400 p-3 rounded-2xl text-xs text-amber-950 flex items-center justify-between gap-2 shadow-xs animate-fadeIn">
                <div className="flex items-center gap-2 font-black">
                  <MapPin className="w-5 h-5 text-amber-800 shrink-0 fill-amber-600" />
                  <div>
                    <div className="text-xs font-black text-amber-950">📍 ออเดอร์นี้เป็น: นัดรับอาหาร</div>
                    <div className="text-[11px] text-amber-900 font-medium">ลูกค้านัดหมายมารับอาหาร (โทรนัดหมายเพื่อนัดรับ)</div>
                  </div>
                </div>
                <a
                  href={`tel:${detailOrder.customerPhone}`}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black rounded-xl text-xs flex items-center gap-1 shadow-xs shrink-0"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>โทรหาลูกค้า</span>
                </a>
              </div>
            )}

            {/* Customer & Address Detail */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-stone-50 p-3 rounded-2xl border border-stone-100">
                <div>
                  <div className="text-stone-500 text-[11px]">ชื่อลูกค้า</div>
                  <div className="font-bold text-sm text-stone-900">{detailOrder.customerName}</div>
                </div>
                <div>
                  <a
                    href={`tel:${detailOrder.customerPhone}`}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl border border-red-200 transition flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{detailOrder.customerPhone}</span>
                  </a>
                </div>
              </div>

              {/* Delivery / Dining Type */}
              <div className="flex justify-between items-center bg-stone-50 p-3 rounded-2xl border border-stone-100">
                <span className="text-stone-600 font-bold">รูปแบบการรับอาหาร:</span>
                <div>{renderDeliveryTypeBadge(detailOrder.deliveryType, detailOrder.tableNumber)}</div>
              </div>

              {/* Delivery Address */}
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-stone-800">ที่อยู่จัดส่ง:</div>
                    <div className="text-stone-600 mt-0.5 leading-relaxed">
                      {detailOrder.address || '(ลูกค้าไม่ได้ระบุข้อความที่อยู่)'}
                    </div>
                  </div>
                </div>

                {/* GPS with Google Maps Link */}
                {detailOrder.gps ? (
                  <div className="pt-2 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-emerald-700 font-medium">
                      {typeof detailOrder.distanceKm === 'number'
                        ? `ระยะทาง ${detailOrder.distanceKm} กม. • `
                        : ''}
                      พิกัด: {detailOrder.gps.lat.toFixed(5)}, {detailOrder.gps.lng.toFixed(5)}
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${detailOrder.gps.lat},${detailOrder.gps.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>เปิดแผนที่</span>
                    </a>
                  </div>
                ) : (
                  <div className="text-[11px] text-stone-400 pt-1">
                    (ไม่มีพิกัด GPS ใช้ที่อยู่ข้อความข้างต้น)
                  </div>
                )}
              </div>
            </div>

            {/* Out of zone / Rewards banner if applicable */}
            {((typeof detailOrder.distanceKm === 'number' && detailOrder.distanceKm > 12) || detailOrder.isOutOfDeliveryZone) && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs text-amber-900 flex items-start gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>ออเดอร์นี้อยู่นอกเขตบริการ (ระยะทาง {detailOrder.distanceKm ?? '>12'} กม.)</strong>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    ร้านสามารถพิจารณาว่าจะจัดส่งให้เป็นพิเศษ หรือกดปุ่ม <strong>"ยกเลิกออเดอร์"</strong>
                  </p>
                </div>
              </div>
            )}

            {detailOrder.earnedRewardsNotice && detailOrder.earnedRewardsNotice.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <Gift className="w-4 h-4 text-emerald-600" />
                  <span>สิทธิ์ของฟรีที่ลูกค้าได้รับจากแต้มสะสม:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-emerald-700 space-y-0.5">
                  {detailOrder.earnedRewardsNotice.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Items Breakdown Table */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                <span>ตารางรายการเมนู ({detailOrder.items.length} รายการ):</span>
                <span className="text-[11px] font-semibold text-stone-600 flex items-center gap-1">
                  <span>สถานะการรับ:</span>
                  {renderDeliveryTypeBadge(detailOrder.deliveryType)}
                </span>
              </div>
              <div className="bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-100 text-stone-700 font-extrabold text-[11px] border-b border-stone-200">
                      <th className="py-2 px-3">รายการเมนู</th>
                      <th className="py-2 px-2 text-center w-14">จำนวน</th>
                      <th className="py-2 px-2 text-right w-20">ราคา</th>
                      <th className="py-2 px-3 text-right w-20">รวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/60">
                    {detailOrder.items.map((it, idx) => {
                      const cancelled = isOrderItemCancelled(it);
                      return (
                        <tr key={idx} className={cancelled ? 'bg-rose-50/40 text-stone-400' : 'hover:bg-white/60'}>
                          <td className={`py-2 px-3 font-bold ${cancelled ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                            {it.name}
                            {cancelled && (
                              <span className="ml-1.5 inline-block text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                                ยกเลิก/ของหมด
                              </span>
                            )}
                          </td>
                          <td className={`py-2 px-2 text-center font-black ${cancelled ? 'text-rose-400' : 'text-red-600'}`}>
                            ×{it.quantity}
                          </td>
                          <td className={`py-2 px-2 text-right ${cancelled ? 'line-through text-stone-400' : 'text-stone-600'}`}>
                            {cancelled ? '0 บ.' : `${it.price.toLocaleString()} บ.`}
                          </td>
                          <td className={`py-2 px-3 text-right font-bold ${cancelled ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                            {cancelled ? '0 บ.' : `${(it.price * it.quantity).toLocaleString()} บ.`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculation: Subtotal, Delivery Fee, Total */}
            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>ค่าอาหาร:</span>
                <span>{detailOrder.subtotal.toLocaleString()} บาท</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>ค่าจัดส่ง ({detailOrder.deliveryArea || 'ตามระยะทาง GPS'}):</span>
                <span>{detailOrder.deliveryFee.toLocaleString()} บาท</span>
              </div>
              <div className="flex justify-between text-sm font-black text-red-600 pt-1.5 border-t border-stone-200">
                <span>ยอดรวมที่ต้องเก็บ:</span>
                <span className="text-base">{detailOrder.totalAmount.toLocaleString()} บาท</span>
              </div>
            </div>

            {/* Action buttons inside detail modal */}
            <div className="space-y-2 pt-1">
              {detailOrder.status !== 'เช็คบิล' && detailOrder.status !== 'ยกเลิก' && !detailOrder.isCancelled && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOrderToCancel(detailOrder);
                        setCancelReasonInput('ลูกค้ายกเลิก / ร้านพิจารณาไม่รับ');
                      }}
                      className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>ยกเลิกออเดอร์</span>
                    </button>

                    {NEXT_ORDER_STATUS_MAP[detailOrder.status] && (
                      <button
                        type="button"
                        onClick={() =>
                          NEXT_ORDER_STATUS_MAP[detailOrder.status] === 'เช็คบิล'
                            ? setCheckBillOrderId(detailOrder.id)
                            : handleNextStatus(detailOrder, NEXT_ORDER_STATUS_MAP[detailOrder.status]!)
                        }
                        disabled={updatingId === detailOrder.id}
                        className={`py-2.5 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                          detailOrder.status === 'รับออเดอร์'
                            ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 font-extrabold ring-2 ring-emerald-300'
                            : detailOrder.status === 'ส่งแล้ว'
                            ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 font-extrabold'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {updatingId === detailOrder.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : detailOrder.status === 'รับออเดอร์' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : detailOrder.status === 'ส่งแล้ว' ? (
                          <Wallet className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {detailOrder.status === 'รับออเดอร์'
                            ? '✅ กดรับออเดอร์ (เริ่มทำ)'
                            : detailOrder.status === 'ส่งแล้ว'
                            ? '💰 เช็คบิล'
                            : `เป็น ${NEXT_ORDER_STATUS_MAP[detailOrder.status]}`}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* ปุ่มอัปเดตสถานะรายเมนู, สั่งอาหารเพิ่ม & เช็คบิล */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setStatusModalOrderId(detailOrder.id)}
                      className="py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-1 cursor-pointer border border-amber-300"
                    >
                      <span>⚪ สถานะรายเมนู</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderToAppend(detailOrder)}
                      className="py-2.5 bg-stone-900 hover:bg-black text-amber-300 font-black rounded-xl text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
                      <span>สั่งเพิ่ม</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCheckBillOrderId(detailOrder.id)}
                      disabled={updatingId === detailOrder.id}
                      className="py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>💰 เช็คบิล</span>
                    </button>
                  </div>
                </>
              )}

              {/* ปุ่มพิมพ์ใบเสร็จ */}
              <button
                type="button"
                onClick={() => setReceiptOrder(detailOrder)}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-105 active:scale-98 text-stone-950 font-black rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer ring-2 ring-amber-200"
              >
                <Printer className="w-4 h-4 text-stone-950" />
                <span>พิมพ์ใบเสร็จ</span>
              </button>

              {/* ปุ่มลบออเดอร์นี้ออกจากระบบถาวร */}
              <button
                type="button"
                onClick={() => {
                  setOrderToDelete(detailOrder);
                }}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>ลบออเดอร์นี้ออกจากระบบถาวร</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailOrder(null)}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Clear Orders History (ล้างประวัติออเดอร์สำหรับเริ่มร้านจริง) */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    ลบประวัติ / เคลียร์ออเดอร์ทดลอง
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    สำหรับ Admin เพื่อเริ่มต้นใช้งานจริงและเคลียร์ข้อมูลทดสอบ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-700">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>คำเตือน: ข้อมูลที่ลบแล้วจะไม่สามารถกู้คืนได้</span>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                การลบนี้จะนำข้อมูลออกจากฐานข้อมูลจริง เพื่อให้ระบบสะอาด พร้อมสำหรับรับออเดอร์จากลูกค้าตัวจริง
              </p>
            </div>

            {/* Scope Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-800">
                เลือกขอบเขตออเดอร์ที่ต้องการลบ:
              </label>

              <div className="space-y-2 text-xs">
                <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                  clearScope === 'all'
                    ? 'bg-rose-50/70 border-rose-400 text-rose-950 shadow-xs ring-1 ring-rose-400'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}>
                  <input
                    type="radio"
                    name="clearScope"
                    value="all"
                    checked={clearScope === 'all'}
                    onChange={() => setClearScope('all')}
                    className="mt-0.5 accent-rose-600"
                  />
                  <div>
                    <span className="font-black block">🔴 ลบออเดอร์ทั้งหมดในระบบ (แนะนำสำหรับเปิดร้านใหม่)</span>
                    <span className="text-[11px] text-stone-500 block mt-0.5">
                      ล้างทั้งออเดอร์ที่ค้างอยู่ ({activeOrders.length}), ออเดอร์ส่งแล้ว ({archivedOrders.length}) และยกเลิก ({cancelledOrders.length}) รวม {orders.length} รายการ
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                  clearScope === 'active_only'
                    ? 'bg-amber-50/70 border-amber-400 text-amber-950 shadow-xs ring-1 ring-amber-400'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}>
                  <input
                    type="radio"
                    name="clearScope"
                    value="active_only"
                    checked={clearScope === 'active_only'}
                    onChange={() => setClearScope('active_only')}
                    className="mt-0.5 accent-amber-600"
                  />
                  <div>
                    <span className="font-black block">🟡 ลบเฉพาะออเดอร์ที่ค้างอยู่ (Active Orders)</span>
                    <span className="text-[11px] text-stone-500 block mt-0.5">
                      ลบเฉพาะออเดอร์ที่ยังไม่เสร็จ ({activeOrders.length} รายการ)
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                  clearScope === 'archived_and_cancelled'
                    ? 'bg-emerald-50/70 border-emerald-400 text-emerald-950 shadow-xs ring-1 ring-emerald-400'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}>
                  <input
                    type="radio"
                    name="clearScope"
                    value="archived_and_cancelled"
                    checked={clearScope === 'archived_and_cancelled'}
                    onChange={() => setClearScope('archived_and_cancelled')}
                    className="mt-0.5 accent-emerald-600"
                  />
                  <div>
                    <span className="font-black block">🟢 ลบเฉพาะประวัติเก่า (ส่งแล้ว & ยกเลิก)</span>
                    <span className="text-[11px] text-stone-500 block mt-0.5">
                      ลบออเดอร์ที่ส่งแล้ว ({archivedOrders.length}) และยกเลิก ({cancelledOrders.length}) รวม {archivedOrders.length + cancelledOrders.length} รายการ
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Reset Customer Loyalty Checkbox */}
            <label className="flex items-start gap-2.5 p-3 bg-stone-50 rounded-2xl border border-stone-200 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={resetCustomerStats}
                onChange={(e) => setResetCustomerStats(e.target.checked)}
                className="mt-0.5 rounded accent-red-600"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-stone-900 block">
                  รีเซ็ตประวัติสะสมแต้มของลูกค้าทดลอง (เบอร์โทรและแต้มสะสม)
                </span>
                <span className="text-[11px] text-stone-500 block">
                  ล้างข้อมูลจำนวนครั้งที่สั่งและสิทธิ์ของฟรี เพื่อให้ลูกค้านับคะแนนใหม่ตั้งแต่ 0
                </span>
              </div>
            </label>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteClearOrders}
                disabled={isClearing}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 active:scale-98 disabled:bg-stone-400 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isClearing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังล้างข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>ยืนยันลบประวัติถาวร</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Single Order Confirmation */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-stone-900">
                  ลบออเดอร์ #{orderToDelete.orderNumber}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  ลูกค้า: {orderToDelete.customerName} ({orderToDelete.totalAmount.toLocaleString()} บ.)
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-2xl border border-stone-200">
              คุณต้องการลบออเดอร์นี้ออกจากฐานข้อมูลถาวรใช่หรือไม่? (การกระทำนี้ไม่สามารถย้อนกลับได้)
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={isDeletingSingle}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteSingleOrder}
                disabled={isDeletingSingle}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-98 disabled:bg-stone-400 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeletingSingle ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบออเดอร์นี้</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. ORDER RECEIPT PRINT MODAL */}
      <OrderReceiptModal
        order={receiptOrder}
        isOpen={Boolean(receiptOrder)}
        onClose={() => setReceiptOrder(null)}
        onNotify={onNotify}
      />

      {/* 10. ADMIN CREATE ORDER MODAL (POS) */}
      <AdminCreateOrderModal
        isOpen={isCreateOrderModalOpen}
        onClose={() => {
          setIsCreateOrderModalOpen(false);
          setCreateOrderPresetTable(undefined);
        }}
        menus={menus}
        tables={tables}
        defaultPrepTimeMinutes={defaultPrepTimeMinutes}
        initialTableNumber={createOrderPresetTable}
        initialDiningType={createOrderPresetTable ? 'มาทานที่ร้าน' : undefined}
        onNotify={onNotify}
      />

      {/* 11. ADMIN APPEND ITEM MODAL */}
      <AdminAppendItemModal
        isOpen={Boolean(orderToAppend)}
        onClose={() => setOrderToAppend(null)}
        order={orderToAppend}
        menus={menus}
        defaultPrepTimeMinutes={defaultPrepTimeMinutes}
        onNotify={onNotify}
      />

      {/* 12. CIRCULAR ORDER & PER-ITEM STATUS POPUP MODAL (Requirement 5) */}
      <OrderStatusModal
        isOpen={Boolean(liveStatusModalOrder)}
        order={liveStatusModalOrder}
        menus={menus}
        defaultPrepTimeMinutes={defaultPrepTimeMinutes}
        onClose={() => setStatusModalOrderId(null)}
        onOpenCheckBill={(ord) => {
          setStatusModalOrderId(null);
          setCheckBillOrderId(ord.id);
        }}
        onOpenAppendItem={(ord) => {
          setStatusModalOrderId(null);
          setOrderToAppend(ord);
        }}
        onNotify={onNotify}
      />

      {/* 13. CHECK-BILL SUMMARY & EDITABLE TOTAL POPUP MODAL (Requirement 3) */}
      <CheckBillModal
        isOpen={Boolean(liveCheckBillOrder)}
        order={liveCheckBillOrder}
        menus={menus}
        defaultPrepTimeMinutes={defaultPrepTimeMinutes}
        onClose={() => {
          setCheckBillOrderId(null);
          if (detailOrder && liveCheckBillOrder?.id === detailOrder.id) {
            setDetailOrder(null);
          }
        }}
        onNotify={onNotify}
        onPrintAfterCheckout={(checkedOutOrd) => setReceiptOrder(checkedOutOrd)}
      />

      {/* 14. INTERACTIVE REAL-TIME TABLE DETAIL POPUP MODAL (Requirement 4) */}
      <TableDetailModal
        isOpen={Boolean(liveSelectedTable)}
        table={liveSelectedTable}
        tableOrders={liveSelectedTableOrders}
        menus={menus}
        defaultPrepTimeMinutes={defaultPrepTimeMinutes}
        onClose={() => setSelectedTableId(null)}
        onOpenCreateOrderForTable={(tblNum) => {
          setCreateOrderPresetTable(String(tblNum));
          setIsCreateOrderModalOpen(true);
        }}
        onOpenCheckBill={(ord) => setCheckBillOrderId(ord.id)}
        onPrintOrder={(ord) => setReceiptOrder(ord)}
        onNotify={onNotify}
      />
    </div>
  );
};
