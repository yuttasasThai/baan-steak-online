import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  Gift,
  Grid,
  Layers,
  LayoutList,
  Loader2,
  MapPin,
  Minimize2,
  Phone,
  Printer,
  Store,
  Truck,
  Utensils,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { DiningType, Order, OrderStatus } from '../types';
import { formatOrderTime, renderDeliveryTypeBadge } from './AdminOrdersManager';
import { NEXT_ORDER_STATUS_MAP, normalizeOrderStatus } from '../services/menuService';
import { audioAlert } from '../utils/audioAlert';
import { OrderReceiptModal } from './OrderReceiptModal';

export interface IncomingOrderModalProps {
  isOpen: boolean;
  /** รายการออเดอร์ทั้งหมดที่กำลังดำเนินการ (รับออเดอร์, กำลังทำ, ส่งออเดอร์) */
  orders?: Order[];
  /** สำหรับรองรับโค้ดเดิมที่ส่งมาเฉพาะ pendingOrders */
  pendingOrders?: Order[];
  onAcceptOrder?: (order: Order) => Promise<void>;
  onUpdateStatus?: (order: Order, newStatus: OrderStatus) => Promise<void>;
  onAcceptAllOrders?: () => Promise<void>;
  onCancelOrder: (order: Order, reason?: string) => Promise<void>;
  onClose: () => void;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
}

const STEP_LIST: OrderStatus[] = ['รับออเดอร์', 'กำลังทำ', 'ส่งออเดอร์', 'ส่งแล้ว'];

