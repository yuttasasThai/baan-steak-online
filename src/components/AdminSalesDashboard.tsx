import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  CalendarRange,
  Clock,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DailyExpenseRecord, MenuItem, Order } from '../types';
import { formatDateKeyToThai, normalizeOrderStatus } from '../services/menuService';
import { computeOrderMenuCost, getLocalDateKey } from './AdminSalesAnalytics';

export interface AdminSalesDashboardProps {
  orders: Order[];
  menus?: MenuItem[];
  dailyExpenses?: DailyExpenseRecord[];
  onSelectDateKey?: (dateKey: string) => void;
}

type TrendGranularity = 'daily' | 'weekly' | 'monthly';

interface PeriodSummary {
  sales: number;
  menuCost: number;
  dailyExpense: number;
  netProfit: number;
  ordersCount: number;
  prevSales: number;
  changePct: number | null;
}

interface TrendPoint {
  key: string;
  label: string;
  fullLabel: string;
  sales: number;
  outflow: number;
  netProfit: number;
  ordersCount: number;
  clickableDateKey?: string;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function getThaiShortMonth(monthIdx: number): string {
  const months = [
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
  return months[monthIdx] || '';
}

function calcChangePct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export const AdminSalesDashboard: React.FC<AdminSalesDashboardProps> = ({
  orders,
  menus = [],
  dailyExpenses = [],
  onSelectDateKey,
}) => {
  const [granularity, setGranularity] = useState<TrendGranularity>('daily');

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

  const completedOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = normalizeOrderStatus(o.status);
      return !o.isCancelled && (st === 'ส่งแล้ว' || st === 'เช็คบิล');
    });
  }, [orders]);

  const expenseByDate = useMemo(() => {
    const map = new Map<string, number>();
    dailyExpenses.forEach((rec) => {
      if (rec.dateKey) {
        map.set(rec.dateKey, Math.max(0, Number(rec.totalExpense) || 0));
      }
    });
    return map;
  }, [dailyExpenses]);

  // Daily, Weekly, and Monthly KPI Summaries
  const periodSummaries = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    // Last 7 days (inclusive of today) vs previous 7 days
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const prevWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);

    // Current calendar month vs previous calendar month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const summarizeRange = (
      startMs: number,
      endMs: number,
      prevStartMs: number,
      prevEndMs: number
    ): PeriodSummary => {
      let sales = 0;
      let menuCost = 0;
      let ordersCount = 0;
      let prevSales = 0;

      completedOrders.forEach((order) => {
        const t = new Date(order.createdAt).getTime();
        if (isNaN(t)) return;
        if (t >= startMs && t < endMs) {
          sales += order.totalAmount || 0;
          menuCost += computeOrderMenuCost(order, costById, costByName);
          ordersCount += 1;
        } else if (t >= prevStartMs && t < prevEndMs) {
          prevSales += order.totalAmount || 0;
        }
      });

      let dailyExpense = 0;
      dailyExpenses.forEach((rec) => {
        const parts = rec.dateKey.split('-');
        if (parts.length !== 3) return;
        const dMs = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
        if (!isNaN(dMs) && dMs >= startMs && dMs < endMs) {
          dailyExpense += rec.totalExpense || 0;
        }
      });

      const netProfit = sales - (menuCost + dailyExpense);
      return {
        sales,
        menuCost,
        dailyExpense,
        netProfit,
        ordersCount,
        prevSales,
        changePct: calcChangePct(sales, prevSales),
      };
    };

    return {
      daily: summarizeRange(
        todayStart.getTime(),
        todayEnd.getTime(),
        yesterdayStart.getTime(),
        todayStart.getTime()
      ),
      weekly: summarizeRange(
        weekStart.getTime(),
        todayEnd.getTime(),
        prevWeekStart.getTime(),
        weekStart.getTime()
      ),
      monthly: summarizeRange(
        monthStart.getTime(),
        nextMonthStart.getTime(),
        prevMonthStart.getTime(),
        monthStart.getTime()
      ),
    };
  }, [completedOrders, dailyExpenses, costById, costByName]);

  // Recharts Line Series (Daily / Weekly / Monthly)
  const chartData = useMemo<TrendPoint[]>(() => {
    const now = new Date();

    if (granularity === 'daily') {
      // Last 14 calendar days
      const bucket = new Map<
        string,
        { sales: number; menuCost: number; ordersCount: number; dailyExpense: number }
      >();
      const orderedKeys: string[] = [];

      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const key = toDateKey(d);
        orderedKeys.push(key);
        bucket.set(key, {
          sales: 0,
          menuCost: 0,
          ordersCount: 0,
          dailyExpense: expenseByDate.get(key) || 0,
        });
      }

      completedOrders.forEach((order) => {
        const key = getLocalDateKey(order.createdAt);
        const entry = bucket.get(key);
        if (!entry) return;
        entry.sales += order.totalAmount || 0;
        entry.menuCost += computeOrderMenuCost(order, costById, costByName);
        entry.ordersCount += 1;
      });

      return orderedKeys.map((key) => {
        const item = bucket.get(key)!;
        const outflow = item.menuCost + item.dailyExpense;
        const parts = key.split('-');
        const shortLabel = `${Number(parts[2])}/${Number(parts[1])}`;
        return {
          key,
          label: shortLabel,
          fullLabel: `วันที่ ${formatDateKeyToThai(key)}`,
          sales: item.sales,
          outflow,
          netProfit: item.sales - outflow,
          ordersCount: item.ordersCount,
          clickableDateKey: key,
        };
      });
    }

    if (granularity === 'weekly') {
      // Last 8 weeks (Monday-Sunday or 7-day rolling ending today)
      const weeks: Array<{
        key: string;
        label: string;
        fullLabel: string;
        startMs: number;
        endMs: number;
        sales: number;
        menuCost: number;
        dailyExpense: number;
        ordersCount: number;
      }> = [];

      for (let w = 7; w >= 0; w--) {
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - w * 7);
        const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 6);
        const endExclusive = new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate() + 1
        );
        const sLabel = `${startDate.getDate()}/${startDate.getMonth() + 1}`;
        const eLabel = `${endDate.getDate()}/${endDate.getMonth() + 1}`;

        weeks.push({
          key: `w_${w}`,
          label: `${sLabel}-${eLabel}`,
          fullLabel: `สัปดาห์ ${sLabel} - ${eLabel}`,
          startMs: startDate.getTime(),
          endMs: endExclusive.getTime(),
          sales: 0,
          menuCost: 0,
          dailyExpense: 0,
          ordersCount: 0,
        });
      }

      completedOrders.forEach((order) => {
        const t = new Date(order.createdAt).getTime();
        if (isNaN(t)) return;
        const found = weeks.find((wk) => t >= wk.startMs && t < wk.endMs);
        if (!found) return;
        found.sales += order.totalAmount || 0;
        found.menuCost += computeOrderMenuCost(order, costById, costByName);
        found.ordersCount += 1;
      });

      dailyExpenses.forEach((rec) => {
        const parts = rec.dateKey.split('-');
        if (parts.length !== 3) return;
        const t = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
        if (isNaN(t)) return;
        const found = weeks.find((wk) => t >= wk.startMs && t < wk.endMs);
        if (found) found.dailyExpense += rec.totalExpense || 0;
      });

      return weeks.map((wk) => {
        const outflow = wk.menuCost + wk.dailyExpense;
        return {
          key: wk.key,
          label: wk.label,
          fullLabel: wk.fullLabel,
          sales: wk.sales,
          outflow,
          netProfit: wk.sales - outflow,
          ordersCount: wk.ordersCount,
        };
      });
    }

    // Monthly: Last 6 calendar months
    const monthsBucket = new Map<
      string,
      {
        key: string;
        label: string;
        fullLabel: string;
        sales: number;
        menuCost: number;
        dailyExpense: number;
        ordersCount: number;
      }
    >();
    const monthKeys: string[] = [];

    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const y = d.getFullYear();
      const mo = d.getMonth() + 1;
      const key = `${y}-${String(mo).padStart(2, '0')}`;
      const thaiYearShort = String(y + 543).slice(-2);
      monthKeys.push(key);
      monthsBucket.set(key, {
        key,
        label: `${getThaiShortMonth(d.getMonth())} ${thaiYearShort}`,
        fullLabel: `เดือน${getThaiShortMonth(d.getMonth())} ${y + 543}`,
        sales: 0,
        menuCost: 0,
        dailyExpense: 0,
        ordersCount: 0,
      });
    }

    completedOrders.forEach((order) => {
      const dateKey = getLocalDateKey(order.createdAt);
      const ym = dateKey.slice(0, 7);
      const entry = monthsBucket.get(ym);
      if (!entry) return;
      entry.sales += order.totalAmount || 0;
      entry.menuCost += computeOrderMenuCost(order, costById, costByName);
      entry.ordersCount += 1;
    });

    dailyExpenses.forEach((rec) => {
      const ym = rec.dateKey.slice(0, 7);
      const entry = monthsBucket.get(ym);
      if (entry) entry.dailyExpense += rec.totalExpense || 0;
    });

    return monthKeys.map((key) => {
      const entry = monthsBucket.get(key)!;
      const outflow = entry.menuCost + entry.dailyExpense;
      return {
        key: entry.key,
        label: entry.label,
        fullLabel: entry.fullLabel,
        sales: entry.sales,
        outflow,
        netProfit: entry.sales - outflow,
        ordersCount: entry.ordersCount,
      };
    });
  }, [granularity, completedOrders, dailyExpenses, expenseByDate, costById, costByName]);

  const summaryCards = [
    {
      id: 'daily' as const,
      title: 'ยอดขายวันนี้ (รายวัน)',
      compareLabel: 'เทียบเมื่อวาน',
      icon: Clock,
      accentClass: 'bg-red-50 text-red-600',
      data: periodSummaries.daily,
    },
    {
      id: 'weekly' as const,
      title: 'ยอดขาย 7 วันล่าสุด (รายสัปดาห์)',
      compareLabel: 'เทียบ 7 วันก่อน',
      icon: CalendarRange,
      accentClass: 'bg-amber-50 text-amber-700',
      data: periodSummaries.weekly,
    },
    {
      id: 'monthly' as const,
      title: 'ยอดขายเดือนนี้ (รายเดือน)',
      compareLabel: 'เทียบเดือนก่อน',
      icon: CalendarDays,
      accentClass: 'bg-emerald-50 text-emerald-700',
      data: periodSummaries.monthly,
    },
  ];

  return (
    <section className="space-y-4" aria-label="ภาพรวมแนวโน้มยอดขาย">
      {/* 1. Summary Cards: Daily / Weekly / Monthly */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const isSelected = granularity === card.id;
          const { sales, netProfit, ordersCount, changePct } = card.data;

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setGranularity(card.id)}
              className={`text-left bg-white rounded-2xl p-4 border transition cursor-pointer ${
                isSelected
                  ? 'border-red-500 ring-2 ring-red-100 shadow-sm'
                  : 'border-stone-200 hover:border-stone-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-stone-600">{card.title}</span>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${card.accentClass}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-2 flex items-baseline justify-between gap-2">
                <div className="text-2xl font-black text-stone-900 font-mono tabular-nums">
                  ฿{sales.toLocaleString()}
                </div>
                {changePct !== null && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-bold font-mono tabular-nums ${
                      changePct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {changePct >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    {changePct >= 0 ? `+${changePct}%` : `${changePct}%`}
                  </span>
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                <span className="font-mono tabular-nums">
                  {ordersCount} บิล · กำไร{' '}
                  <strong
                    className={netProfit >= 0 ? 'text-blue-700' : 'text-rose-600'}
                  >
                    {netProfit >= 0 ? '+' : ''}฿{netProfit.toLocaleString()}
                  </strong>
                </span>
                <span className="text-stone-400">
                  {changePct === null ? 'ยังไม่มีข้อมูลก่อนหน้า' : card.compareLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Recharts Line Chart: แนวโน้มยอดขาย */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
          <div>
            <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-600" />
              <span>กราฟเส้นแนวโน้มยอดขายและกำไร</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {granularity === 'daily' &&
                'แสดงแนวโน้มรายวัน 14 วันล่าสุด (กดจุดบนกราฟเพื่อดูตารางออเดอร์วันนั้นได้)'}
              {granularity === 'weekly' && 'แสดงแนวโน้มรายสัปดาห์ย้อนหลัง 8 สัปดาห์'}
              {granularity === 'monthly' && 'แสดงแนวโน้มรายเดือนย้อนหลัง 6 เดือน'}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl self-start sm:self-auto">
            {(
              [
                { id: 'daily', label: 'รายวัน' },
                { id: 'weekly', label: 'รายสัปดาห์' },
                { id: 'monthly', label: 'รายเดือน' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGranularity(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  granularity === tab.id
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 16, left: 0, bottom: 4 }}
              onClick={(state) => {
                if (
                  granularity === 'daily' &&
                  onSelectDateKey &&
                  state &&
                  state.activeTooltipIndex !== undefined
                ) {
                  const idx = Number(state.activeTooltipIndex);
                  const point = !isNaN(idx) ? chartData[idx] : undefined;
                  if (point?.clickableDateKey) {
                    onSelectDateKey(point.clickableDateKey);
                  }
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#57534e' }}
                tickLine={false}
                axisLine={{ stroke: '#d6d3d1' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#57534e' }}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(val: number) =>
                  val >= 1000 || val <= -1000
                    ? `${(val / 1000).toFixed(1)}k`
                    : String(val)
                }
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const pt = payload[0].payload as TrendPoint;
                  return (
                    <div className="bg-white border border-stone-300 rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[190px]">
                      <div className="font-extrabold text-stone-900 border-b border-stone-100 pb-1">
                        {pt.fullLabel}
                      </div>
                      <div className="flex justify-between gap-4 font-mono tabular-nums">
                        <span className="text-stone-500">จำนวนบิล:</span>
                        <span className="font-bold text-stone-900">{pt.ordersCount} บิล</span>
                      </div>
                      <div className="flex justify-between gap-4 font-mono tabular-nums">
                        <span className="text-emerald-700 font-semibold">ยอดขายรวม:</span>
                        <span className="font-black text-emerald-700">
                          ฿{pt.sales.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 font-mono tabular-nums">
                        <span className="text-amber-700 font-semibold">ต้นทุน+รายจ่าย:</span>
                        <span className="font-bold text-amber-700">
                          ฿{pt.outflow.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4 font-mono tabular-nums pt-1 border-t border-stone-100">
                        <span className="text-blue-700 font-semibold">กำไรสุทธิ:</span>
                        <span
                          className={`font-black ${
                            pt.netProfit >= 0 ? 'text-blue-700' : 'text-rose-600'
                          }`}
                        >
                          {pt.netProfit >= 0 ? '+' : ''}฿{pt.netProfit.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              />
              <Line
                type="monotone"
                dataKey="sales"
                name="ยอดขายรวม (บาท)"
                stroke="#10b981"
                strokeWidth={2.75}
                dot={{ r: 3.5, fill: '#10b981' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="outflow"
                name="ต้นทุน + รายจ่าย (บาท)"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 2.5, fill: '#f59e0b' }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="netProfit"
                name="กำไรสุทธิ (บาท)"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#2563eb' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};

export default AdminSalesDashboard;
