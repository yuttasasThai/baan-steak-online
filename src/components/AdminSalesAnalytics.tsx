import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  DollarSign,
  Flame,
  PackageCheck,
  ShoppingBag,
  TrendingUp,
  Truck,
  Utensils,
} from 'lucide-react';
import { Order } from '../types';

interface AdminSalesAnalyticsProps {
  orders: Order[];
}

type TimeRange = 'today' | '7days' | 'month' | 'all';

export const AdminSalesAnalytics: React.FC<AdminSalesAnalyticsProps> = ({ orders }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  // Filter ONLY orders where status is "ส่งแล้ว"
  // Requirement: "ใช้ข้อมูล Order จริงจาก Firestore ห้ามสร้างข้อมูลจำลอง ให้นับเฉพาะออเดอร์ที่สถานะ 'ส่งแล้ว'"
  const completedOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'ส่งแล้ว');
  }, [orders]);

  // Apply time range filter on completed orders
  const filteredCompletedOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return completedOrders.filter((order) => {
      const orderDate = new Date(order.createdAt).getTime();
      if (isNaN(orderDate)) return true; // fallback if date parse issue

      if (timeRange === 'today') {
        return orderDate >= startOfToday;
      }
      if (timeRange === '7days') {
        const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;
        return orderDate >= sevenDaysAgo;
      }
      if (timeRange === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return orderDate >= startOfMonth;
      }
      return true; // 'all'
    });
  }, [completedOrders, timeRange]);

  // Key KPI Calculations
  const metrics = useMemo(() => {
    const totalOrders = filteredCompletedOrders.length;
    const foodSubtotal = filteredCompletedOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const deliveryTotal = filteredCompletedOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
    const grandTotal = filteredCompletedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const avgOrderValue = totalOrders > 0 ? Math.round(grandTotal / totalOrders) : 0;

    return {
      totalOrders,
      foodSubtotal,
      deliveryTotal,
      grandTotal,
      avgOrderValue,
    };
  }, [filteredCompletedOrders]);

  // Best Selling Dishes calculation (aggregated by menu name from completed & cancelled orders for menu popularity history)
  const bestSellers = useMemo(() => {
    const dishMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

    const relevantOrders = orders.filter((order) => {
      // Include completed and cancelled orders (preserving ordered menu history)
      if (order.status !== 'ส่งแล้ว' && order.status !== 'ยกเลิก' && !order.isCancelled) return false;
      const orderDate = new Date(order.createdAt).getTime();
      if (isNaN(orderDate)) return true;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      if (timeRange === 'today') return orderDate >= startOfToday;
      if (timeRange === '7days') return orderDate >= startOfToday - 6 * 24 * 60 * 60 * 1000;
      if (timeRange === 'month') return orderDate >= new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return true;
    });

    relevantOrders.forEach((order) => {
      order.items?.forEach((item) => {
        const name = item.name;
        if (!dishMap[name]) {
          dishMap[name] = { name, quantity: 0, revenue: 0 };
        }
        dishMap[name].quantity += item.quantity || 1;
        dishMap[name].revenue += (item.price || 0) * (item.quantity || 1);
      });
    });

    const list = Object.values(dishMap);
    list.sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
    return list;
  }, [orders, timeRange]);

  // Daily Breakdown
  const dailyBreakdown = useMemo(() => {
    const dayMap: Record<
      string,
      { dateStr: string; orderCount: number; foodTotal: number; deliveryTotal: number; total: number }
    > = {};

    filteredCompletedOrders.forEach((order) => {
      const d = new Date(order.createdAt);
      const dateKey = !isNaN(d.getTime())
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        : 'ไม่ระบุวันที่';

      if (!dayMap[dateKey]) {
        // Thai readable date
        let thaiLabel = dateKey;
        if (!isNaN(d.getTime())) {
          thaiLabel = `${d.getDate()} / ${d.getMonth() + 1} / ${d.getFullYear() + 543}`;
        }
        dayMap[dateKey] = {
          dateStr: thaiLabel,
          orderCount: 0,
          foodTotal: 0,
          deliveryTotal: 0,
          total: 0,
        };
      }

      dayMap[dateKey].orderCount += 1;
      dayMap[dateKey].foodTotal += order.subtotal || 0;
      dayMap[dateKey].deliveryTotal += order.deliveryFee || 0;
      dayMap[dateKey].total += order.totalAmount || 0;
    });

    const entries = Object.entries(dayMap);
    entries.sort((a, b) => b[0].localeCompare(a[0])); // newest day first
    return entries.map((e) => e[1]);
  }, [filteredCompletedOrders]);

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

  return (
    <div className="space-y-5 text-stone-900 max-w-4xl mx-auto">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-600" />
            <span>📊 วิเคราะห์ยอดขาย</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            คำนวณจากข้อมูลออเดอร์จริงในระบบ Firestore (เฉพาะออเดอร์สถานะ "ส่งแล้ว")
          </p>
        </div>

        {/* Time Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setTimeRange('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              timeRange === 'today'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            วันนี้
          </button>
          <button
            onClick={() => setTimeRange('7days')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              timeRange === '7days'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            7 วันล่าสุด
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              timeRange === 'month'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            เดือนนี้
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              timeRange === 'all'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            ทั้งหมด
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Grand Revenue */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>ยอดรวมสุทธิ</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {metrics.grandTotal.toLocaleString()}
            <span className="text-xs font-normal text-stone-500 ml-1">บาท</span>
          </div>
          <div className="text-[11px] text-stone-400">
            ค่าอาหาร {metrics.foodSubtotal.toLocaleString()} บ. + ค่าส่ง {metrics.deliveryTotal.toLocaleString()} บ.
          </div>
        </div>

        {/* Completed Orders Count */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>ออเดอร์ส่งสำเร็จ</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900">
            {metrics.totalOrders}
            <span className="text-xs font-normal text-stone-500 ml-1">บิล</span>
          </div>
          <div className="text-[11px] text-stone-400">
            จากออเดอร์ทั้งหมด {orders.length} บิล
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>เฉลี่ยต่อบิล</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">
            {metrics.avgOrderValue.toLocaleString()}
            <span className="text-xs font-normal text-stone-500 ml-1">บาท</span>
          </div>
          <div className="text-[11px] text-stone-400">
            ยอดสั่งซื้อเฉลี่ย
          </div>
        </div>

        {/* Delivery Fees Collected */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold">
            <span>ค่าจัดส่งรวม</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600">
            {metrics.deliveryTotal.toLocaleString()}
            <span className="text-xs font-normal text-stone-500 ml-1">บาท</span>
          </div>
          <div className="text-[11px] text-stone-400">
            คำนวณตามระยะทาง GPS
          </div>
        </div>
      </div>

      {metrics.totalOrders === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 space-y-2">
          <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-extrabold text-base text-stone-700">
            ยังไม่มียอดขายในสถานะ "ส่งแล้ว" สำหรับช่วงเวลานี้
          </h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            ระบบวิเคราะห์ยอดขายจะนับเฉพาะออเดอร์ที่มีสถานะ "ส่งแล้ว" ในระบบจริงเท่านั้น
            เมื่อกดเปลี่ยนสถานะออเดอร์เป็น "ส่งแล้ว" ในแท็บรายการออเดอร์ ยอดจะถูกนำมาคำนวณทันที
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Top Selling Dishes Card */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <span>อันดับเมนูขายดี (ยอดนิยม)</span>
              </h3>
              <span className="text-xs text-stone-500">
                รวมทั้งหมด {bestSellers.reduce((s, i) => s + i.quantity, 0)} จาน
              </span>
            </div>

            <div className="divide-y divide-stone-100">
              {bestSellers.map((dish, index) => {
                const totalDishCount = bestSellers.reduce((s, i) => s + i.quantity, 0);
                const percent = totalDishCount > 0 ? Math.round((dish.quantity / totalDishCount) * 100) : 0;

                return (
                  <div key={dish.name} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                          index === 0
                            ? 'bg-amber-400 text-white shadow-xs'
                            : index === 1
                            ? 'bg-stone-300 text-stone-800'
                            : index === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-stone-900">{dish.name}</div>
                        <div className="text-[11px] text-stone-400">
                          สัดส่วนยอดสั่ง {percent}% ของอาหารทั้งหมด
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-extrabold text-sm text-red-600">
                        {dish.quantity} <span className="text-xs font-normal text-stone-500">จาน</span>
                      </div>
                      <div className="text-xs font-semibold text-stone-700">
                        {dish.revenue.toLocaleString()} บาท
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Breakdown Table */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-600" />
                <span>สรุปยอดขายรายวัน</span>
              </h3>
              <span className="text-xs text-stone-500">
                {dailyBreakdown.length} วันที่มีการจัดส่งสำเร็จ
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-bold">
                    <th className="pb-2.5">วันที่</th>
                    <th className="pb-2.5 text-center">จำนวนบิล</th>
                    <th className="pb-2.5 text-right">ยอดค่าอาหาร</th>
                    <th className="pb-2.5 text-right">ค่าจัดส่ง</th>
                    <th className="pb-2.5 text-right">ยอดรวมสุทธิ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {dailyBreakdown.map((row) => (
                    <tr key={row.dateStr} className="hover:bg-stone-50 transition">
                      <td className="py-2.5 font-bold text-stone-800">{row.dateStr}</td>
                      <td className="py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold">
                          {row.orderCount}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-stone-700">
                        {row.foodTotal.toLocaleString()} บ.
                      </td>
                      <td className="py-2.5 text-right text-blue-600">
                        {row.deliveryTotal.toLocaleString()} บ.
                      </td>
                      <td className="py-2.5 text-right font-black text-emerald-600">
                        {row.total.toLocaleString()} บ.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Distance Delivery Zones Breakdown */}
          {distanceBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm space-y-3">
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
                      <div className="text-stone-400 text-[10px]">
                        รวมค่าส่ง {zone.fee.toLocaleString()} บ.
                      </div>
                    </div>
                    <div className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg font-black text-xs">
                      {zone.count} บิล
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
