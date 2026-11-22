import React, { useEffect, useState } from 'react';
import {
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Timer,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';
import { MenuItem, Order, OrderItemStatus, OrderStatus } from '../types';
import {
  ITEM_STEP_INDEX,
  adjustOrderPrepTime,
  cancelOrderItem,
  getEffectiveItemStatus,
  getOrderCompletionSummary,
  markAllOrderItemsStatus,
  normalizeOrderStatus,
  updateOrderItemStatus,
  updateOrderStatus,
} from '../services/menuService';
import {
  DEFAULT_SHOP_PREP_MINUTES,
  STOCKOUT_CANCEL_REASONS,
  getOrderTimingMetrics,
  isOrderItemCancelled,
} from '../utils/orderPrepUtils';
import { audioAlert } from '../utils/audioAlert';
import {
  CircularStatusStepper,
  ITEM_STATUS_CIRCLES,
} from './CircularStatusStepper';
import { formatOrderTime, renderDeliveryTypeBadge } from './AdminOrdersManager';

interface OrderStatusModalProps {
  isOpen: boolean;
  order: Order | null;
  menus?: MenuItem[];
  defaultPrepTimeMinutes?: number;
  onClose: () => void;
  onOpenCheckBill: (order: Order) => void;
  onOpenAppendItem?: (order: Order) => void;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const OrderStatusModal: React.FC<OrderStatusModalProps> = ({
  isOpen,
  order,
  menus = [],
  defaultPrepTimeMinutes = DEFAULT_SHOP_PREP_MINUTES,
  onClose,
  onOpenCheckBill,
  onOpenAppendItem,
  onNotify,
}) => {
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [updatingItemIdx, setUpdatingItemIdx] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [adjustingPrep, setAdjustingPrep] = useState(false);

  // Per-item stock-out / cancellation UI state
  const [cancellingItemIdx, setCancellingItemIdx] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState<string>(STOCKOUT_CANCEL_REASONS[0]);
  const [markMenuUnavailable, setMarkMenuUnavailable] = useState(true);
  const [isCancellingItem, setIsCancellingItem] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCancellingItemIdx(null);
      return;
    }
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, [isOpen, order?.id]);

  if (!isOpen || !order) return null;

  const normStatus = normalizeOrderStatus(order.status);
  const summary = getOrderCompletionSummary(order);
  const isTerminal = normStatus === 'เช็คบิล' || normStatus === 'ยกเลิก' || Boolean(order.isCancelled);
  const timing = getOrderTimingMetrics(order, nowMs, menus, defaultPrepTimeMinutes);

  const handleAdjustPrepMinutes = async (delta: number) => {
    if (isTerminal || adjustingPrep) return;
    const nextMinutes = Math.max(2, Math.min(180, timing.targetMinutes + delta));
    try {
      setAdjustingPrep(true);
      await adjustOrderPrepTime(order.id, nextMinutes);
      onNotify(`⏱️ ปรับเวลาเตรียมอาหารออเดอร์ #${order.orderNumber} เป็น ~${nextMinutes} นาที`, 'info');
    } catch {
      onNotify('ไม่สามารถปรับเวลาเตรียมอาหารได้', 'error');
    } finally {
      setAdjustingPrep(false);
    }
  };

  const handleSelectOrderStep = async (nextStatus: OrderStatus) => {
    try {
      setUpdatingOrder(true);
      await updateOrderStatus(order, nextStatus);

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

      onNotify(`✅ อัปเดตสถานะออเดอร์ #${order.orderNumber} เป็น "${nextStatus}" เรียบร้อย`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยนสถานะได้';
      onNotify(msg, 'error');
    } finally {
      setUpdatingOrder(false);
    }
  };

  const handleSelectItemStatus = async (idx: number, nextItemStatus: OrderItemStatus) => {
    if (isTerminal) return;
    const targetItem = order.items[idx];
    if (!targetItem || isOrderItemCancelled(targetItem)) return;

    try {
      setUpdatingItemIdx(idx);
      const result = await updateOrderItemStatus(order, idx, nextItemStatus);
      const updatedSummary = getOrderCompletionSummary({
        ...order,
        items: result.items,
        status: result.nextOrderStatus,
      });

      audioAlert.playItemStatusAlert({
        order: {
          customerName: order.customerName,
          tableNumber: order.tableNumber,
          deliveryType: order.deliveryType,
          orderNumber: order.orderNumber,
          status: result.nextOrderStatus,
        },
        itemName: targetItem.name,
        itemQuantity: targetItem.quantity,
        itemStatus: nextItemStatus,
        isAllCompleted: updatedSummary.isAllCompleted,
        completedLines: updatedSummary.completedLines,
        totalLines: updatedSummary.totalLines,
      });

      const statusLabel = nextItemStatus === 'เสิร์ฟแล้ว' ? 'ได้รับครบแล้ว' : nextItemStatus;
      onNotify(
        result.didAdvanceOrderStatus
          ? `อัปเดต "${targetItem.name}" เป็น "${statusLabel}" • ออเดอร์หลักขยับเป็น "${result.nextOrderStatus}" แล้ว`
          : `อัปเดตรายการ "${targetItem.name}" เป็น "${statusLabel}"`,
        'success'
      );
    } catch (err) {
      console.error('Update item status error:', err);
      const msg = err instanceof Error ? err.message : 'ไม่สามารถอัปเดตสถานะรายการอาหารได้';
      onNotify(msg, 'error');
    } finally {
      setUpdatingItemIdx(null);
    }
  };

  const handleConfirmCancelItem = async (idx: number) => {
    if (isTerminal || isCancellingItem) return;
    const targetItem = order.items[idx];
    if (!targetItem || isOrderItemCancelled(targetItem)) return;

    try {
      setIsCancellingItem(true);
      const res = await cancelOrderItem({
        order,
        itemIndex: idx,
        reason: cancelReason,
        markMenuUnavailable,
      });

      audioAlert.playItemCancelledAlert({
        order: {
          customerName: order.customerName,
          tableNumber: order.tableNumber,
          deliveryType: order.deliveryType,
          orderNumber: order.orderNumber,
          status: res.nextOrderStatus,
        },
        itemName: res.cancelledItemName,
        reason: cancelReason,
        isWholeOrderCancelled: res.isWholeOrderCancelled,
      });

      if (res.isWholeOrderCancelled) {
        onNotify(
          `❌ ยกเลิก "${res.cancelledItemName}" (ไม่มีรายการเหลือในบิล) — ระบบยกเลิกออเดอร์ #${order.orderNumber} และคืนโต๊ะให้แล้ว`,
          'info'
        );
        setCancellingItemIdx(null);
        onClose();
      } else {
        onNotify(
          `ตัดยอด "${res.cancelledItemName}" ออกแล้ว (${cancelReason}) • ยอดรวมใหม่ ฿${res.newTotal.toLocaleString()}${
            res.didDisableMenu ? ' • ปิดขายเมนูนี้หน้าเว็บแล้ว' : ''
          }`,
          'success'
        );
        setCancellingItemIdx(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถยกเลิกรายการอาหารได้';
      onNotify(msg, 'error');
    } finally {
      setIsCancellingItem(false);
    }
  };

  const handleMarkAllCompleted = async () => {
    if (isTerminal) return;
    try {
      setMarkingAll(true);
      const result = await markAllOrderItemsStatus(order, 'เสิร์ฟแล้ว');
      const activeCount = result.items.filter((it) => !isOrderItemCancelled(it)).length;

      audioAlert.playAllItemsCompletedAlert(
        {
          customerName: order.customerName,
          tableNumber: order.tableNumber,
          deliveryType: order.deliveryType,
          orderNumber: order.orderNumber,
          status: result.nextOrderStatus,
        },
        activeCount
      );

      onNotify(
        result.didAdvanceOrderStatus
          ? `✅ ติ๊กครบทุกรายการแล้ว • ออเดอร์ #${order.orderNumber} ขยับเป็น "${result.nextOrderStatus}" อัตโนมัติ`
          : `✅ ติ๊กได้รับอาหารครบทุกรายการในออเดอร์ #${order.orderNumber} แล้ว`,
        'success'
      );
    } catch (err) {
      console.error('Mark all items error:', err);
      const msg = err instanceof Error ? err.message : 'ไม่สามารถอัปเดตรายการทั้งหมดได้';
      onNotify(msg, 'error');
    } finally {
      setMarkingAll(false);
    }
  };

  const slaBadgeClass =
    timing.speedState === 'overdue'
      ? 'bg-rose-50 text-rose-800 border-rose-300'
      : timing.speedState === 'warning'
      ? 'bg-amber-50 text-amber-900 border-amber-300'
      : timing.speedState === 'done'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
      : timing.speedState === 'cancelled'
      ? 'bg-stone-100 text-stone-500 border-stone-200'
      : 'bg-emerald-50 text-emerald-800 border-emerald-300';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] text-stone-900">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                อัปเดตสถานะออเดอร์ #{order.orderNumber}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-[11px] font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatOrderTime(order.createdAt)}</span>
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-stone-300">
              <span>ลูกค้า: <strong className="text-white">{order.customerName || 'ลูกค้า'}</strong></span>
              <span>•</span>
              <span className="tabular-nums">ยอด ฿{order.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer shrink-0"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 space-y-4 bg-stone-50/70 min-w-0">
          {/* Dining Type Pill + Append CTA */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {renderDeliveryTypeBadge(order.deliveryType, order.tableNumber)}
            {onOpenAppendItem && !isTerminal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAppendItem(order);
                }}
                className="px-3 py-1.5 bg-stone-900 hover:bg-black text-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
                <span>สั่งอาหารเพิ่ม</span>
              </button>
            )}
          </div>

          {/* Kitchen Prep-Time & SLA Speed Control Bar */}
          {timing.targetMinutes > 0 && (
            <div className={`rounded-2xl p-3 border flex flex-wrap items-center justify-between gap-2 ${slaBadgeClass}`}>
              <div className="flex items-center gap-2 min-w-0">
                <Timer className="w-4 h-4 shrink-0" />
                <div className="text-xs leading-snug">
                  <div className="font-black flex items-center gap-1.5 flex-wrap">
                    <span>
                      {timing.speedState === 'overdue'
                        ? `🔴 ล่าช้า +${timing.overdueMinutes} นาที`
                        : timing.speedState === 'warning'
                        ? `🟡 ใกล้ครบเวลา (เหลือ ${Math.max(0, timing.remainingMinutes)} น.)`
                        : timing.speedState === 'done'
                        ? `✓ ทำเสร็จใน ${timing.elapsedMinutes} นาที`
                        : timing.speedState === 'cancelled'
                        ? 'ออเดอร์ยกเลิกแล้ว'
                        : `🟢 ทันเวลา (ผ่านไป ${timing.elapsedMinutes} น.)`}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white/80 text-stone-800 border border-black/10 text-[10px] font-bold tabular-nums">
                      เป้า ~{timing.targetMinutes} นาที
                    </span>
                  </div>
                </div>
              </div>

              {!isTerminal && !timing.isFinished && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={adjustingPrep || timing.targetMinutes <= 2}
                    onClick={() => handleAdjustPrepMinutes(-2)}
                    className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-[11px] font-black tabular-nums cursor-pointer disabled:opacity-40"
                    title="เร่งเป้าเวลาลง 2 นาที"
                  >
                    -2 น.
                  </button>
                  <button
                    type="button"
                    disabled={adjustingPrep}
                    onClick={() => handleAdjustPrepMinutes(2)}
                    className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-[11px] font-black tabular-nums cursor-pointer disabled:opacity-40"
                    title="เพิ่มเวลาทำอีก 2 นาที"
                  >
                    +2 น.
                  </button>
                  <button
                    type="button"
                    disabled={adjustingPrep}
                    onClick={() => handleAdjustPrepMinutes(5)}
                    className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 text-[11px] font-black tabular-nums cursor-pointer disabled:opacity-40"
                    title="เพิ่มเวลาทำอีก 5 นาที"
                  >
                    +5 น.
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Section 1: Circular Order Status Stepper */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-black text-stone-800 uppercase tracking-wide">
                1. สถานะออเดอร์หลัก (ขยับตามรายเมนูอัตโนมัติ)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-black">
                ตอนนี้: {normStatus}
              </span>
              {updatingOrder && <Loader2 className="w-4 h-4 animate-spin text-red-600" />}
            </div>

            <CircularStatusStepper
              currentStatus={normStatus}
              interactive={!isTerminal}
              disabled={updatingOrder}
              onSelectStep={handleSelectOrderStep}
              showCheckoutCircle
              onSelectCheckout={() => {
                onClose();
                onOpenCheckBill(order);
              }}
            />
          </div>

          {/* Section 2: Overall Completion Overview */}
          <div
            className={`rounded-2xl p-4 border-2 transition space-y-2.5 ${
              summary.isAllCompleted
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-amber-50/90 border-amber-300 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black shadow-xs shrink-0 ${
                    summary.isAllCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-400 text-stone-950'
                  }`}
                >
                  {summary.isAllCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Utensils className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-black">
                    {summary.isAllCompleted
                      ? '✅ ได้รับรายการอาหารครบทุกเมนูแล้ว!'
                      : `⏳ ยังไม่ครบ (ได้รับแล้ว ${summary.completedLines}/${summary.totalLines} รายการ)`}
                  </div>
                  <div className="text-[11px] font-semibold opacity-80 tabular-nums">
                    รวมที่ขายได้ {summary.totalDishes} จาน/แก้ว • ครบแล้ว {summary.completedDishes}/{summary.totalDishes}
                    {summary.cancelledLines > 0 && (
                      <span className="ml-1.5 text-rose-700 font-black">
                        • ยกเลิก {summary.cancelledLines} รายการ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!summary.isAllCompleted && !isTerminal && summary.totalLines > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllCompleted}
                  disabled={markingAll}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer disabled:bg-stone-300"
                >
                  {markingAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>ติ๊กครบทุกรายการ</span>
                </button>
              )}
            </div>

            {/* Smooth Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-white/80 border border-black/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  summary.isAllCompleted ? 'bg-emerald-600' : 'bg-amber-500'
                }`}
                style={{ width: `${summary.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Section 3: Per-Item Circular Status List */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-black text-stone-800">
                2. สถานะแต่ละรายการอาหาร ({order.items.length} เมนู)
              </span>
              <span className="text-[10px] font-bold text-stone-500">
                อัปเดตไปข้างหน้าเท่านั้น • ยกเลิกเฉพาะเมนูที่หมดได้
              </span>
            </div>

            <div className="divide-y divide-stone-100">
              {order.items.map((item, idx) => {
                const isItemCancelled = isOrderItemCancelled(item);
                const effStatus = getEffectiveItemStatus(item, normStatus);
                const isBusyItem = updatingItemIdx === idx;
                const isCancellingThis = cancellingItemIdx === idx;

                return (
                  <div
                    key={`${item.menuId}_${idx}`}
                    className={`p-3.5 space-y-2.5 transition ${
                      isItemCancelled
                        ? 'bg-rose-50/70 opacity-80'
                        : effStatus === 'เสิร์ฟแล้ว'
                        ? 'bg-emerald-50/35'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-full font-black text-xs flex items-center justify-center shrink-0 tabular-nums ${
                            isItemCancelled
                              ? 'bg-rose-200 text-rose-800'
                              : effStatus === 'เสิร์ฟแล้ว'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          ×{item.quantity}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-sm font-black truncate ${
                                isItemCancelled ? 'line-through text-stone-500' : 'text-stone-900'
                              }`}
                            >
                              {item.name}
                            </span>
                            {isItemCancelled ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black">
                                ของหมด / ยกเลิกแล้ว
                              </span>
                            ) : (
                              !isTerminal && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isCancellingThis) {
                                      setCancellingItemIdx(null);
                                    } else {
                                      setCancellingItemIdx(idx);
                                      setCancelReason(STOCKOUT_CANCEL_REASONS[0]);
                                      setMarkMenuUnavailable(true);
                                    }
                                  }}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold cursor-pointer transition"
                                  title="ยกเลิกรายการนี้กรณีของหมดกระทันหัน"
                                >
                                  <Ban className="w-2.5 h-2.5" />
                                  <span>ของหมด/ยกเลิก</span>
                                </button>
                              )
                            )}
                          </div>

                          <div className="text-[11px] font-semibold text-stone-500">
                            {isItemCancelled ? (
                              <span className="text-rose-700 font-bold">
                                ฿0 (ตัดยอดแล้ว{item.cancelReason ? ` • ${item.cancelReason}` : ''})
                              </span>
                            ) : (
                              <>
                                สถานะ:{' '}
                                <span
                                  className={`font-black ${
                                    effStatus === 'เสิร์ฟแล้ว'
                                      ? 'text-emerald-700'
                                      : effStatus === 'พร้อมเสิร์ฟ'
                                      ? 'text-orange-600'
                                      : effStatus === 'กำลังทำ'
                                      ? 'text-blue-600'
                                      : 'text-amber-700'
                                  }`}
                                >
                                  {effStatus === 'เสิร์ฟแล้ว' ? '✓ ได้รับ/เสิร์ฟแล้ว' : effStatus}
                                </span>
                                {item.prepTimeMinutes && (
                                  <span className="ml-1.5 text-stone-400 tabular-nums">
                                    • ~{item.prepTimeMinutes} น.
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 4 Modern Circular Status Icon Buttons (Strictly 1-way forward only) */}
                      {!isItemCancelled && (
                        <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
                          {isBusyItem && <Loader2 className="w-4 h-4 animate-spin text-red-600 mr-1" />}
                          {ITEM_STATUS_CIRCLES.map((opt) => {
                            const effIdx = ITEM_STEP_INDEX[effStatus] ?? 0;
                            const optIdx = ITEM_STEP_INDEX[opt.status] ?? 0;
                            const isSelected = optIdx === effIdx;
                            const isPast = optIdx < effIdx;
                            const isForward = optIdx > effIdx;
                            const canClick =
                              !isTerminal && !isBusyItem && !markingAll && !updatingOrder && isForward;
                            const Icon = isPast ? Check : opt.Icon;

                            return (
                              <button
                                key={opt.status}
                                type="button"
                                disabled={!canClick}
                                onClick={() => canClick && handleSelectItemStatus(idx, opt.status)}
                                title={
                                  canClick
                                    ? `เลื่อนเป็น "${opt.label}"`
                                    : isSelected
                                    ? `สถานะปัจจุบัน: ${opt.label}`
                                    : `ผ่านขั้นตอน "${opt.label}" แล้ว (ห้ามย้อนกลับ)`
                                }
                                className={`flex flex-col items-center gap-0.5 min-w-[44px] py-1 px-1 rounded-xl transition ${
                                  canClick
                                    ? 'cursor-pointer hover:scale-105 active:scale-95'
                                    : 'cursor-not-allowed pointer-events-none'
                                }`}
                              >
                                <span
                                  className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                                    isSelected
                                      ? opt.activeClass
                                      : isPast
                                      ? 'bg-emerald-500 text-white border-emerald-500 opacity-80'
                                      : canClick
                                      ? opt.idleClass
                                      : 'bg-stone-100 text-stone-300 border-stone-200 opacity-60'
                                  }`}
                                >
                                  <Icon className="w-4 h-4" />
                                </span>
                                <span
                                  className={`text-[9px] font-bold leading-none ${
                                    isSelected
                                      ? 'text-stone-900 font-black'
                                      : isPast
                                      ? 'text-emerald-700'
                                      : canClick
                                      ? 'text-stone-600'
                                      : 'text-stone-300'
                                  }`}
                                >
                                  {opt.shortLabel}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Inline Stock-Out Cancellation Box */}
                    {isCancellingThis && !isItemCancelled && (
                      <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl space-y-2 text-xs text-rose-950 animate-fadeIn">
                        <div className="font-black text-rose-900">
                          ยืนยันยกเลิกเมนู "{item.name}" และหักยอด ฿{(item.price * item.quantity).toLocaleString()}?
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {STOCKOUT_CANCEL_REASONS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setCancelReason(preset)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                                cancelReason === preset
                                  ? 'bg-rose-600 text-white border-rose-700'
                                  : 'bg-white text-rose-900 border-rose-200 hover:bg-rose-100'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>

                        <input
                          type="text"
                          value={cancelReason}
                          onChange={(e) => setCancelReason(e.target.value)}
                          placeholder="ระบุเหตุผลเพิ่มเติม..."
                          className="w-full px-3 py-1.5 bg-white border border-rose-300 rounded-xl text-xs focus:outline-none focus:border-rose-500"
                        />

                        <label className="flex items-center gap-2 text-[11px] font-bold text-rose-900 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={markMenuUnavailable}
                            onChange={(e) => setMarkMenuUnavailable(e.target.checked)}
                            className="w-4 h-4 rounded accent-rose-600"
                          />
                          <span>ปิดขายเมนูนี้หน้าเว็บทันที (ตั้งเป็น "สินค้าหมด")</span>
                        </label>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setCancellingItemIdx(null)}
                            disabled={isCancellingItem}
                            className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmCancelItem(idx)}
                            disabled={isCancellingItem}
                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shadow-xs disabled:bg-stone-300"
                          >
                            {isCancellingItem && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>ยืนยันตัดรายการนี้</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-white border-t border-stone-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>

          {!isTerminal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCheckBill(order);
              }}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs sm:text-sm font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              <span>💰 เช็คบิล (สรุปยอด &amp; เพิ่มรายการ)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