export const IncomingOrderModal: React.FC<IncomingOrderModalProps> = ({
  isOpen,
  orders,
  pendingOrders,
  onAcceptOrder,
  onUpdateStatus,
  onAcceptAllOrders,
  onCancelOrder,
  onClose,
  isSoundEnabled,
  onToggleSound,
}) => {
  // รวบรวมรายการออเดอร์ที่ใช้งาน
  const allOrdersList = useMemo(() => {
    const raw = (orders && orders.length > 0) ? orders : (pendingOrders || []);
    return raw
      .filter((o) => !o.isCancelled && !o.isArchived && o.status !== 'ยกเลิก' && o.status !== 'ส่งแล้ว')
      .map((o) => ({
        ...o,
        status: normalizeOrderStatus(o.status),
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, pendingOrders]);

  const [selectedStatusTab, setSelectedStatusTab] = useState<'ทั้งหมด' | 'รับออเดอร์' | 'กำลังทำ' | 'ส่งออเดอร์'>('ทั้งหมด');
  const [viewMode, setViewMode] = useState<'cards' | 'single'>('cards');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('วัตถุดิบหมด / ร้านไม่สะดวกรับ');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  // รายการที่กรองตามแท็บ
  const filteredOrders = useMemo(() => {
    if (selectedStatusTab === 'ทั้งหมด') return allOrdersList;
    if (selectedStatusTab === 'ส่งออเดอร์') {
      return allOrdersList.filter((o) => o.status === 'ส่งออเดอร์' || o.status === 'กำลังส่ง');
    }
    return allOrdersList.filter((o) => o.status === selectedStatusTab);
  }, [allOrdersList, selectedStatusTab]);

  // จำนวนออเดอร์ที่รอรับ
  const pendingCount = useMemo(() => {
    return allOrdersList.filter((o) => o.status === 'รับออเดอร์').length;
  }, [allOrdersList]);

  const cookingCount = useMemo(() => {
    return allOrdersList.filter((o) => o.status === 'กำลังทำ').length;
  }, [allOrdersList]);

  const deliveryCount = useMemo(() => {
    return allOrdersList.filter((o) => o.status === 'ส่งออเดอร์' || o.status === 'กำลังส่ง').length;
  }, [allOrdersList]);

  if (!isOpen || allOrdersList.length === 0) return null;

  // Selected order for single view
  const safeIndex = Math.min(selectedIndex, Math.max(0, filteredOrders.length - 1));
  const activeOrder = filteredOrders[safeIndex] || filteredOrders[0] || allOrdersList[0];

  // Helper status changer
  const handleAdvanceStatus = async (order: Order, targetStatus?: OrderStatus) => {
    const nextStatus = targetStatus || NEXT_ORDER_STATUS_MAP[order.status] || 'กำลังทำ';
    setProcessingOrderId(order.id);
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(order, nextStatus);
      } else if (onAcceptOrder && nextStatus === 'กำลังทำ') {
        await onAcceptOrder(order);
      }
      // 🔊 สั่งเล่นเสียงเตือนสถานะทันที
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
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleAcceptAllPending = async () => {
    setIsProcessingAll(true);
    try {
      if (onAcceptAllOrders) {
        await onAcceptAllOrders();
      } else if (onUpdateStatus || onAcceptOrder) {
        const pendingList = allOrdersList.filter((o) => o.status === 'รับออเดอร์');
        for (const ord of pendingList) {
          if (onUpdateStatus) {
            await onUpdateStatus(ord, 'กำลังทำ');
          } else if (onAcceptOrder) {
            await onAcceptOrder(ord);
          }
        }
      }
    } finally {
      setIsProcessingAll(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    setProcessingOrderId(orderToCancel.id);
    try {
      await onCancelOrder(orderToCancel, cancelReason);
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
      setOrderToCancel(null);
    } finally {
      setProcessingOrderId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border-2 border-red-500 overflow-hidden flex flex-col max-h-[94vh] animate-scaleUp">
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-3.5 sm:p-4 flex items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-white/20 text-white shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400"></span>
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight truncate">
                  🚨 รายการออเดอร์ทั้งหมด (เรียลไทม์)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-400 text-stone-950 shadow-xs shrink-0">
                  กำลังทำ/รอจัดการ {allOrdersList.length} ออเดอร์
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-red-100 font-medium truncate mt-0.5">
                {pendingCount > 0
                  ? `🟡 มีออเดอร์รอรับ ${pendingCount} รายการ (มีเสียงเตือนซ้ำ)`
                  : '🟢 ออเดอร์ทั้งหมดได้รับการกดรับแล้ว อยู่ในขั้นตอนปรุงและส่ง'}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* View switcher */}
            <div className="hidden sm:flex bg-black/20 p-0.5 rounded-xl border border-white/20">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-stone-900 shadow-xs' : 'text-white/80 hover:text-white'
                }`}
                title="แสดงการ์ดรายการทั้งหมด"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>การ์ดทั้งหมด</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'single' ? 'bg-white text-stone-900 shadow-xs' : 'text-white/80 hover:text-white'
                }`}
                title="ดูละเอียดทีละออเดอร์"
              >
                <Grid className="w-3.5 h-3.5" />
                <span>โฟกัสเดี่ยว</span>
              </button>
            </div>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={onToggleSound}
              className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                isSoundEnabled
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-amber-400 text-stone-950'
              }`}
              title={isSoundEnabled ? 'กดเพื่อปิดเสียงเตือน' : 'กดเพื่อเปิดเสียงเตือน'}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Minimize / Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
              title="ย่อหน้าต่าง"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Filter Tabs & Accept All Bar */}
        <div className="bg-stone-100 border-b border-stone-200 px-3 py-2 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setSelectedStatusTab('ทั้งหมด')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedStatusTab === 'ทั้งหมด'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              <span>ทั้งหมด ({allOrdersList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatusTab('รับออเดอร์')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedStatusTab === 'รับออเดอร์'
                  ? 'bg-amber-500 text-stone-950 shadow-xs font-black'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              <span>🟡 รับออเดอร์ ({pendingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatusTab('กำลังทำ')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedStatusTab === 'กำลังทำ'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              <span>🔵 กำลังทำ ({cookingCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatusTab('ส่งออเดอร์')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedStatusTab === 'ส่งออเดอร์'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              <span>🚚 ส่งออเดอร์ ({deliveryCount})</span>
            </button>
          </div>

          {/* Quick Accept All if pending > 0 */}
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={handleAcceptAllPending}
              disabled={isProcessingAll}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:bg-stone-300 text-white text-xs font-black rounded-xl shadow-xs transition shrink-0 whitespace-nowrap flex items-center gap-1 cursor-pointer"
            >
              {isProcessingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>รับทั้งหมด ({pendingCount})</span>
            </button>
          )}
        </div>

        {/* Modal Main Body */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-3.5 flex-1 bg-stone-50/60">
          
          {/* VIEW MODE 1: Cards View (Show all orders simultaneously with real-time status) */}
          {viewMode === 'cards' && (
            <div className="space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-stone-500 bg-white rounded-2xl border border-stone-200">
                  <p className="text-sm font-bold">ไม่มีรายการออเดอร์ในสถานะ "{selectedStatusTab}"</p>
                </div>
              ) : (
                filteredOrders.map((ord) => {
                  const isTable = Boolean(ord.deliveryType === 'มาทานที่ร้าน' || ord.tableNumber);
                  const isPickup = ord.deliveryType === 'นัดรับอาหาร';
                  const isBusy = processingOrderId === ord.id;
                  const currentStatus = ord.status;

                  return (
                    <div
                      key={ord.id}
                      className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs hover:border-red-300 transition space-y-3"
                    >
                      {/* Card Header: Type, Order#, Time, and Current Status Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                              isTable ? 'bg-amber-100 text-amber-800' : isPickup ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {isTable ? '🍽️' : isPickup ? '🛍️' : '🛵'}
                          </span>
                          <div>
                            <div className="text-sm sm:text-base font-black text-stone-900 flex items-center gap-2">
                              <span>
                                {isTable
                                  ? `โต๊ะ ${ord.tableNumber || 1} (ทานที่ร้าน)`
                                  : isPickup
                                  ? 'นัดรับอาหาร (Pickup)'
                                  : 'จัดส่งถึงบ้าน (Delivery)'}
                              </span>
                              <span className="text-xs text-stone-500 font-normal">
                                #{ord.orderNumber}
                              </span>
                            </div>
                            <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                              <span>ลูกค้า: <strong className="text-stone-800">{ord.customerName || 'ลูกค้า'}</strong></span>
                              {ord.customerPhone && ord.customerPhone !== '-' && (
                                <>
                                  <span>•</span>
                                  <a
                                    href={`tel:${ord.customerPhone.replace(/[^0-9]/g, '')}`}
                                    className="text-red-600 font-bold hover:underline flex items-center gap-0.5"
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>{ord.customerPhone}</span>
                                  </a>
                                </>
                              )}
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatOrderTime(ord.createdAt)}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Real-time Status Badge */}
                        <div className="flex items-center gap-1.5">
                          {currentStatus === 'รับออเดอร์' && (
                            <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-black animate-pulse flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                              <span>🟡 รับออเดอร์</span>
                            </span>
                          )}
                          {currentStatus === 'กำลังทำ' && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-900 border border-blue-300 rounded-full text-xs font-black flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
                              <span>🔵 กำลังทำอาหาร</span>
                            </span>
                          )}
                          {(currentStatus === 'ส่งออเดอร์' || currentStatus === 'กำลังส่ง') && (
                            <span className="px-3 py-1 bg-orange-100 text-orange-900 border border-orange-300 rounded-full text-xs font-black flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5 text-orange-600" />
                              <span>🚚 ส่งออเดอร์</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Real-time Step Progress Bar */}
                      <div className="py-1">
                        <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] font-bold">
                          {/* Step 1: รับออเดอร์ */}
                          <div
                            className={`py-1.5 px-1 rounded-xl transition ${
                              currentStatus === 'รับออเดอร์'
                                ? 'bg-amber-400 text-stone-950 font-black shadow-xs ring-2 ring-amber-300'
                                : 'bg-emerald-100 text-emerald-900'
                            }`}
                          >
                            <span>1. รับออเดอร์</span>
                          </div>

                          {/* Step 2: กำลังทำ */}
                          <div
                            className={`py-1.5 px-1 rounded-xl transition ${
                              currentStatus === 'กำลังทำ'
                                ? 'bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-300'
                                : currentStatus === 'ส่งออเดอร์' || currentStatus === 'กำลังส่ง' || currentStatus === 'ส่งแล้ว'
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-stone-100 text-stone-400'
                            }`}
                          >
                            <span>2. กำลังทำ</span>
                          </div>

                          {/* Step 3: ส่งออเดอร์ */}
                          <div
                            className={`py-1.5 px-1 rounded-xl transition ${
                              currentStatus === 'ส่งออเดอร์' || currentStatus === 'กำลังส่ง'
                                ? 'bg-orange-500 text-white font-black shadow-xs ring-2 ring-orange-300'
                                : currentStatus === 'ส่งแล้ว'
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-stone-100 text-stone-400'
                            }`}
                          >
                            <span>3. ส่งออเดอร์</span>
                          </div>

                          {/* Step 4: ส่งแล้ว */}
                          <div
                            className={`py-1.5 px-1 rounded-xl transition ${
                              currentStatus === 'ส่งแล้ว'
                                ? 'bg-emerald-600 text-white font-black shadow-xs'
                                : 'bg-stone-100 text-stone-400'
                            }`}
                          >
                            <span>4. ส่งแล้ว</span>
                          </div>
                        </div>
                      </div>

                      {/* Food Items Preview */}
                      <div className="bg-stone-50 rounded-xl p-2.5 border border-stone-200 text-xs">
                        <div className="flex flex-wrap gap-2 text-stone-800">
                          {ord.items?.map((it, idx) => (
                            <span key={idx} className="bg-white px-2 py-1 rounded-lg border border-stone-200 font-semibold flex items-center gap-1">
                              <span className="text-red-600 font-bold">{it.quantity}x</span>
                              <span>{it.name}</span>
                            </span>
                          ))}
                        </div>
                        {ord.address && (
                          <p className="text-[11px] text-stone-600 mt-2 truncate">
                            📍 <strong>ที่อยู่:</strong> {ord.address}
                          </p>
                        )}
                      </div>

                      {/* Card Bottom Actions: 1-Click Status Advancement */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="text-xs">
                          <span className="text-stone-500">ยอดรวม: </span>
                          <span className="text-base font-black text-red-600">฿{ord.totalAmount.toLocaleString()}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* ปุ่มพิมพ์บิล */}
                          <button
                            type="button"
                            onClick={() => setReceiptOrder(ord)}
                            className="px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="พิมพ์บิล / ใบเสร็จออเดอร์นี้ (Thermal POS & A4)"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-700" />
                            <span className="hidden sm:inline">พิมพ์บิล</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setOrderToCancel(ord)}
                            className="px-2.5 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                            title="ปฏิเสธ/ยกเลิกออเดอร์"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>

                          {/* Status Progression Button */}
                          {currentStatus === 'รับออเดอร์' && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(ord, 'กำลังทำ')}
                              disabled={isBusy}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer ring-2 ring-emerald-200"
                            >
                              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              <span>👉 รับออเดอร์ (เริ่มทำอาหาร)</span>
                            </button>
                          )}

                          {currentStatus === 'กำลังทำ' && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(ord, 'ส่งออเดอร์')}
                              disabled={isBusy}
                              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer ring-2 ring-orange-200"
                            >
                              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                              <span>🚚 ส่งออเดอร์ (พร้อมเสิร์ฟ/ออกส่ง)</span>
                            </button>
                          )}

                          {(currentStatus === 'ส่งออเดอร์' || currentStatus === 'กำลังส่ง') && (
                            <button
                              type="button"
                              onClick={() => handleAdvanceStatus(ord, 'ส่งแล้ว')}
                              disabled={isBusy}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-98 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer ring-2 ring-emerald-200"
                            >
                              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                              <span>✅ ส่งแล้ว (เสร็จสิ้น)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW MODE 2: Single Focus View */}
          {viewMode === 'single' && activeOrder && (
            <div className="space-y-4">
              {/* Order selector tabs if > 1 order */}
              {filteredOrders.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {filteredOrders.map((ord, idx) => {
                    const isSelected = idx === safeIndex;
                    const label = ord.tableNumber
                      ? `โต๊ะ ${ord.tableNumber}`
                      : ord.deliveryType === 'นัดรับอาหาร'
                      ? 'นัดรับ'
                      : `ออเดอร์ ${idx + 1}`;

                    return (
                      <button
                        key={ord.id}
                        type="button"
                        onClick={() => setSelectedIndex(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <span>{label}</span>
                        <span className="text-[10px] opacity-80">#{ord.orderNumber.slice(-4)}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Single Hero Table / Delivery Badge */}
              <div
                className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 shadow-xs ${
                  activeOrder.tableNumber
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-400 text-amber-950'
                    : activeOrder.deliveryType === 'นัดรับอาหาร'
                    ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-400 text-amber-950'
                    : 'bg-gradient-to-r from-sky-50 to-blue-50 border-sky-400 text-sky-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs shrink-0 ${
                      activeOrder.tableNumber
                        ? 'bg-amber-400 text-white'
                        : activeOrder.deliveryType === 'นัดรับอาหาร'
                        ? 'bg-amber-400 text-white'
                        : 'bg-sky-500 text-white'
                    }`}
                  >
                    {activeOrder.tableNumber ? '🍽️' : activeOrder.deliveryType === 'นัดรับอาหาร' ? '🛍️' : '🛵'}
                  </div>
                  <div>
                    <div className="text-lg sm:text-xl font-black tracking-tight">
                      {activeOrder.tableNumber
                        ? `โต๊ะ ${activeOrder.tableNumber} (ทานที่ร้าน)`
                        : activeOrder.deliveryType === 'นัดรับอาหาร'
                        ? 'นัดรับอาหารที่ร้าน (Pickup)'
                        : 'จัดส่งถึงบ้าน (Delivery)'}
                    </div>
                    <div className="text-xs font-semibold opacity-80 flex items-center gap-2 mt-0.5">
                      <span>ออเดอร์ #{activeOrder.orderNumber}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatOrderTime(activeOrder.createdAt)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-3 py-1 bg-red-600 text-white rounded-full text-xs font-black shadow-xs animate-pulse">
                    สถานะ: {activeOrder.status}
                  </span>
                </div>
              </div>

              {/* Stepper progress in single view */}
              <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-bold bg-white p-3 rounded-2xl border border-stone-200">
                <div className={`p-2 rounded-xl ${activeOrder.status === 'รับออเดอร์' ? 'bg-amber-400 text-stone-950 ring-2 ring-amber-300' : 'bg-emerald-100 text-emerald-900'}`}>
                  1. รับออเดอร์
                </div>
                <div className={`p-2 rounded-xl ${activeOrder.status === 'กำลังทำ' ? 'bg-blue-600 text-white ring-2 ring-blue-300' : (activeOrder.status === 'ส่งออเดอร์' || activeOrder.status === 'กำลังส่ง' || activeOrder.status === 'ส่งแล้ว') ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-stone-400'}`}>
                  2. กำลังทำ
                </div>
                <div className={`p-2 rounded-xl ${(activeOrder.status === 'ส่งออเดอร์' || activeOrder.status === 'กำลังส่ง') ? 'bg-orange-500 text-white ring-2 ring-orange-300' : activeOrder.status === 'ส่งแล้ว' ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-stone-400'}`}>
                  3. ส่งออเดอร์
                </div>
                <div className={`p-2 rounded-xl ${activeOrder.status === 'ส่งแล้ว' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-400'}`}>
                  4. ส่งแล้ว
                </div>
              </div>

              {/* Customer Info Box */}
              <div className="bg-white rounded-2xl p-3.5 border border-stone-200 text-xs text-stone-800 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-stone-500 font-medium">ชื่อผู้สั่ง:</span>
                  <strong className="text-stone-900 font-extrabold text-sm">
                    {activeOrder.customerName || (activeOrder.tableNumber ? `โต๊ะ ${activeOrder.tableNumber}` : 'ลูกค้า')}
                  </strong>
                </div>

                {activeOrder.customerPhone && activeOrder.customerPhone !== '-' && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-stone-500 font-medium">เบอร์โทรศัพท์:</span>
                    <a
                      href={`tel:${activeOrder.customerPhone.replace(/[^0-9]/g, '')}`}
                      className="font-bold text-red-600 hover:text-red-700 flex items-center gap-1 underline"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{activeOrder.customerPhone}</span>
                    </a>
                  </div>
                )}

                {activeOrder.address && (
                  <div className="flex items-start justify-between gap-2 pt-1 border-t border-stone-200">
                    <span className="text-stone-500 font-medium shrink-0">ที่อยู่/จุดสังเกต:</span>
                    <span className="text-right text-stone-700 font-medium">{activeOrder.address}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-200 overflow-hidden">
                {activeOrder.items?.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-red-100 text-red-700 font-black text-xs flex items-center justify-center shrink-0">
                        {item.quantity}x
                      </span>
                      <span className="font-bold text-stone-900 text-sm">{item.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-stone-900">
                        ฿{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 flex items-center justify-between text-base font-black">
                <span>ยอดรวมสุทธิ:</span>
                <span className="text-2xl text-red-600">฿{activeOrder.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Cancel Confirmation Prompt */}
          {orderToCancel && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-2 text-xs text-rose-950 animate-fadeIn">
              <div className="flex items-center gap-1.5 font-bold text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>ยืนยันการปฏิเสธ / ยกเลิกออเดอร์ #{orderToCancel.orderNumber}?</span>
              </div>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="ระบุเหตุผล เช่น วัตถุดิบหมด"
                className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs"
              />
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setOrderToCancel(null)}
                  className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 rounded-xl text-xs font-semibold text-stone-700 cursor-pointer"
                >
                  กลับไป
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={processingOrderId === orderToCancel.id}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  ยืนยันยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Bar: Single mode action button & minimize */}
        {viewMode === 'single' && activeOrder && (
          <div className="p-3.5 sm:p-4 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row gap-2.5">
            {activeOrder.status === 'รับออเดอร์' && (
              <button
                type="button"
                onClick={() => handleAdvanceStatus(activeOrder, 'กำลังทำ')}
                disabled={processingOrderId === activeOrder.id}
                className="flex-1 py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 hover:from-emerald-700 hover:to-green-800 active:scale-98 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ring-4 ring-emerald-200"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>✅ กดรับออเดอร์ (เริ่มทำอาหาร)</span>
              </button>
            )}

            {activeOrder.status === 'กำลังทำ' && (
              <button
                type="button"
                onClick={() => handleAdvanceStatus(activeOrder, 'ส่งออเดอร์')}
                disabled={processingOrderId === activeOrder.id}
                className="flex-1 py-3.5 px-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 active:scale-98 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ring-4 ring-orange-200"
              >
                <Truck className="w-5 h-5" />
                <span>🚚 ส่งออเดอร์ (พร้อมเสิร์ฟ/ออกส่ง)</span>
              </button>
            )}

            {(activeOrder.status === 'ส่งออเดอร์' || activeOrder.status === 'กำลังส่ง') && (
              <button
                type="button"
                onClick={() => handleAdvanceStatus(activeOrder, 'ส่งแล้ว')}
                disabled={processingOrderId === activeOrder.id}
                className="flex-1 py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-98 text-white font-black text-sm sm:text-base rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ring-4 ring-emerald-200"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>✅ ส่งแล้ว (เสร็จสิ้น)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setReceiptOrder(activeOrder)}
              className="py-3 px-4 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              title="พิมพ์ใบเสร็จออเดอร์นี้"
            >
              <Printer className="w-4 h-4 text-amber-700" />
              <span>พิมพ์บิล</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
            >
              <Minimize2 className="w-4 h-4" />
              <span>ย่อหน้าต่าง</span>
            </button>
          </div>
        )}

      </div>

      {/* Receipt Print Modal */}
      <OrderReceiptModal
        order={receiptOrder}
        isOpen={Boolean(receiptOrder)}
        onClose={() => setReceiptOrder(null)}
      />
    </div>
  );
};
