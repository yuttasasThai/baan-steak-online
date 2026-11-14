import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  DollarSign,
  Download,
  Eye,
  FileSpreadsheet,
  Flame,
  PackageCheck,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
  X,
} from 'lucide-react';
import { DailyExpenseRecord, MenuItem, Order } from '../types';
import { formatOrderTime } from './AdminOrdersManager';
import { formatDateKeyToThai, normalizeOrderStatus } from '../services/menuService';

interface AdminSalesAnalyticsProps {
  orders: Order[];
  menus?: MenuItem[];
  dailyExpenses?: DailyExpenseRecord[];
}

type TimeRange = 'today' | '7days' | 'month' | 'all';

export function getLocalDateKey(isoString?: string): string {
  if (!isoString) return 'ไม่ระบุวันที่';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'ไม่ระบุวันที่';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function isDateKeyInRange(dateKey: string, timeRange: TimeRange): boolean {
  if (timeRange === 'all') return true;
  const parts = dateKey.split('-');
  if (parts.length !== 3) return false;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
  if (isNaN(d)) return false;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (timeRange === 'today') return d >= startOfToday;
  if (timeRange === '7days') return d >= startOfToday - 6 * 24 * 60 * 60 * 1000;
  if (timeRange === 'month') return d >= new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return true;
}

export function computeOrderMenuCost(
  order: Order,
  costById: Map<string, number>,
  costByName: Map<string, number>
): number {
  if (!order.items || order.items.length === 0) return 0;
  return order.items.reduce((sum, item) => {
    const unitCost =
      (item.menuId ? costById.get(item.menuId) : undefined) ??
      costByName.get((item.name || '').trim()) ??
      0;
    return sum + unitCost * (item.quantity || 1);
  }, 0);
}

interface DailyOrdersPopupModalProps {
  dateKey: string | null;
  orders: Order[];
  menus?: MenuItem[];
  dailyExpenses?: DailyExpenseRecord[];
  onClose: () => void;
}

export const DailyOrdersPopupModal: React.FC<DailyOrdersPopupModalProps> = ({
  dateKey,
  orders,
  menus = [],
  dailyExpenses = [],
  onClose,
}) => {
  const { costById, costByName } = useMemo(() => {
    const idMap = new Map<string, number>();
    const nameMap = new Map<string, number>();
    menus.forEach((m) => {
      const c = Math.max(0, Number(m.cost) || 0);
      if (m.id) idMap.set(m.id, c);
      if (m.name) nameMap.set(m.name.trim(), c);
    });
    return { costById: idMap, costByName: nameMap };
  }, [menus]);

  const dayOrders = useMemo(() => {
    if (!dateKey) return [];
    return orders
      .filter((o) => {
        const st = normalizeOrderStatus(o.status);
        if (o.isCancelled || st === 'ยกเลิก') return false;
        if (st !== 'ส่งแล้ว' && st !== 'เช็คบิล') return false;
        return getLocalDateKey(o.createdAt) === dateKey;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [dateKey, orders]);

  if (!dateKey) return null;

  const thaiDateLabel = formatDateKeyToThai(dateKey);
  const totalFoodSubtotal = dayOrders.reduce((s, o) => s + (o.subtotal || 0), 0);
  const totalDeliveryFee = dayOrders.reduce((s, o) => s + (o.deliveryFee || 0), 0);
  const totalSales = dayOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalMenuCost = dayOrders.reduce(
    (s, o) => s + computeOrderMenuCost(o, costById, costByName),
    0
  );
  const expenseRec = dailyExpenses.find((e) => e.dateKey === dateKey);
  const dailyExpense = expenseRec?.totalExpense || 0;
  const totalOutflow = totalMenuCost + dailyExpense;
  const netProfit = totalSales - totalOutflow;

  const formatDiningLabel = (order: Order) => {
    if (order.deliveryType === 'มาทานที่ร้าน') {
      return order.tableNumber ? `ทานร้าน โต๊ะ ${order.tableNumber}` : 'ทานที่ร้าน';
    }
    if (order.deliveryType === 'สั่งกลับบ้าน') {
      return order.tableNumber ? `กลับบ้าน (โต๊ะ ${order.tableNumber})` : 'สั่งกลับบ้าน';
    }
    if (order.deliveryType === 'นัดรับอาหาร') return 'นัดรับอาหาร';
    return 'ส่งอาหารที่บ้าน';
  };

  const handleExportDayExcelCsv = () => {
    const header = [
      'ลำดับ',
      'เลขออเดอร์',
      'เวลาสั่ง',
      'รูปแบบ',
      'ชื่อลูกค้า/โต๊ะ',
      'เบอร์โทร',
      'รายการอาหาร',
      'ค่าอาหาร (บาท)',
      'ค่าส่ง (บาท)',
      'ยอดรวม (บาท)',
      'ต้นทุนเมนู (บาท)',
      'สถานะ',
    ];
    const rows = dayOrders.map((order, idx) => {
      const ordCost = computeOrderMenuCost(order, costById, costByName);
      const st = normalizeOrderStatus(order.status);
      const itemsText = (order.items || [])
        .map((it) => `${it.name} x${it.quantity}`)
        .join(', ')
        .replace(/"/g, '""');
      return [
        idx + 1,
        `"#${order.orderNumber}"`,
        `"${formatOrderTime(order.createdAt)}"`,
        `"${formatDiningLabel(order)}"`,
        `"${(order.customerName || 'ไม่ระบุ').replace(/"/g, '""')}"`,
        `"${order.customerPhone || '-'}"`,
        `"${itemsText}"`,
        order.subtotal || 0,
        order.deliveryFee || 0,
        order.totalAmount || 0,
        ordCost,
        `"${st}"`,
      ].join(',');
    });

    const totalRow = [
      'รวมทั้งหมด',
      `${dayOrders.length} บิล`,
      '',
      '',
      '',
      '',
      '',
      totalFoodSubtotal,
      totalDeliveryFee,
      totalSales,
      totalMenuCost,
      '',
    ].join(',');

    const csvContent = '\uFEFF' + [header.join(','), ...rows, totalRow].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `baan-steak-orders-${dateKey}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/65 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-300 overflow-hidden">
        {/* Excel-style Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-[#107C41] text-white flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200 shrink-0" />
              <h3 className="text-sm sm:text-lg font-extrabold truncate">
                ตารางออเดอร์ประจำวันที่ {thaiDateLabel}
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-100 mt-0.5 font-mono">
              {dateKey} • รวม {dayOrders.length} บิล (สถานะส่งแล้ว / เช็คบิลแล้ว)
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {dayOrders.length > 0 && (
              <button
                type="button"
                onClick={handleExportDayExcelCsv}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                title="ส่งออกตารางออเดอร์วันนี้เป็นไฟล์ Excel (.csv)"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ส่งออก Excel (.csv)</span>
                <span className="sm:hidden">Excel</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer shrink-0"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 sm:px-5 py-2.5 bg-stone-50 border-b border-stone-300 text-xs">
          <div className="bg-white px-3 py-2 rounded-xl border border-stone-200">
            <div className="text-stone-500 font-semibold">ยอดขายรวม</div>
            <div className="text-base font-black text-emerald-700 font-mono tabular-nums mt-0.5">
              ฿{totalSales.toLocaleString()}
            </div>
          </div>
          <div className="bg-white px-3 py-2 rounded-xl border border-stone-200">
            <div className="text-stone-500 font-semibold">ต้นทุนเมนูรวม</div>
            <div className="text-base font-black text-amber-700 font-mono tabular-nums mt-0.5">
              ฿{totalMenuCost.toLocaleString()}
            </div>
          </div>
          <div className="bg-white px-3 py-2 rounded-xl border border-stone-200">
            <div className="text-stone-500 font-semibold">รายจ่ายประจำวัน</div>
            <div className="text-base font-black text-orange-600 font-mono tabular-nums mt-0.5">
              ฿{dailyExpense.toLocaleString()}
            </div>
          </div>
          <div className="bg-white px-3 py-2 rounded-xl border border-stone-200">
            <div className="text-stone-500 font-semibold">กำไรสุทธิ</div>
            <div
              className={`text-base font-black font-mono tabular-nums mt-0.5 ${
                netProfit >= 0 ? 'text-blue-700' : 'text-rose-600'
              }`}
            >
              {netProfit >= 0 ? '+' : ''}฿{netProfit.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Excel Spreadsheet Grid */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 bg-stone-100/70">
          {dayOrders.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-stone-500 bg-white rounded-2xl border border-stone-200">
              <ShoppingBag className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="font-bold text-sm text-stone-700">
                ไม่มีออเดอร์สถานะ "ส่งแล้ว" หรือ "เช็คบิล" ในวันที่ {thaiDateLabel}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-stone-400 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    {/* Excel Column Letters */}
                    <tr className="bg-stone-200 text-stone-600 font-mono text-[10px] text-center border-b border-stone-300">
                      <th className="py-1 px-2 border-r border-stone-300 w-9"></th>
                      <th className="py-1 px-2 border-r border-stone-300">A</th>
                      <th className="py-1 px-2 border-r border-stone-300">B</th>
                      <th className="py-1 px-2 border-r border-stone-300">C</th>
                      <th className="py-1 px-2 border-r border-stone-300">D</th>
                      <th className="py-1 px-2 border-r border-stone-300">E</th>
                      <th className="py-1 px-2 border-r border-stone-300">F</th>
                      <th className="py-1 px-2 border-r border-stone-300">G</th>
                      <th className="py-1 px-2 border-r border-stone-300">H</th>
                      <th className="py-1 px-2">I</th>
                    </tr>
                    {/* Excel Column Headers */}
                    <tr className="bg-[#107C41] text-white text-left whitespace-nowrap">
                      <th className="py-2 px-2 text-center font-mono border-r border-emerald-800">#</th>
                      <th className="py-2 px-2.5 font-bold border-r border-emerald-800">
                        เลขออเดอร์ / เวลา
                      </th>
                      <th className="py-2 px-2.5 font-bold border-r border-emerald-800">รูปแบบ</th>
                      <th className="py-2 px-2.5 font-bold border-r border-emerald-800">
                        ลูกค้า / โทร
                      </th>
                      <th className="py-2 px-2.5 font-bold border-r border-emerald-800 min-w-[200px]">
                        รายการอาหาร
                      </th>
                      <th className="py-2 px-2.5 font-bold text-right border-r border-emerald-800">
                        ค่าอาหาร
                      </th>
                      <th className="py-2 px-2.5 font-bold text-right border-r border-emerald-800">
                        ค่าส่ง
                      </th>
                      <th className="py-2 px-2.5 font-bold text-right border-r border-emerald-800">
                        ยอดรวม
                      </th>
                      <th className="py-2 px-2.5 font-bold text-right border-r border-emerald-800">
                        ต้นทุนเมนู
                      </th>
                      <th className="py-2 px-2.5 font-bold text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-300">
                    {dayOrders.map((order, idx) => {
                      const ordCost = computeOrderMenuCost(order, costById, costByName);
                      const st = normalizeOrderStatus(order.status);
                      return (
                        <tr
                          key={order.id}
                          className={
                            idx % 2 === 0
                              ? 'bg-white hover:bg-emerald-50/50'
                              : 'bg-stone-50/70 hover:bg-emerald-50/50'
                          }
                        >
                          <td className="py-2 px-2 text-center font-mono text-[11px] text-stone-500 bg-stone-100 border-r border-stone-300">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2.5 border-r border-stone-300 whitespace-nowrap">
                            <div className="font-mono font-black text-red-700">
                              #{order.orderNumber}
                            </div>
                            <div className="text-[11px] text-stone-500 font-mono tabular-nums">
                              {formatOrderTime(order.createdAt)}
                            </div>
                          </td>
                          <td className="py-2 px-2.5 border-r border-stone-300 whitespace-nowrap font-bold text-stone-800">
                            {formatDiningLabel(order)}
                          </td>
                          <td className="py-2 px-2.5 border-r border-stone-300">
                            <div className="font-bold text-stone-900">
                              {order.customerName || 'ไม่ระบุ'}
                            </div>
                            {order.customerPhone && order.customerPhone !== '-' && (
                              <div className="text-[11px] text-stone-500 font-mono">
                                {order.customerPhone}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2.5 border-r border-stone-300 text-stone-800">
                            <div className="space-y-0.5">
                              {order.items?.map((it, i) => (
                                <div key={`${order.id}_${i}`} className="flex justify-between gap-2">
                                  <span>
                                    {it.name}{' '}
                                    <span className="font-mono font-bold text-stone-600">
                                      ×{it.quantity}
                                    </span>
                                  </span>
                                  <span className="font-mono tabular-nums text-stone-500 shrink-0">
                                    ฿{((it.price || 0) * (it.quantity || 1)).toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono tabular-nums text-stone-700 border-r border-stone-300 whitespace-nowrap">
                            {(order.subtotal || 0).toLocaleString()}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono tabular-nums text-sky-700 border-r border-stone-300 whitespace-nowrap">
                            {(order.deliveryFee || 0).toLocaleString()}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono tabular-nums font-black text-emerald-700 border-r border-stone-300 whitespace-nowrap bg-emerald-50/30">
                            {(order.totalAmount || 0).toLocaleString()}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono tabular-nums text-amber-800 border-r border-stone-300 whitespace-nowrap">
                            {ordCost.toLocaleString()}
                          </td>
                          <td className="py-2 px-2.5 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                                st === 'เช็คบิล'
                                  ? 'bg-teal-50 text-teal-800 border-teal-300'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              }`}
                            >
                              {st === 'เช็คบิล' ? '💰 เช็คบิลแล้ว' : '🟢 ส่งแล้ว'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-stone-200/80 border-t-2 border-stone-400 font-black text-xs whitespace-nowrap">
                      <td className="py-2.5 px-2 text-center font-mono text-stone-600 border-r border-stone-300">
                        Σ
                      </td>
                      <td colSpan={4} className="py-2.5 px-2.5 text-stone-900 border-r border-stone-300">
                        SUM รวมทั้งหมด ({dayOrders.length} บิล)
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-stone-800 border-r border-stone-300">
                        ฿{totalFoodSubtotal.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-sky-800 border-r border-stone-300">
                        ฿{totalDeliveryFee.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-emerald-800 border-r border-stone-300">
                        ฿{totalSales.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-amber-800 border-r border-stone-300">
                        ฿{totalMenuCost.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-blue-800 font-mono tabular-nums">
                        กำไร {netProfit >= 0 ? '+' : ''}฿{netProfit.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs gap-2">
          <span className="text-stone-500">
            สูตร: กำไร = ยอดขายรวม ({totalSales.toLocaleString()}) - (ต้นทุน{' '}
            {totalMenuCost.toLocaleString()} + รายจ่าย {dailyExpense.toLocaleString()}) ={' '}
            <strong className={netProfit >= 0 ? 'text-blue-700' : 'text-rose-600'}>
              {netProfit >= 0 ? '+' : ''}฿{netProfit.toLocaleString()}
            </strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white font-bold rounded-xl transition cursor-pointer shrink-0"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

export const AdminSalesAnalytics: React.FC<AdminSalesAnalyticsProps> = ({
  orders,
  menus = [],
  dailyExpenses = [],
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [hoveredDayKey, setHoveredDayKey] = useState<string | null>(null);

  const { costById, costByName } = useMemo(() => {
    const idMap = new Map<string, number>();
    const nameMap = new Map<string, number>();
    menus.forEach((m) => {
      const c = Math.max(0, Number(m.cost) || 0);
      if (m.id) idMap.set(m.id, c);
      if (m.name) nameMap.set(m.name.trim(), c);
    });
    return { costById: idMap, costByName: nameMap };
  }, [menus]);

  const expenseMap = useMemo(() => {
    const map = new Map<string, DailyExpenseRecord>();
    dailyExpenses.forEach((rec) => {
      map.set(rec.dateKey, rec);
    });
    return map;
  }, [dailyExpenses]);

  // นับออเดอร์ที่ปิดการขายจริง ("ส่งแล้ว" และ "เช็คบิล" และไม่ถูกยกเลิก)
  const completedOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = normalizeOrderStatus(o.status);
      return !o.isCancelled && (st === 'ส่งแล้ว' || st === 'เช็คบิล');
    });
  }, [orders]);

  const filteredCompletedOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return completedOrders.filter((order) => {
      const orderDate = new Date(order.createdAt).getTime();
      if (isNaN(orderDate)) return true;

      if (timeRange === 'today') return orderDate >= startOfToday;
      if (timeRange === '7days') return orderDate >= startOfToday - 6 * 24 * 60 * 60 * 1000;
      if (timeRange === 'month') return orderDate >= new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return true;
    });
  }, [completedOrders, timeRange]);

  const filteredExpensesTotal = useMemo(() => {
    return dailyExpenses
      .filter((rec) => isDateKeyInRange(rec.dateKey, timeRange))
      .reduce((sum, rec) => sum + (rec.totalExpense || 0), 0);
  }, [dailyExpenses, timeRange]);

  // Key KPI Calculations: กำไร = ยอดขายรวม - (ต้นทุนรวม + รายจ่ายประจำวัน)
  const metrics = useMemo(() => {
    const totalOrders = filteredCompletedOrders.length;
    const foodSubtotal = filteredCompletedOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const deliveryTotal = filteredCompletedOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
    const grandTotal = filteredCompletedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalMenuCost = filteredCompletedOrders.reduce(
      (sum, o) => sum + computeOrderMenuCost(o, costById, costByName),
      0
    );
    const totalExpenses = filteredExpensesTotal;
    const totalOutflow = totalMenuCost + totalExpenses;
    const netProfit = grandTotal - totalOutflow;
    const avgOrderValue = totalOrders > 0 ? Math.round(grandTotal / totalOrders) : 0;
    const profitMargin = grandTotal > 0 ? Math.round((netProfit / grandTotal) * 100) : 0;

    return {
      totalOrders,
      foodSubtotal,
      deliveryTotal,
      grandTotal,
      totalMenuCost,
      totalExpenses,
      totalOutflow,
      netProfit,
      avgOrderValue,
      profitMargin,
    };
  }, [filteredCompletedOrders, costById, costByName, filteredExpensesTotal]);

  // Best Selling Dishes (from completed orders for ingredient restocking & sales planning)
  const bestSellers = useMemo(() => {
    const dishMap: Record<string, { name: string; quantity: number; revenue: number; cost: number }> =
      {};

    filteredCompletedOrders.forEach((order) => {
      order.items?.forEach((item) => {
        const name = item.name;
        if (!dishMap[name]) {
          dishMap[name] = { name, quantity: 0, revenue: 0, cost: 0 };
        }
        const qty = item.quantity || 1;
        const unitCost =
          (item.menuId ? costById.get(item.menuId) : undefined) ??
          costByName.get((item.name || '').trim()) ??
          0;
        dishMap[name].quantity += qty;
        dishMap[name].revenue += (item.price || 0) * qty;
        dishMap[name].cost += unitCost * qty;
      });
    });

    const list = Object.values(dishMap);
    list.sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
    return list;
  }, [filteredCompletedOrders, costById, costByName]);

  // Daily Breakdown (merges completed orders & recorded daily expenses)
  const dailyBreakdown = useMemo(() => {
    const dayMap: Record<
      string,
      {
        dateKey: string;
        dateStr: string;
        orderCount: number;
        foodTotal: number;
        deliveryTotal: number;
        total: number;
        menuCost: number;
        dailyExpense: number;
        totalOutflow: number;
        netProfit: number;
      }
    > = {};

    filteredCompletedOrders.forEach((order) => {
      const dateKey = getLocalDateKey(order.createdAt);
      if (!dayMap[dateKey]) {
        dayMap[dateKey] = {
          dateKey,
          dateStr: formatDateKeyToThai(dateKey),
          orderCount: 0,
          foodTotal: 0,
          deliveryTotal: 0,
          total: 0,
          menuCost: 0,
          dailyExpense: expenseMap.get(dateKey)?.totalExpense || 0,
          totalOutflow: 0,
          netProfit: 0,
        };
      }

      dayMap[dateKey].orderCount += 1;
      dayMap[dateKey].foodTotal += order.subtotal || 0;
      dayMap[dateKey].deliveryTotal += order.deliveryFee || 0;
      dayMap[dateKey].total += order.totalAmount || 0;
      dayMap[dateKey].menuCost += computeOrderMenuCost(order, costById, costByName);
    });

    // Include expense-only days within time range so profit chart & summary stay consistent
    dailyExpenses.forEach((rec) => {
      if (!isDateKeyInRange(rec.dateKey, timeRange)) return;
      if (!dayMap[rec.dateKey] && rec.totalExpense > 0) {
        dayMap[rec.dateKey] = {
          dateKey: rec.dateKey,
          dateStr: rec.thaiDate || formatDateKeyToThai(rec.dateKey),
          orderCount: 0,
          foodTotal: 0,
          deliveryTotal: 0,
          total: 0,
          menuCost: 0,
          dailyExpense: rec.totalExpense,
          totalOutflow: rec.totalExpense,
          netProfit: -rec.totalExpense,
        };
      }
    });

    Object.values(dayMap).forEach((row) => {
      row.totalOutflow = row.menuCost + row.dailyExpense;
      row.netProfit = row.total - row.totalOutflow;
    });

    return Object.values(dayMap).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filteredCompletedOrders, dailyExpenses, expenseMap, costById, costByName, timeRange]);

  // Chronological order (oldest -> newest) for visual bar chart
  const chartDays = useMemo(() => {
    return [...dailyBreakdown]
      .filter((d) => d.dateKey !== 'ไม่ระบุวันที่')
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .slice(-14); // Show up to 14 days cleanly in chart
  }, [dailyBreakdown]);

  const maxChartValue = useMemo(() => {
    if (chartDays.length === 0) return 1000;
    const peak = Math.max(
      ...chartDays.map((d) => Math.max(d.total, d.totalOutflow, Math.abs(d.netProfit)))
    );
    return peak > 0 ? peak : 1000;
  }, [chartDays]);

  const topChartDishes = useMemo(() => bestSellers.slice(0, 10), [bestSellers]);
  const maxDishQty = useMemo(() => {
    if (topChartDishes.length === 0) return 1;
    return Math.max(...topChartDishes.map((d) => d.quantity), 1);
  }, [topChartDishes]);

  // Distance Zone Breakdown
  const distanceBreakdown = useMemo(() => {
    const zones: Record<string, { label: string; count: number; fee: number }> = {
      '0-2': { label: '0 - 2 กม. (ส่งฟรี)', count: 0, fee: 0 },
      '2-4': { label: '2 - 4 กม. (20 บาท)', count: 0, fee: 0 },
      '4-5': { label: '4 - 5 กม. (30 บาท)', count: 0, fee: 0 },
      '5-6': { label: '5 - 6 กม. (40 บาท)', count: 0, fee: 0 },
      '6-10': { label: '6 - 10 กม. (50 บาท)', count: 0, fee: 0 },
      '10-12': { label: '10 - 12 กม. (80 บาท)', count: 0, fee: 0 },
      '12+': { label: 'มากกว่า 12 กม. (100 บาท)', count: 0, fee: 0 },
    };

    filteredCompletedOrders.forEach((order) => {
      if (order.deliveryType !== 'ส่งอาหารที่บ้าน' && !order.deliveryFee) return;
      const d = order.distanceKm ?? 0;
      if (d <= 2) {
        zones['0-2'].count++;
        zones['0-2'].fee += order.deliveryFee || 0;
      } else if (d <= 4) {
        zones['2-4'].count++;
        zones['2-4'].fee += order.deliveryFee || 0;
      } else if (d <= 5) {
        zones['4-5'].count++;
        zones['4-5'].fee += order.deliveryFee || 0;
      } else if (d <= 6) {
        zones['5-6'].count++;
        zones['5-6'].fee += order.deliveryFee || 0;
      } else if (d <= 10) {
        zones['6-10'].count++;
        zones['6-10'].fee += order.deliveryFee || 0;
      } else if (d <= 12) {
        zones['10-12'].count++;
        zones['10-12'].fee += order.deliveryFee || 0;
      } else {
        zones['12+'].count++;
        zones['12+'].fee += order.deliveryFee || 0;
      }
    });

    return Object.values(zones).filter((z) => z.count > 0);
  }, [filteredCompletedOrders]);

  const hoveredDayData = useMemo(
    () => chartDays.find((d) => d.dateKey === hoveredDayKey) || chartDays[chartDays.length - 1],
    [chartDays, hoveredDayKey]
  );

  return (
    <div className="space-y-5 text-stone-900 max-w-4xl mx-auto">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-600" />
            <span>วิเคราะห์ยอดขาย & เมนูขายดี</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            คำนวณจากออเดอร์จริง ("ส่งแล้ว" และ "เช็คบิลแล้ว") พร้อมหักต้นทุนเมนูและรายจ่ายประจำวัน
          </p>
        </div>

        {/* Time Filter Buttons */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl shrink-0">
          {(
            [
              { id: 'today', label: 'วันนี้' },
              { id: '7days', label: '7 วันล่าสุด' },
              { id: 'month', label: 'เดือนนี้' },
              { id: 'all', label: 'ทั้งหมด' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTimeRange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                timeRange === tab.id
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid (4 KPIs with Net Profit Formula) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. ยอดขายรวม */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>ยอดขายรวม</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono tabular-nums">
            ฿{metrics.grandTotal.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-500 font-mono tabular-nums">
            ค่าอาหาร {metrics.foodSubtotal.toLocaleString()} + ค่าส่ง{' '}
            {metrics.deliveryTotal.toLocaleString()} บ.
          </div>
        </div>

        {/* 2. ต้นทุนเมนู + รายจ่ายประจำวัน */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>ต้นทุน + รายจ่าย</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono tabular-nums">
            ฿{metrics.totalOutflow.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-500 font-mono tabular-nums">
            ต้นทุนเมนู {metrics.totalMenuCost.toLocaleString()} + จ่ายวัน{' '}
            {metrics.totalExpenses.toLocaleString()}
          </div>
        </div>

        {/* 3. กำไรสุทธิ (ยอดขาย - (ต้นทุน + รายจ่าย)) */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>กำไรสุทธิ</span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                metrics.netProfit >= 0
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              {metrics.netProfit >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
          </div>
          <div
            className={`text-2xl font-black font-mono tabular-nums ${
              metrics.netProfit >= 0 ? 'text-blue-700' : 'text-rose-600'
            }`}
          >
            {metrics.netProfit >= 0 ? '+' : ''}฿{metrics.netProfit.toLocaleString()}
          </div>
          <div className="text-[11px] text-stone-500 font-mono tabular-nums">
            อัตรากำไร {metrics.profitMargin}% ของยอดขาย
          </div>
        </div>

        {/* 4. ออเดอร์สำเร็จ */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>บิลปิดการขาย</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono tabular-nums">
            {metrics.totalOrders}{' '}
            <span className="text-xs font-normal text-stone-500 font-sans">บิล</span>
          </div>
          <div className="text-[11px] text-stone-500 font-mono tabular-nums">
            เฉลี่ย ฿{metrics.avgOrderValue.toLocaleString()} / บิล
          </div>
        </div>
      </div>

      {dailyBreakdown.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 space-y-2">
          <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-extrabold text-base text-stone-700">
            ยังไม่มียอดขายที่ปิดบิล ("ส่งแล้ว" หรือ "เช็คบิล") สำหรับช่วงเวลานี้
          </h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            เมื่อเปลี่ยนสถานะออเดอร์เป็น "ส่งแล้ว" หรือกดปุ่ม "เช็คบิล" ระบบจะนำยอดขาย ต้นทุน และกราฟวิเคราะห์มาแสดงอัตโนมัติ
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* CHART 1: กราฟวิเคราะห์ยอดขาย & กำไรรายวัน */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                  <span>กราฟวิเคราะห์ยอดขาย ต้นทุน และกำไรรายวัน</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  กดที่แท่งกราฟของวันใดก็ได้เพื่อเปิดดูออเดอร์ทั้งหมดในวันนั้น (สูงสุด 14 วันล่าสุด)
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" />
                  ยอดขายรวม
                </span>
                <span className="inline-flex items-center gap-1.5 text-amber-700">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                  ต้นทุน+รายจ่าย
                </span>
                <span className="inline-flex items-center gap-1.5 text-blue-700">
                  <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
                  กำไรสุทธิ
                </span>
              </div>
            </div>

            {/* Active / Hovered Day Readout Bar */}
            {hoveredDayData && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <div className="font-bold text-stone-800">
                  วันที่ {hoveredDayData.dateStr}{' '}
                  <span className="text-stone-500 font-normal">
                    ({hoveredDayData.orderCount} บิล)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums font-bold">
                  <span className="text-emerald-700">
                    ขาย ฿{hoveredDayData.total.toLocaleString()}
                  </span>
                  <span className="text-amber-700">
                    ทุน+จ่าย ฿{hoveredDayData.totalOutflow.toLocaleString()}
                  </span>
                  <span
                    className={
                      hoveredDayData.netProfit >= 0 ? 'text-blue-700' : 'text-rose-600'
                    }
                  >
                    กำไร {hoveredDayData.netProfit >= 0 ? '+' : ''}฿
                    {hoveredDayData.netProfit.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Interactive SVG Grouped Bar Chart */}
            <div className="overflow-x-auto pb-1">
              <div
                className="min-w-[520px]"
                style={{ width: chartDays.length > 7 ? `${chartDays.length * 74}px` : '100%' }}
              >
                <svg
                  viewBox={`0 0 ${Math.max(560, chartDays.length * 76)} 230`}
                  className="w-full h-56 select-none"
                  role="img"
                  aria-label="กราฟวิเคราะห์ยอดขาย ต้นทุน และกำไรรายวัน"
                >
                  {/* Horizontal Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = 185 - ratio * 155;
                    const labelVal = Math.round(maxChartValue * ratio);
                    return (
                      <g key={ratio}>
                        <line
                          x1={48}
                          y1={y}
                          x2={Math.max(545, chartDays.length * 76 - 10)}
                          y2={y}
                          stroke="#e7e5e4"
                          strokeDasharray={ratio === 0 ? undefined : '3 3'}
                          strokeWidth={1}
                        />
                        <text
                          x={42}
                          y={y + 4}
                          textAnchor="end"
                          fontSize="10"
                          fill="#78716c"
                          className="font-mono"
                        >
                          {labelVal >= 1000 ? `${(labelVal / 1000).toFixed(1)}k` : labelVal}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bars per day */}
                  {chartDays.map((day, idx) => {
                    const totalSvgW = Math.max(560, chartDays.length * 76) - 62;
                    const slotW = totalSvgW / chartDays.length;
                    const centerX = 52 + idx * slotW + slotW / 2;
                    const barW = Math.min(16, Math.max(9, (slotW - 14) / 3));
                    const chartH = 155;
                    const baseY = 185;

                    const salesH = Math.max(2, (day.total / maxChartValue) * chartH);
                    const costH = Math.max(
                      day.totalOutflow > 0 ? 2 : 0,
                      (day.totalOutflow / maxChartValue) * chartH
                    );
                    const profitH = Math.max(
                      day.netProfit !== 0 ? 2 : 0,
                      (Math.abs(day.netProfit) / maxChartValue) * chartH
                    );

                    const shortDate = day.dateKey.slice(5).split('-').reverse().join('/');
                    const isHovered = hoveredDayKey === day.dateKey;

                    return (
                      <g
                        key={day.dateKey}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredDayKey(day.dateKey)}
                        onClick={() => setSelectedDateKey(day.dateKey)}
                      >
                        {/* Hover column backdrop */}
                        <rect
                          x={centerX - slotW * 0.44}
                          y={16}
                          width={slotW * 0.88}
                          height={172}
                          rx={6}
                          fill={isHovered ? '#f5f5f4' : 'transparent'}
                        />
                        {/* Sales Bar */}
                        <rect
                          x={centerX - barW * 1.6}
                          y={baseY - salesH}
                          width={barW}
                          height={salesH}
                          rx={3}
                          fill="#10b981"
                        />
                        {/* Outflow Bar (Menu Cost + Daily Expenses) */}
                        <rect
                          x={centerX - barW * 0.5}
                          y={baseY - costH}
                          width={barW}
                          height={costH}
                          rx={3}
                          fill="#f59e0b"
                        />
                        {/* Net Profit Bar */}
                        <rect
                          x={centerX + barW * 0.6}
                          y={baseY - profitH}
                          width={barW}
                          height={profitH}
                          rx={3}
                          fill={day.netProfit >= 0 ? '#2563eb' : '#e11d48'}
                        />
                        {/* Value above Sales Bar */}
                        <text
                          x={centerX}
                          y={baseY - Math.max(salesH, costH, profitH) - 5}
                          textAnchor="middle"
                          fontSize="9.5"
                          fontWeight="700"
                          fill="#1c1917"
                          className="font-mono"
                        >
                          {day.total >= 1000
                            ? `${(day.total / 1000).toFixed(1)}k`
                            : day.total}
                        </text>
                        {/* X-Axis Date Label */}
                        <text
                          x={centerX}
                          y={205}
                          textAnchor="middle"
                          fontSize="10.5"
                          fontWeight={isHovered ? '800' : '600'}
                          fill={isHovered ? '#b91c1c' : '#57534e'}
                          className="font-mono"
                        >
                          {shortDate}
                        </text>
                        <text
                          x={centerX}
                          y={218}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#78716c"
                        >
                          {day.orderCount} บิล
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* CHART 2: กราฟเมนูขายดี (สำหรับวางแผนเติมวัตถุดิบ) */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <span>กราฟเมนูขายดี (วางแผนเติมวัตถุดิบ)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  จัดอันดับตามจำนวนจานที่ขายได้จริง เพื่อใช้เตรียมสั่งวัตถุดิบเข้าร้านให้เพียงพอ
                </p>
              </div>
              <span className="text-xs font-bold text-stone-600 font-mono tabular-nums">
                รวม {bestSellers.reduce((s, i) => s + i.quantity, 0)} จาน
              </span>
            </div>

            {topChartDishes.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400">
                ยังไม่มีข้อมูลเมนูขายดีในช่วงเวลานี้
              </div>
            ) : (
              <div className="space-y-2.5">
                {topChartDishes.map((dish, index) => {
                  const totalDishCount = bestSellers.reduce((s, i) => s + i.quantity, 0);
                  const percent =
                    totalDishCount > 0 ? Math.round((dish.quantity / totalDishCount) * 100) : 0;
                  const barWidthPct = Math.max(6, Math.round((dish.quantity / maxDishQty) * 100));
                  const barColor =
                    index === 0
                      ? 'bg-red-600'
                      : index === 1
                      ? 'bg-amber-500'
                      : index === 2
                      ? 'bg-orange-500'
                      : 'bg-stone-600';

                  return (
                    <div key={dish.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] shrink-0 ${
                              index === 0
                                ? 'bg-amber-400 text-stone-950'
                                : index === 1
                                ? 'bg-stone-300 text-stone-900'
                                : index === 2
                                ? 'bg-amber-700 text-white'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="font-bold text-stone-900 truncate">{dish.name}</span>
                          {index < 3 && (
                            <span className="text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded-sm shrink-0">
                              ควรสต๊อกวัตถุดิบเพิ่ม
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0 font-mono tabular-nums">
                          <span className="font-black text-red-600">{dish.quantity} จาน</span>
                          <span className="text-stone-400 text-[11px] w-9 text-right">
                            ({percent}%)
                          </span>
                          <span className="text-stone-700 font-semibold hidden sm:inline w-20 text-right">
                            ฿{dish.revenue.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                          style={{ width: `${barWidthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Daily Breakdown Table (Clickable Date -> Popup All Orders of That Date) */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-red-600" />
                  <span>สรุปยอดขายรายวัน (กดที่วันที่เพื่อดูออเดอร์ทั้งหมดของวันนั้น)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  แสดงยอดขาย ต้นทุนเมนู รายจ่ายประจำวัน และกำไรสุทธิเรียงตามวันล่าสุด
                </p>
              </div>
              <span className="text-xs text-stone-500 font-mono tabular-nums">
                {dailyBreakdown.length} วัน
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-bold whitespace-nowrap">
                    <th className="pb-2.5 pr-3">วันที่ (คลิกดูออเดอร์)</th>
                    <th className="pb-2.5 px-2 text-center">บิล</th>
                    <th className="pb-2.5 px-2 text-right">ยอดขายรวม</th>
                    <th className="pb-2.5 px-2 text-right">ต้นทุนเมนู</th>
                    <th className="pb-2.5 px-2 text-right">รายจ่ายวัน</th>
                    <th className="pb-2.5 pl-2 text-right">กำไรสุทธิ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {dailyBreakdown.map((row) => (
                    <tr
                      key={row.dateKey}
                      onClick={() => setSelectedDateKey(row.dateKey)}
                      className="hover:bg-amber-50/70 transition cursor-pointer group"
                    >
                      <td className="py-2.5 pr-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDateKey(row.dateKey);
                          }}
                          className="inline-flex items-center gap-1.5 font-bold text-red-700 group-hover:underline cursor-pointer whitespace-nowrap"
                        >
                          <Eye className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="font-mono tabular-nums">{row.dateStr}</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono tabular-nums font-bold text-stone-700">
                        {row.orderCount}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums font-bold text-emerald-700">
                        ฿{row.total.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-stone-600">
                        ฿{row.menuCost.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-amber-700">
                        ฿{row.dailyExpense.toLocaleString()}
                      </td>
                      <td
                        className={`py-2.5 pl-2 text-right font-mono tabular-nums font-black ${
                          row.netProfit >= 0 ? 'text-blue-700' : 'text-rose-600'
                        }`}
                      >
                        {row.netProfit >= 0 ? '+' : ''}฿{row.netProfit.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-stone-300 bg-stone-50 font-black text-xs">
                    <td className="py-2.5 pr-3 text-stone-900">รวมทั้งหมด</td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-stone-900">
                      {metrics.totalOrders}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-emerald-700">
                      ฿{metrics.grandTotal.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-stone-700">
                      ฿{metrics.totalMenuCost.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-amber-700">
                      ฿{metrics.totalExpenses.toLocaleString()}
                    </td>
                    <td
                      className={`py-2.5 pl-2 text-right font-mono tabular-nums ${
                        metrics.netProfit >= 0 ? 'text-blue-700' : 'text-rose-600'
                      }`}
                    >
                      {metrics.netProfit >= 0 ? '+' : ''}฿{metrics.netProfit.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Distance Delivery Zones Breakdown */}
          {distanceBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-stone-100 text-sm font-bold text-stone-800">
                <Truck className="w-4 h-4 text-red-600" />
                <span>สถิติการจัดส่งตามระยะทาง GPS</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {distanceBreakdown.map((zone) => (
                  <div
                    key={zone.label}
                    className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex justify-between items-center text-xs"
                  >
                    <div>
                      <div className="font-bold text-stone-800">{zone.label}</div>
                      <div className="text-stone-400 text-[10px] font-mono tabular-nums">
                        รวมค่าส่ง ฿{zone.fee.toLocaleString()}
                      </div>
                    </div>
                    <div className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg font-black text-xs font-mono tabular-nums">
                      {zone.count} บิล
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Popup Modal: All Orders of Selected Date */}
      <DailyOrdersPopupModal
        dateKey={selectedDateKey}
        orders={orders}
        menus={menus}
        dailyExpenses={dailyExpenses}
        onClose={() => setSelectedDateKey(null)}
      />
    </div>
  );
};
