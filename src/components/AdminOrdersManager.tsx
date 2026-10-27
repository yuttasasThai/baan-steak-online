import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Ban,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Gift,
  Loader2,
  MapPin,
  Phone,
  ShoppingBag,
  Store,
  Truck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { DiningType, Order, OrderStatus } from '../types';
import {
  cancelOrder,
  NEXT_ORDER_STATUS_MAP,
  normalizeOrderStatus,
  updateOrderStatus,
} from '../services/menuService';
import { audioAlert } from '../utils/audioAlert';

interface AdminOrdersManagerProps {
  orders: Order[];
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ACTIVE_STATUS_FILTERS: Array<'ทั้งหมด' | 'รับออเดอร์' | 'กำลังทำ' | 'กำลังส่ง'> = [
  'ทั้งหมด',
  'รับออเดอร์',
  'กำลังทำ',
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
  ยกเลิก: {
    bg: 'bg-rose-100',
    text: 'text-rose-800',
    border: 'border-rose-300',
    label: '❌ ยกเลิก',
  },
};

// Render Delivery / Dining Type Badge: มาเอง, นำส่ง, นัดรับ
export function renderDeliveryTypeBadge(deliveryType?: DiningType) {
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
        <span>🍽️ มาเอง (ทานร้าน)</span>
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

export const AdminOrdersManager: React.FC<AdminOrdersManagerProps> = ({ orders, onNotify }) => {
  const [selectedFilter, setSelectedFilter] = useState<'ทั้งหมด' | 'รับออเดอร์' | 'กำลังทำ' | 'กำลังส่ง'>(
    'ทั้งหมด'
  );
  const [viewTab, setViewTab] = useState<'active' | 'archived' | 'cancelled'>('active');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('ลูกค้ายกเลิก / ร้านพิจารณาไม่รับ');
  const [isCancelling, setIsCancelling] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Audio alert state (global audio alert is managed in App.tsx)
  const [isAudioEnabled, setIsAudioEnabled] = useState(() => audioAlert.isEnabled());

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
    audioAlert.triggerNewOrderAlert();
    onNotify('ทดสอบเล่นเสียงเตือน: "มีออเดอร์เข้า"', 'info');
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

  // 1. Active Orders: NOT 'ส่งแล้ว' AND NOT 'ยกเลิก' AND NOT isArchived
  const activeOrders = useMemo(() => {
    return normalizedOrders.filter(
      (o) => o.status !== 'ส่งแล้ว' && o.status !== 'ยกเลิก' && !o.isArchived && !o.isCancelled
    );
  }, [normalizedOrders]);

  // 2. Archived / Completed Orders: status is 'ส่งแล้ว'
  const archivedOrders = useMemo(() => {
    return normalizedOrders.filter(
      (o) => o.status === 'ส่งแล้ว' && !o.isCancelled
    );
  }, [normalizedOrders]);

  // 3. Cancelled Orders: status is 'ยกเลิก' or isCancelled
  const cancelledOrders = useMemo(() => {
    return normalizedOrders.filter(
      (o) => o.status === 'ยกเลิก' || o.isCancelled
    );
  }, [normalizedOrders]);

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
      กำลังส่ง: activeOrders.filter((o) => o.status === 'กำลังส่ง').length,
      ส่งแล้ว: archivedOrders.length,
      ยกเลิก: cancelledOrders.length,
    };
  }, [activeOrders, archivedOrders, cancelledOrders]);

  // Handle strictly 1-way status change
  const handleNextStatus = async (order: Order, nextStatus: OrderStatus) => {
    try {
      setUpdatingId(order.id);
      await updateOrderStatus(order, nextStatus);

      if (nextStatus === 'ส่งแล้ว') {
        onNotify(
          `ออเดอร์ #${order.orderNumber} ส่งแล้ว และบันทึกประวัติลูกค้าเรียบร้อย (ย้ายออกจาก Active Orders)`,
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

  // Confirm cancel order action
  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    try {
      setIsCancelling(true);
      await cancelOrder(orderToCancel, cancelReasonInput.trim() || 'ยกเลิกโดยทางร้าน');
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
    <div className="space-y-4 text-stone-900 w-full">
      {/* 1. Header & Active Orders Count */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-stone-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-red-600" />
              <span>รายการออเดอร์</span>
            </h2>
            <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-black rounded-full">
              Active: {activeOrders.length}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            ตารางแสดง 1 ออเดอร์ต่อ 1 แถว เลื่อนซ้าย-ขวาได้บนมือถือ • สถานะเดินหน้าทางเดียว (รับออเดอร์ → กำลังทำ → กำลังส่ง → ส่งแล้ว)
          </p>
        </div>

        {/* View Switcher: Active Orders / Delivered Orders / Cancelled Orders */}
        <div className="flex items-center gap-1.5 self-start sm:self-center overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setViewTab('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              viewTab === 'archived'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }`}
            title="ออเดอร์ที่จัดส่งเสร็จแล้ว เพื่อบันทึกประวัติและนับยอดขาย"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>ส่งแล้ว ({archivedOrders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewTab('cancelled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
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
      </div>

      {/* 2. เสียงเตือนเวลาออเดอร์เข้า "มีออเดอร์เข้า" & ปุ่มทดสอบเสียง */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 px-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
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
          <span>🔊 ทดสอบเสียง "มีออเดอร์เข้า"</span>
        </button>
      </div>

      {/* 3. Status Filters (Only for Active Orders) */}
      {viewTab === 'active' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {ACTIVE_STATUS_FILTERS.map((st) => {
            const count = counts[st];
            const isActive = selectedFilter === st;

            return (
              <button
                key={st}
                onClick={() => setSelectedFilter(st)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
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
          <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 space-y-2">
            <Clock className="w-10 h-10 mx-auto text-stone-300" />
            <div className="text-sm font-bold text-stone-700">ไม่มีออเดอร์ในสถานะนี้</div>
            <p className="text-xs text-stone-400">
              เมื่อลูกค้ากดสั่งอาหารผ่านหน้าเว็บ ออเดอร์ใหม่จะปรากฏขึ้นที่นี่ทันที
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            {/* Scrollable table container */}
            <div className="overflow-x-auto">
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
                    const itemsSummary = order.items
                      .map((it) => `${it.name} ×${it.quantity}`)
                      .join(', ');
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
                            {order.items.map((it, i) => (
                              <div key={i} className="flex items-center gap-1 text-xs text-stone-800 font-semibold leading-tight">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                                <span className="truncate max-w-[160px]">{it.name}</span>
                                <span className="text-red-600 font-black text-[12px] shrink-0">×{it.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Delivery / Dining Type (มาเอง, นำส่ง, นัดรับ) */}
                        <td className={`py-3.5 px-3 text-center whitespace-nowrap ${
                          isPickup ? 'bg-amber-100/70 border-x border-amber-300' : ''
                        }`}>
                          {renderDeliveryTypeBadge(order.deliveryType)}
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <strong className="text-sm font-black text-red-600">
                            {order.totalAmount.toLocaleString()} บ.
                          </strong>
                        </td>

                        {/* Status Badge & Warnings */}
                        <td className="py-3.5 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} whitespace-nowrap`}
                            >
                              {statusStyle.label}
                            </span>

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
                          <div className="flex flex-col gap-1.5 min-w-[150px]">
                            {/* ปุ่ม ยกเลิก ออเดอร์ บน ปุ่มสถานะออเดอร์ */}
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

                            {/* ปุ่มเปลี่ยนเป็นสถานะถัดไป */}
                            {nextStatus && (
                              <button
                                type="button"
                                onClick={() => handleNextStatus(order, nextStatus)}
                                disabled={updatingId === order.id}
                                className="w-full py-1.5 px-2.5 bg-red-600 hover:bg-red-700 active:scale-98 disabled:bg-stone-300 text-white text-[11px] font-bold rounded-lg shadow-2xs transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                {updatingId === order.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                                <span className="whitespace-nowrap">
                                  เปลี่ยนเป็น {nextStatus}
                                </span>
                              </button>
                            )}

                            {/* Link ดูรายละเอียด */}
                            <button
                              type="button"
                              onClick={() => setDetailOrder(order)}
                              className="text-[10px] font-bold text-stone-500 hover:text-red-600 text-center underline transition cursor-pointer"
                            >
                              ดูรายละเอียดแบบเต็ม
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
        )
      )}

      {/* 5. ARCHIVED / DELIVERED ORDERS VIEW (ตารางส่งแล้ว) */}
      {viewTab === 'archived' && (
        archivedOrders.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 space-y-2">
            <Archive className="w-10 h-10 mx-auto text-stone-300" />
            <div className="text-sm font-bold text-stone-700">ยังไม่มีออเดอร์ที่จัดส่งแล้ว</div>
            <p className="text-xs text-stone-400">
              เมื่อเปลี่ยนสถานะออเดอร์เป็น "ส่งแล้ว" ข้อมูลจะถูกจัดเก็บไว้ที่นี่และนำไปคำนวณยอดขาย
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                ออเดอร์ที่จัดส่งแล้วทั้งหมด <strong>{archivedOrders.length}</strong> รายการ (บันทึกประวัติลูกค้าและนับแต้มสะสมเรียบร้อย)
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
                            {order.items.map((it, i) => (
                              <div key={i} className="text-xs text-stone-800 truncate" title={`${it.name} ×${it.quantity}`}>
                                • {it.name} <strong className="text-red-600">×{it.quantity}</strong>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className={`py-3 px-3 text-center whitespace-nowrap ${isPickup ? 'bg-amber-100/60 border-x border-amber-300' : ''}`}>
                          {renderDeliveryTypeBadge(order.deliveryType)}
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
                          <button
                            type="button"
                            onClick={() => setDetailOrder(order)}
                            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            ดูข้อมูล
                          </button>
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
          <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 space-y-2">
            <Ban className="w-10 h-10 mx-auto text-stone-300" />
            <div className="text-sm font-bold text-stone-700">ไม่มีออเดอร์ที่ยกเลิก</div>
            <p className="text-xs text-stone-400">
              เมื่อกด "ยกเลิกออเดอร์" รายการจะถูกย้ายมาเก็บไว้ที่นี่ และนำรายการอาหารไปใช้วิเคราะห์เมนูขายดี
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-800 flex items-center gap-2 font-medium">
              <Ban className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                ออเดอร์ที่ยกเลิกทั้งหมด <strong>{cancelledOrders.length}</strong> รายการ (บันทึกประวัติเมนูขายดีโดยไม่สะสมแต้มให้ลูกค้า)
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
                            {order.items.map((it, i) => (
                              <div key={i} className="text-xs text-stone-800 truncate" title={`${it.name} ×${it.quantity}`}>
                                • {it.name} <strong className="text-red-600">×{it.quantity}</strong>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className={`py-3 px-3 text-center whitespace-nowrap ${isPickup ? 'bg-amber-100/60 border-x border-amber-300' : ''}`}>
                          {renderDeliveryTypeBadge(order.deliveryType)}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-rose-700">
                          {order.totalAmount.toLocaleString()} บ.
                        </td>
                        <td className="py-3 px-3 text-stone-500 text-[11px]">
                          {order.cancelReason || 'ยกเลิกโดยทางร้าน'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setDetailOrder(order)}
                            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            ดูข้อมูล
                          </button>
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
                <div>{renderDeliveryTypeBadge(detailOrder.deliveryType)}</div>
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
                    {detailOrder.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-white/60">
                        <td className="py-2 px-3 font-bold text-stone-900">{it.name}</td>
                        <td className="py-2 px-2 text-center font-black text-red-600">×{it.quantity}</td>
                        <td className="py-2 px-2 text-right text-stone-600">{it.price.toLocaleString()} บ.</td>
                        <td className="py-2 px-3 text-right font-bold text-stone-900">
                          {(it.price * it.quantity).toLocaleString()} บ.
                        </td>
                      </tr>
                    ))}
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
              {detailOrder.status !== 'ส่งแล้ว' && detailOrder.status !== 'ยกเลิก' && !detailOrder.isCancelled && (
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
                      onClick={() => handleNextStatus(detailOrder, NEXT_ORDER_STATUS_MAP[detailOrder.status]!)}
                      disabled={updatingId === detailOrder.id}
                      className="py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {updatingId === detailOrder.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      <span>เป็น {NEXT_ORDER_STATUS_MAP[detailOrder.status]}</span>
                    </button>
                  )}
                </div>
              )}

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
    </div>
  );
};
