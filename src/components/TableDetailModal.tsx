import React, { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Plus,
  Printer,
  Search,
  Timer,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';
import { MenuItem, Order, OrderItemStatus, OrderStatus, RestaurantTable } from '../types';
import {
  ITEM_STEP_INDEX,
  adjustOrderPrepTime,
  appendItemsToOrder,
  cancelOrderItem,
  getCategoryPriorityIndex,
  getEffectiveItemStatus,
  getOrderCompletionSummary,
  markAllOrderItemsStatus,
  normalizeMenuImageUrl,
  normalizeOrderStatus,
  updateOrderItemStatus,
  updateOrderStatus,
  updateTableStatus,
} from '../services/menuService';
import {
  DEFAULT_SHOP_PREP_MINUTES,
  STOCKOUT_CANCEL_REASONS,
  getOrderTimingMetrics,
  isOrderItemCancelled,
  resolveMenuPrepTimeMinutes,
} from '../utils/orderPrepUtils';
import { audioAlert } from '../utils/audioAlert';
import {
  CircularStatusStepper,
  ITEM_STATUS_CIRCLES,
} from './CircularStatusStepper';
import { formatOrderTime } from './AdminOrdersManager';

interface TableDetailModalProps {
  isOpen: boolean;
  table: RestaurantTable | null;
  tableOrders: Order[];
  menus: MenuItem[];
  defaultPrepTimeMinutes?: number;
  onClose: () => void;
  onOpenCreateOrderForTable: (tableNumber: number) => void;
  onOpenCheckBill: (order: Order) => void;
  onPrintOrder: (order: Order) => void;
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const TableDetailModal: React.FC<TableDetailModalProps> = ({
  isOpen,
  table,
  tableOrders,
  menus,
  defaultPrepTimeMinutes = DEFAULT_SHOP_PREP_MINUTES,
  onClose,
  onOpenCreateOrderForTable,
  onOpenCheckBill,
  onPrintOrder,
  onNotify,
}) => {
  const [togglingTable, setTogglingTable] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [updatingItemKey, setUpdatingItemKey] = useState<string | null>(null);
  const [addingForOrderId, setAddingForOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [pendingAppends, setPendingAppends] = useState<Record<string, number>>({});
  const [isSavingAppend, setIsSavingAppend] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [adjustingPrepOrderId, setAdjustingPrepOrderId] = useState<string | null>(null);
  const [cancellingKey, setCancellingKey] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>(STOCKOUT_CANCEL_REASONS[0]);
  const [markMenuUnavailable, setMarkMenuUnavailable] = useState(true);
  const [isCancellingItem, setIsCancellingItem] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCancellingKey(null);
      return;
    }
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, [isOpen, table?.id]);

  const categories = useMemo(
    () =>
      Array.from(new Set(menus.map((m) => m.category)))
        .filter(Boolean)
        .sort((a, b) => getCategoryPriorityIndex(a) - getCategoryPriorityIndex(b)),
    [menus]
  );

  const filteredMenus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menus.filter((m) => {
      const matchCat = selectedCategory === 'ทั้งหมด' || m.category === selectedCategory;
      const matchSearch = !q || m.name.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [menus, selectedCategory, searchQuery]);

  if (!isOpen || !table) return null;

  const isOccupied = table.isOccupied || tableOrders.length > 0;

  const handleToggleTableOccupied = async () => {
    try {
      setTogglingTable(true);
      const next = !table.isOccupied;
      await updateTableStatus(table.id, next, 'manual');
      onNotify(
        next
          ? `🔴 ตั้งค่า "${table.name}" เป็นโต๊ะเต็มเรียบร้อย`
          : `🟢 คืนสถานะ "${table.name}" เป็นโต๊ะว่างเรียบร้อย`,
        next ? 'info' : 'success'
      );
    } catch {
      onNotify('ไม่สามารถเปลี่ยนสถานะโต๊ะได้', 'error');
    } finally {
      setTogglingTable(false);
    }
  };

  const handleStepOrderStatus = async (order: Order, nextStatus: OrderStatus) => {
    try {
      setUpdatingOrderId(order.id);
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
      onNotify(`✅ อัปเดตสถานะออเดอร์ #${order.orderNumber} เป็น "${nextStatus}" แล้ว`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยนสถานะได้';
      onNotify(msg, 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleUpdateItemStatus = async (
    order: Order,
    itemIndex: number,
    nextStatus: OrderItemStatus
  ) => {
    const normOrd = normalizeOrderStatus(order.status);
    if (normOrd === 'เช็คบิล' || normOrd === 'ยกเลิก' || order.isCancelled) return;

    const key = `${order.id}_${itemIndex}`;
    const targetItem = order.items[itemIndex];
    if (!targetItem) return;

    try {
      setUpdatingItemKey(key);
      const result = await updateOrderItemStatus(order, itemIndex, nextStatus);
      const updatedSummary = getOrderCompletionSummary({
        ...order,
        items: result.items,
        status: result.nextOrderStatus,
      });

      audioAlert.playItemStatusAlert({
        order: {
          customerName: order.customerName,
          tableNumber: order.tableNumber ?? table.number,
          deliveryType: order.deliveryType,
          orderNumber: order.orderNumber,
          status: result.nextOrderStatus,
        },
        itemName: targetItem.name,
        itemQuantity: targetItem.quantity,
        itemStatus: nextStatus,
        isAllCompleted: updatedSummary.isAllCompleted,
        completedLines: updatedSummary.completedLines,
        totalLines: updatedSummary.totalLines,
      });

      const statusLabel = nextStatus === 'เสิร์ฟแล้ว' ? 'ได้รับครบแล้ว' : nextStatus;
      onNotify(
        result.didAdvanceOrderStatus
          ? `อัปเดต "${targetItem.name}" เป็น "${statusLabel}" • ออเดอร์หลักขยับเป็น "${result.nextOrderStatus}" แล้ว`
          : `อัปเดต "${targetItem.name}" เป็น "${statusLabel}"`,
        'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถอัปเดตสถานะรายการได้';
      onNotify(msg, 'error');
    } finally {
      setUpdatingItemKey(null);
    }
  };

  const handleMarkAllItemsServed = async (order: Order) => {
    const normOrd = normalizeOrderStatus(order.status);
    if (normOrd === 'เช็คบิล' || normOrd === 'ยกเลิก' || order.isCancelled) return;

    try {
      setUpdatingOrderId(order.id);
      const result = await markAllOrderItemsStatus(order, 'เสิร์ฟแล้ว');

      audioAlert.playAllItemsCompletedAlert(
        {
          customerName: order.customerName,
          tableNumber: order.tableNumber ?? table.number,
          deliveryType: order.deliveryType,
          orderNumber: order.orderNumber,
          status: result.nextOrderStatus,
        },
        result.items.length
      );

      onNotify(
        result.didAdvanceOrderStatus
          ? `✅ ติ๊กเสิร์ฟครบทุกรายการแล้ว • ออเดอร์ #${order.orderNumber} ขยับเป็น "${result.nextOrderStatus}" อัตโนมัติ`
          : `✅ ติ๊กเสิร์ฟครบทุกรายการในออเดอร์ #${order.orderNumber} แล้ว`,
        'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถอัปเดตรายการทั้งหมดได้';
      onNotify(msg, 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleAdjustAppendQty = (menuId: string, delta: number) => {
    setPendingAppends((prev) => {
      const next = (prev[menuId] || 0) + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[menuId];
        return copy;
      }
      return { ...prev, [menuId]: next };
    });
  };

  const handleAdjustPrepTime = async (ord: Order, nextMinutes: number) => {
    const safeMin = Math.max(2, Math.min(180, nextMinutes));
    try {
      setAdjustingPrepOrderId(ord.id);
      await adjustOrderPrepTime(ord.id, safeMin);
      onNotify(`⏱️ ปรับเป้าเวลา #${ord.orderNumber} เป็น ~${safeMin} นาที`, 'info');
    } catch {
      onNotify('ไม่สามารถปรับเวลาเตรียมอาหารได้', 'error');
    } finally {
      setAdjustingPrepOrderId(null);
    }
  };

  const handleConfirmCancelItem = async (order: Order, itemIndex: number) => {
    const targetItem = order.items[itemIndex];
    if (!targetItem || isOrderItemCancelled(targetItem) || isCancellingItem) return;

    try {
      setIsCancellingItem(true);
      const res = await cancelOrderItem({
        order,
        itemIndex,
        reason: cancelReason,
        markMenuUnavailable,
      });

      audioAlert.playItemCancelledAlert({
        order: {
          customerName: order.customerName,
          tableNumber: order.tableNumber ?? table.number,
          deliveryType: order.deliveryType,
          orderNumber: order.orderNumber,
          status: res.nextOrderStatus,
        },
        itemName: res.cancelledItemName,
        reason: cancelReason,
        isWholeOrderCancelled: res.isWholeOrderCancelled,
      });

      onNotify(
        res.isWholeOrderCancelled
          ? `❌ ยกเลิก "${res.cancelledItemName}" — ไม่มีรายการเหลือ ออเดอร์ #${order.orderNumber} ถูกยกเลิกและคืนโต๊ะแล้ว`
          : `ตัดยอด "${res.cancelledItemName}" ออกแล้ว (${cancelReason}) • ยอดใหม่ ฿${res.newTotal.toLocaleString()}`,
        res.isWholeOrderCancelled ? 'info' : 'success'
      );
      setCancellingKey(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถยกเลิกรายการได้';
      onNotify(msg, 'error');
    } finally {
      setIsCancellingItem(false);
    }
  };

  const handleSaveAppendedItems = async (order: Order) => {
    const entries = Object.entries(pendingAppends)
      .map(([menuId, quantity]) => {
        const menu = menus.find((m) => m.id === menuId);
        if (!menu) return null;
        return {
          menuId: menu.id,
          name: menu.name,
          price: menu.price,
          quantity,
          prepTimeMinutes: resolveMenuPrepTimeMinutes(menu, defaultPrepTimeMinutes),
        };
      })
      .filter(Boolean) as Array<{
      menuId: string;
      name: string;
      price: number;
      quantity: number;
      prepTimeMinutes: number;
    }>;

    if (entries.length === 0) {
      onNotify('กรุณาเลือกเมนูที่ต้องการเพิ่มลงโต๊ะนี้', 'error');
      return;
    }

    try {
      setIsSavingAppend(true);
      await appendItemsToOrder(order.id, entries, `เพิ่มจากหน้าจัดการ${table.name}`);
      audioAlert.playOrderStatusAlert(
        {
          customerName: order.customerName,
          tableNumber: table.number,
          deliveryType: 'มาทานที่ร้าน',
          orderNumber: order.orderNumber,
          status: 'รับออเดอร์',
          items: entries,
        },
        'รับออเดอร์'
      );
      onNotify(`✅ เพิ่มเมนูลง ${table.name} (#${order.orderNumber}) เรียบร้อย`, 'success');
      setPendingAppends({});
      setAddingForOrderId(null);
    } catch {
      onNotify('ไม่สามารถเพิ่มรายการลงออเดอร์ได้', 'error');
    } finally {
      setIsSavingAppend(false);
    }
  };

  const pendingAppendCount = Object.values(pendingAppends).reduce((s, q) => s + q, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[93vh] text-stone-900">
        {/* Header */}
        <div
          className={`p-4 sm:p-5 text-white flex items-center justify-between gap-2 shrink-0 ${
            isOccupied
              ? 'bg-gradient-to-r from-red-700 via-rose-700 to-red-800'
              : 'bg-gradient-to-r from-emerald-700 via-green-700 to-teal-700'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-xl shrink-0">
              🍽️
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black tracking-tight">{table.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-white text-stone-900 shadow-2xs">
                  {isOccupied ? '🔴 มีลูกค้า / โต๊ะเต็ม' : '🟢 โต๊ะว่าง'}
                </span>
              </div>
              <p className="text-xs text-white/85 truncate mt-0.5">
                {tableOrders.length > 0
                  ? `กำลังเปิดอยู่ ${tableOrders.length} ออเดอร์ • จัดการเมนูและสถานะได้ทันที`
                  : 'พร้อมรับลูกค้า • กดเปิดบิลหรือสลับสถานะโต๊ะได้เลย'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Quick Table Controls Bar */}
        <div className="px-4 py-2.5 bg-stone-100 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            disabled={togglingTable}
            onClick={handleToggleTableOccupied}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              table.isOccupied
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {togglingTable && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>
              {table.isOccupied ? '🟢 เปลี่ยนเป็น: โต๊ะว่าง' : '🔴 ตั้งค่าเป็น: โต๊ะเต็ม'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCreateOrderForTable(table.number);
            }}
            className="px-3.5 py-2 bg-stone-900 hover:bg-black text-amber-300 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
            <span>เปิดออเดอร์ใหม่ให้{table.name}</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-5 space-y-4 bg-stone-50/70 min-w-0">
          {tableOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <Utensils className="w-7 h-7" />
              </div>
              <div>
                <div className="text-base font-black text-stone-900">{table.name} ยังไม่มีออเดอร์</div>
                <p className="text-xs text-stone-500 mt-1">
                  กดปุ่มด้านล่างเพื่อคีย์รายการอาหารให้{table.name} หรือให้ลูกค้าสแกน QR ที่โต๊ะได้เลย
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateOrderForTable(table.number);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>➕ คีย์สั่งอาหารเปิด{table.name}</span>
              </button>
            </div>
          ) : (
            tableOrders.map((ord) => {
              const normStatus = normalizeOrderStatus(ord.status);
              const summary = getOrderCompletionSummary(ord);
              const isAddingThis = addingForOrderId === ord.id;
              const timing = getOrderTimingMetrics(ord, nowMs, menus, defaultPrepTimeMinutes);

              return (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl border-2 border-stone-200 shadow-xs overflow-hidden space-y-3 p-4"
                >
                  {/* Order Top Summary */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-stone-100 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-red-600 text-sm">
                          #{ord.orderNumber}
                        </span>
                        <span className="text-xs font-bold text-stone-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatOrderTime(ord.createdAt)}</span>
                        </span>
                        {timing.targetMinutes > 0 && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black border inline-flex items-center gap-1 ${
                              timing.speedState === 'overdue'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : timing.speedState === 'warning'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            <Timer className="w-3 h-3" />
                            <span>
                              {timing.speedState === 'overdue'
                                ? `ล่าช้า +${timing.overdueMinutes} น.`
                                : timing.speedState === 'warning'
                                ? `เหลือ ${Math.max(0, timing.remainingMinutes)} น.`
                                : `เป้า ~${timing.targetMinutes} น.`}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-stone-700 mt-0.5">
                        {ord.customerName || table.name}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-red-600 tabular-nums">
                        ฿{ord.totalAmount.toLocaleString()}
                      </div>
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {!timing.isFinished && (
                          <>
                            <button
                              type="button"
                              disabled={adjustingPrepOrderId === ord.id || timing.targetMinutes <= 2}
                              onClick={() => handleAdjustPrepTime(ord, timing.targetMinutes - 2)}
                              className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-black cursor-pointer disabled:opacity-40"
                            >
                              -2น.
                            </button>
                            <button
                              type="button"
                              disabled={adjustingPrepOrderId === ord.id}
                              onClick={() => handleAdjustPrepTime(ord, timing.targetMinutes + 2)}
                              className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-black cursor-pointer disabled:opacity-40"
                            >
                              +2น.
                            </button>
                          </>
                        )}
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            summary.isAllCompleted
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          {summary.isAllCompleted
                            ? `✅ ครบแล้ว (${summary.completedLines}/${summary.totalLines})`
                            : `⏳ ได้ ${summary.completedLines}/${summary.totalLines} รายการ`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Circular Order Status Stepper */}
                  <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <span className="text-[11px] font-black text-stone-600">
                        สถานะออเดอร์รวม (ขยับตามรายเมนูอัตโนมัติ):
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white text-stone-700 border border-stone-200 text-[10px] font-black">
                        {normStatus}
                      </span>
                    </div>
                    <CircularStatusStepper
                      currentStatus={normStatus}
                      interactive
                      disabled={updatingOrderId === ord.id}
                      onSelectStep={(st) => handleStepOrderStatus(ord, st)}
                      showCheckoutCircle
                      onSelectCheckout={() => {
                        onClose();
                        onOpenCheckBill(ord);
                      }}
                    />
                  </div>

                  {/* Per-item list with Circular Status controls */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-stone-800">
                        รายการอาหารในโต๊ะ ({ord.items.length} รายการ):
                      </span>
                      <div className="flex items-center gap-1.5">
                        {!summary.isAllCompleted && (
                          <button
                            type="button"
                            onClick={() => handleMarkAllItemsServed(ord)}
                            disabled={updatingOrderId === ord.id}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>ครบทุกรายการ</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (isAddingThis) {
                              setAddingForOrderId(null);
                              setPendingAppends({});
                            } else {
                              setAddingForOrderId(ord.id);
                              setPendingAppends({});
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer transition ${
                            isAddingThis
                              ? 'bg-amber-400 text-stone-950'
                              : 'bg-stone-900 text-amber-300 hover:bg-black'
                          }`}
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                          <span>เพิ่มเมนู</span>
                          {isAddingThis ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Inline Add Menu Picker for this table order */}
                    {isAddingThis && (
                      <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 space-y-2.5 animate-fadeIn">
                        <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                          <div className="w-full sm:w-auto min-w-0 flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
                            <button
                              type="button"
                              onClick={() => setSelectedCategory('ทั้งหมด')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                                selectedCategory === 'ทั้งหมด'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-white text-stone-700 border border-stone-200'
                              }`}
                            >
                              ทั้งหมด
                            </button>
                            {categories.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setSelectedCategory(c)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                                  selectedCategory === c
                                    ? 'bg-red-600 text-white'
                                    : 'bg-white text-stone-700 border border-stone-200'
                                }`}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                          <div className="relative flex-1 min-w-0">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="ค้นหาเมนู..."
                              className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-stone-200 rounded-xl text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
                          {filteredMenus.map((m) => {
                            const qty = pendingAppends[m.id] || 0;
                            return (
                              <div
                                key={m.id}
                                className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                                  qty > 0
                                    ? 'bg-amber-100/70 border-amber-400'
                                    : 'bg-white border-stone-200'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={normalizeMenuImageUrl(m.imageUrl, m.name)}
                                    alt={m.name}
                                    className="w-8 h-8 rounded-lg object-cover bg-stone-100 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold truncate">{m.name}</div>
                                    <div className="text-[11px] font-black text-red-600">฿{m.price}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {qty > 0 ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleAdjustAppendQty(m.id, -1)}
                                        className="w-7 h-7 rounded-lg bg-white border border-stone-300 font-black text-xs cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <span className="w-5 text-center text-xs font-black">{qty}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleAdjustAppendQty(m.id, 1)}
                                        className="w-7 h-7 rounded-lg bg-amber-500 text-stone-950 font-black text-xs cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustAppendQty(m.id, 1)}
                                      className="px-2.5 py-1 bg-stone-100 hover:bg-red-600 hover:text-white rounded-lg text-[11px] font-bold cursor-pointer"
                                    >
                                      + เพิ่ม
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {pendingAppendCount > 0 && (
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              disabled={isSavingAppend}
                              onClick={() => handleSaveAppendedItems(ord)}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              {isSavingAppend ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              )}
                              <span>บันทึกเพิ่ม {pendingAppendCount} รายการลง{table.name}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Dish rows */}
                    <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden">
                      {ord.items.map((it, idx) => {
                        const isItemCancelled = isOrderItemCancelled(it);
                        const effStatus = getEffectiveItemStatus(it, normStatus);
                        const itemKey = `${ord.id}_${idx}`;
                        const isBusy = updatingItemKey === itemKey;
                        const isCancellingThis = cancellingKey === itemKey;
                        const isOrderTerminal =
                          normStatus === 'เช็คบิล' || normStatus === 'ยกเลิก' || Boolean(ord.isCancelled);

                        return (
                          <div
                            key={`${it.menuId}_${idx}`}
                            className={`p-3 space-y-2 ${
                              isItemCancelled
                                ? 'bg-rose-50/70 opacity-80'
                                : effStatus === 'เสิร์ฟแล้ว'
                                ? 'bg-emerald-50/40'
                                : 'bg-white'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 tabular-nums ${
                                    isItemCancelled
                                      ? 'bg-rose-200 text-rose-800'
                                      : effStatus === 'เสิร์ฟแล้ว'
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  ×{it.quantity}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`text-xs sm:text-sm font-bold truncate ${
                                        isItemCancelled ? 'line-through text-stone-500' : 'text-stone-900'
                                      }`}
                                    >
                                      {it.name}
                                    </span>
                                    {isItemCancelled ? (
                                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black">
                                        ของหมด / ยกเลิกแล้ว
                                      </span>
                                    ) : (
                                      !isOrderTerminal && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (isCancellingThis) {
                                              setCancellingKey(null);
                                            } else {
                                              setCancellingKey(itemKey);
                                              setCancelReason(STOCKOUT_CANCEL_REASONS[0]);
                                              setMarkMenuUnavailable(true);
                                            }
                                          }}
                                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold cursor-pointer"
                                        >
                                          <Ban className="w-2.5 h-2.5" />
                                          <span>ของหมด/ยกเลิก</span>
                                        </button>
                                      )
                                    )}
                                  </div>
                                  <div className="text-[11px] text-stone-500 tabular-nums">
                                    {isItemCancelled ? (
                                      <span className="text-rose-700 font-bold">
                                        ฿0 (ตัดยอดแล้ว{it.cancelReason ? ` • ${it.cancelReason}` : ''})
                                      </span>
                                    ) : (
                                      <>
                                        ฿{(it.price * it.quantity).toLocaleString()} •{' '}
                                        <span className="font-bold text-stone-700">
                                          {effStatus === 'เสิร์ฟแล้ว' ? '✓ ได้รับครบแล้ว' : effStatus}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {!isItemCancelled && (
                                <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                                  {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600 mr-1" />}
                                  {ITEM_STATUS_CIRCLES.map((opt) => {
                                    const effIdx = ITEM_STEP_INDEX[effStatus] ?? 0;
                                    const optIdx = ITEM_STEP_INDEX[opt.status] ?? 0;
                                    const active = optIdx === effIdx;
                                    const isPast = optIdx < effIdx;
                                    const isForward = optIdx > effIdx;
                                    const canClick =
                                      !isOrderTerminal &&
                                      !isBusy &&
                                      updatingOrderId !== ord.id &&
                                      isForward;
                                    const Icon = isPast ? Check : opt.Icon;
                                    return (
                                      <button
                                        key={opt.status}
                                        type="button"
                                        disabled={!canClick}
                                        onClick={() => canClick && handleUpdateItemStatus(ord, idx, opt.status)}
                                        title={
                                          canClick
                                            ? `เลื่อนเป็น "${opt.label}"`
                                            : active
                                            ? `สถานะปัจจุบัน: ${opt.label}`
                                            : `ผ่านขั้นตอน "${opt.label}" แล้ว (ห้ามย้อนกลับ)`
                                        }
                                        className={`flex flex-col items-center gap-0.5 min-w-[40px] py-0.5 rounded-lg transition ${
                                          canClick
                                            ? 'cursor-pointer hover:scale-105 active:scale-95'
                                            : 'cursor-not-allowed pointer-events-none'
                                        }`}
                                      >
                                        <span
                                          className={`w-8 h-8 rounded-full border flex items-center justify-center transition ${
                                            active
                                              ? opt.activeClass
                                              : isPast
                                              ? 'bg-emerald-500 text-white border-emerald-500 opacity-80'
                                              : canClick
                                              ? opt.idleClass
                                              : 'bg-stone-100 text-stone-300 border-stone-200 opacity-60'
                                          }`}
                                        >
                                          <Icon className="w-3.5 h-3.5" />
                                        </span>
                                        <span
                                          className={`text-[9px] font-bold ${
                                            active
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

                            {isCancellingThis && !isItemCancelled && (
                              <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl space-y-2 text-xs text-rose-950 animate-fadeIn">
                                <div className="font-black text-rose-900">
                                  ยืนยันยกเลิกเมนู "{it.name}" (หัก ฿{(it.price * it.quantity).toLocaleString()})
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {STOCKOUT_CANCEL_REASONS.map((preset) => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => setCancelReason(preset)}
                                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                                        cancelReason === preset
                                          ? 'bg-rose-600 text-white border-rose-700'
                                          : 'bg-white text-rose-900 border-rose-200'
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
                                  className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded-lg text-xs"
                                  placeholder="ระบุเหตุผล..."
                                />
                                <label className="flex items-center gap-1.5 text-[11px] font-bold text-rose-900 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={markMenuUnavailable}
                                    onChange={(e) => setMarkMenuUnavailable(e.target.checked)}
                                    className="w-3.5 h-3.5 accent-rose-600"
                                  />
                                  <span>ปิดขายเมนูนี้หน้าเว็บทันที (ตั้งเป็นสินค้าหมด)</span>
                                </label>
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setCancellingKey(null)}
                                    disabled={isCancellingItem}
                                    className="px-2.5 py-1 bg-white border border-stone-300 text-stone-700 rounded-lg text-[11px] font-bold cursor-pointer"
                                  >
                                    กลับ
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleConfirmCancelItem(ord, idx)}
                                    disabled={isCancellingItem}
                                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                  >
                                    {isCancellingItem && <Loader2 className="w-3 h-3 animate-spin" />}
                                    <span>ยืนยันตัดรายการ</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Buttons for this Table Order */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onPrintOrder(ord);
                      }}
                      className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>พิมพ์บิล</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCheckBill(ord);
                      }}
                      className="flex-1 py-2.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Wallet className="w-4 h-4" />
                      <span>💰 เช็คบิล &amp; ปิด{table.name}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-white border-t border-stone-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
