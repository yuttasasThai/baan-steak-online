import React, { useMemo, useState } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CupSoda,
  Gift,
  HelpCircle,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Trophy,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import { CustomerRecord, Order } from '../types';
import {
  formatOrderThaiMonth,
  formatThaiDateTime,
  redeemCustomerReward,
} from '../services/menuService';

interface AdminCustomerHistoryProps {
  customers: CustomerRecord[];
  orders?: Order[];
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminCustomerHistory: React.FC<AdminCustomerHistoryProps> = ({
  customers,
  orders = [],
  onNotify,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'latest' | 'orders' | 'name'>('latest');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // 1. Merge ALL customers from Firestore `customers` and all `orders`
  // This guarantees every single customer who ever placed an order is displayed (แสดงทั้งหมด),
  // resolving any limit of only 5 names.
  const combinedCustomers = useMemo(() => {
    const customerMap = new Map<string, CustomerRecord>();

    // A. Add all existing customer records from Firestore
    customers.forEach((cust) => {
      const cleanPhone = cust.phone.replace(/[^0-9]/g, '');
      const key = cleanPhone || cust.phone;
      if (!key) return;
      customerMap.set(key, { ...cust });
    });

    // B. Supplement from all orders (active, archived, cancelled)
    orders.forEach((ord) => {
      const rawPhone = ord.customerPhone || '';
      const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
      const key = cleanPhone || rawPhone;
      if (!key) return;

      const existing = customerMap.get(key);
      const ordDate = ord.createdAt || '';
      const ordTime = ordDate ? new Date(ordDate).getTime() : 0;

      if (!existing) {
        // Collect items from this order
        const itemMap: Record<string, number> = {};
        if (Array.isArray(ord.items)) {
          ord.items.forEach((it) => {
            if (it.name) {
              itemMap[it.name] = (itemMap[it.name] || 0) + (Number(it.quantity) || 1);
            }
          });
        }

        customerMap.set(key, {
          phone: rawPhone,
          name: ord.customerName || 'ลูกค้า',
          address: ord.address || '',
          orderCount: 1,
          lastOrderMonthYear: formatOrderThaiMonth(ordDate),
          lastOrderAt: ordDate || new Date().toISOString(),
          itemCounts: itemMap,
          redeemedCoke: 0,
          redeemedItems: {},
        });
      } else {
        // Customer already exists, check if this order has newer date
        const existingTime = existing.lastOrderAt ? new Date(existing.lastOrderAt).getTime() : 0;
        if (ordTime > existingTime) {
          existing.lastOrderAt = ordDate;
          if (ord.customerName && ord.customerName.trim() && existing.name === 'ลูกค้า') {
            existing.name = ord.customerName.trim();
          }
          if (ord.address && ord.address.trim() && !existing.address) {
            existing.address = ord.address.trim();
          }
          if (ordDate) {
            existing.lastOrderMonthYear = formatOrderThaiMonth(ordDate);
          }
        }
      }
    });

    return Array.from(customerMap.values());
  }, [customers, orders]);

  // 2. Compute aggregated customer points & rewards for all combined customers
  const customerRewardsData = useMemo(() => {
    return combinedCustomers.map((cust) => {
      const cleanPhone = cust.phone.replace(/[^0-9]/g, '');

      // Combine item counts from customer record and orders matching phone
      const itemCountsMap: Record<string, number> = { ...(cust.itemCounts || {}) };

      // Supplement from orders matching phone
      let matchingOrdersCount = 0;
      if (orders.length > 0) {
        orders.forEach((ord) => {
          const ordPhone = (ord.customerPhone || '').replace(/[^0-9]/g, '');
          if (ordPhone === cleanPhone) {
            matchingOrdersCount++;
            if (Array.isArray(ord.items)) {
              ord.items.forEach((item) => {
                if (item.name) {
                  const qty = Number(item.quantity) || 1;
                  // If item was not already counted in customer record, increment
                  if (!cust.itemCounts || Object.keys(cust.itemCounts).length === 0) {
                    itemCountsMap[item.name] = (itemCountsMap[item.name] || 0) + qty;
                  }
                }
              });
            }
          }
        });
      }

      // Order count: use the higher of record's orderCount or matchingOrdersCount
      const totalOrders = Math.max(cust.orderCount || 1, matchingOrdersCount || 1);

      // Rule 1: ครบทุก 20 ออเดอร์รวมกัน ฟรีน้ำโค้ก 1 ขวด
      const totalCokeEarned = Math.floor(totalOrders / 20);
      const redeemedCoke = cust.redeemedCoke || 0;
      const availableCoke = Math.max(0, totalCokeEarned - redeemedCoke);
      const cokeProgress = totalOrders % 20;
      const cokeNeeded = 20 - cokeProgress;

      // Rule 2: สั่งครบทุก 10 ออเดอร์ ของแต่ละอย่าง ฟรี 1 ออเดอร์
      const itemRewards = Object.entries(itemCountsMap).map(([itemName, count]) => {
        const totalFreeEarned = Math.floor(count / 10);
        const redeemed = cust.redeemedItems?.[itemName] || 0;
        const available = Math.max(0, totalFreeEarned - redeemed);
        const progress = count % 10;
        const needed = 10 - progress;

        return {
          name: itemName,
          count,
          totalFreeEarned,
          redeemed,
          available,
          progress,
          needed,
        };
      });

      // Total available free items
      const totalAvailableFreeDishes = itemRewards.reduce((sum, r) => sum + r.available, 0);

      return {
        ...cust,
        itemCountsMap,
        totalOrders,
        totalCokeEarned,
        redeemedCoke,
        availableCoke,
        cokeProgress,
        cokeNeeded,
        itemRewards,
        totalAvailableFreeDishes,
      };
    });
  }, [combinedCustomers, orders]);

  // 3. Filter and Sort customers: Default is LATEST first (โดยเริ่มจากล่าสุดให้อยู่บนสุด)
  const filteredCustomers = useMemo(() => {
    let result = customerRewardsData;

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.phone.replace(/[^0-9]/g, '').includes(query.replace(/[^0-9]/g, '')) ||
          c.address.toLowerCase().includes(query)
      );
    }

    // Sort: Default 'latest' (ล่าสุดให้อยู่บนสุด)
    return [...result].sort((a, b) => {
      if (sortOption === 'latest') {
        const timeA = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
        const timeB = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA; // Newest order on top!
        return b.totalOrders - a.totalOrders;
      }
      if (sortOption === 'orders') {
        if (b.totalOrders !== a.totalOrders) return b.totalOrders - a.totalOrders;
        const timeA = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
        const timeB = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortOption === 'name') {
        return (a.name || '').localeCompare(b.name || '', 'th');
      }
      return 0;
    });
  }, [customerRewardsData, searchQuery, sortOption]);

  // Total shop-wide rewards statistics
  const stats = useMemo(() => {
    const totalCustomers = combinedCustomers.length;
    const totalCokeAvailable = customerRewardsData.reduce((sum, c) => sum + c.availableCoke, 0);
    const totalDishesAvailable = customerRewardsData.reduce(
      (sum, c) => sum + c.totalAvailableFreeDishes,
      0
    );
    const totalOrdersCount = customerRewardsData.reduce((sum, c) => sum + c.totalOrders, 0);

    return {
      totalCustomers,
      totalCokeAvailable,
      totalDishesAvailable,
      totalOrdersCount,
    };
  }, [combinedCustomers, customerRewardsData]);

  // Handle reward redemption in Firestore
  const handleRedeem = async (
    phone: string,
    rewardType: 'coke' | 'item',
    itemName?: string
  ) => {
    try {
      setIsRedeeming(true);
      await redeemCustomerReward(phone, rewardType, itemName);
      if (onNotify) {
        onNotify(
          rewardType === 'coke'
            ? 'บันทึกการใช้สิทธิ์รับน้ำโค้กฟรี 1 ขวดเรียบร้อย'
            : `บันทึกการใช้สิทธิ์รับ "${itemName}" ฟรี 1 ออเดอร์เรียบร้อย`,
          'success'
        );
      }
      // Update selectedCustomer if currently open
      if (selectedCustomer && selectedCustomer.phone === phone) {
        if (rewardType === 'coke') {
          setSelectedCustomer({
            ...selectedCustomer,
            redeemedCoke: (selectedCustomer.redeemedCoke || 0) + 1,
          });
        } else if (rewardType === 'item' && itemName) {
          setSelectedCustomer({
            ...selectedCustomer,
            redeemedItems: {
              ...(selectedCustomer.redeemedItems || {}),
              [itemName]: ((selectedCustomer.redeemedItems || {})[itemName] || 0) + 1,
            },
          });
        }
      }
    } catch (err) {
      console.error('Redeem error:', err);
      if (onNotify) onNotify('เกิดข้อผิดพลาดในการบันทึกสิทธิ์', 'error');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Find currently selected customer enriched data
  const currentSelectedData = useMemo(() => {
    if (!selectedCustomer) return null;
    return (
      customerRewardsData.find((c) => c.phone === selectedCustomer.phone) ||
      customerRewardsData.find((c) => c.phone.replace(/[^0-9]/g, '') === selectedCustomer.phone.replace(/[^0-9]/g, ''))
    );
  }, [selectedCustomer, customerRewardsData]);

  return (
    <div className="space-y-4 text-stone-900">
      {/* 1. Header & Summary Stats */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-stone-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-red-600" />
              <span>ตารางรวมประวัติลูกค้า & ระบบสะสมแต้ม</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              ระบบสะสมแต้มอัตโนมัติ: สั่งครบทุก 10 ออเดอร์ของแต่ละอย่าง ฟรี 1 ออเดอร์ | สะสมครบทุก 20 ออเดอร์รวมกัน ฟรีน้ำโค้ก 1 ขวด
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as 'latest' | 'orders' | 'name')}
              aria-label="เรียงลำดับประวัติลูกค้า"
              className="px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 focus:outline-none focus:border-red-500 focus:bg-white"
            >
              <option value="latest">⏱️ ล่าสุดอยู่บนสุด (ค่าเริ่มต้น)</option>
              <option value="orders">🏆 ออเดอร์สะสมมากที่สุด</option>
              <option value="name">🔤 เรียงตามชื่อ ก-ฮ</option>
            </select>

            {/* Search Box */}
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, เบอร์โทร..."
                className="w-full pl-9 pr-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium focus:outline-none focus:border-red-500 focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reward Rules KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-stone-100">
          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
            <div className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-stone-600" />
              <span>ลูกค้าทั้งหมด</span>
            </div>
            <div className="text-lg font-black text-stone-900 mt-0.5">
              {stats.totalCustomers} <span className="text-xs font-normal text-stone-500">คน</span>
            </div>
          </div>

          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
            <div className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>ออเดอร์สะสมรวม</span>
            </div>
            <div className="text-lg font-black text-stone-900 mt-0.5">
              {stats.totalOrdersCount} <span className="text-xs font-normal text-stone-500">ครั้ง</span>
            </div>
          </div>

          <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-200">
            <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
              <CupSoda className="w-3.5 h-3.5 text-emerald-600" />
              <span>สิทธิ์โค้กฟรี (ครบ 20)</span>
            </div>
            <div className="text-lg font-black text-emerald-700 mt-0.5">
              {stats.totalCokeAvailable} <span className="text-xs font-normal text-emerald-600">ขวดพร้อมรับ</span>
            </div>
          </div>

          <div className="bg-rose-50/70 rounded-xl p-3 border border-rose-200">
            <div className="text-[11px] font-semibold text-rose-800 flex items-center gap-1">
              <Gift className="w-3.5 h-3.5 text-rose-600" />
              <span>สิทธิ์อาหารฟรี (ครบ 10)</span>
            </div>
            <div className="text-lg font-black text-rose-700 mt-0.5">
              {stats.totalDishesAvailable} <span className="text-xs font-normal text-rose-600">จานพร้อมรับ</span>
            </div>
          </div>
        </div>

        {/* Explain Rule Banner */}
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>กติกาโปรโมชั่นสะสมแต้ม:</strong>
            <span className="block sm:inline sm:ml-1">
              1) <strong>สั่งครบทุก 10 ออเดอร์ของแต่ละอย่าง</strong> → ฟรี 1 ออเดอร์ของเมนูนั้น
            </span>
            <span className="block sm:inline sm:ml-2">
              2) <strong>สะสมครบทุก 20 ออเดอร์รวมกัน</strong> → ฟรีน้ำโค้ก 1 ขวด
            </span>
          </div>
        </div>
      </div>

      {/* 2. Consolidated Customers Table (ตารางรวม) */}
      {filteredCustomers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-stone-200 text-stone-400 space-y-2">
          <Users className="w-10 h-10 mx-auto text-stone-300" />
          <div className="text-sm font-bold text-stone-600">
            {searchQuery ? 'ไม่พบข้อมูลลูกค้าที่ค้นหา' : 'ยังไม่มีประวัติลูกค้าที่จัดส่งแล้ว'}
          </div>
          <p className="text-xs text-stone-400">
            เมื่อกดเปลี่ยนสถานะออเดอร์เป็น "ส่งแล้ว" ระบบจะบันทึกประวัติและนับแต้มสะสมให้ทันที
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          {/* Responsive Horizontal Scrolling Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[840px]">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-700 font-extrabold uppercase tracking-wide text-[11px]">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3 min-w-[140px]">ลูกค้า</th>
                  <th className="py-3 px-3 min-w-[120px]">เบอร์โทรศัพท์</th>
                  <th className="py-3 px-3 min-w-[160px]">ที่อยู่จัดส่ง</th>
                  <th className="py-3 px-3 min-w-[100px] text-center">สั่งล่าสุด</th>
                  <th className="py-3 px-3 min-w-[90px] text-center">ออเดอร์รวม</th>
                  <th className="py-3 px-3 min-w-[150px]">🥤 สะสมโค้ก (ครบ 20)</th>
                  <th className="py-3 px-3 min-w-[160px]">🥩 สะสมเมนู (ครบ 10)</th>
                  <th className="py-3 px-3 w-28 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredCustomers.map((cust, idx) => {
                  const hasEarnedReward = cust.availableCoke > 0 || cust.totalAvailableFreeDishes > 0;
                  return (
                    <tr
                      key={cust.phone}
                      className={`transition group cursor-pointer ${
                        hasEarnedReward
                          ? 'bg-amber-50/80 hover:bg-amber-100/80 ring-1 ring-inset ring-amber-300'
                          : 'hover:bg-stone-50/80'
                      }`}
                      onClick={() => setSelectedCustomer(cust)}
                    >
                      {/* Index */}
                      <td className="py-3.5 px-3 text-center font-bold text-stone-400">
                        {idx + 1}
                      </td>

                      {/* Customer Name */}
                      <td className="py-3.5 px-3 font-extrabold text-stone-900">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{cust.name || 'ไม่ระบุชื่อ'}</span>
                          {hasEarnedReward && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[10px] font-black rounded-full shadow-xs"
                              title="ลูกค้าท่านนี้มีสิทธิ์รับของฟรีพร้อมใช้งาน!"
                            >
                              <Gift className="w-2.5 h-2.5" />
                              <span>มีสิทธิ์รับฟรี!</span>
                            </span>
                          )}
                          {cust.totalOrders >= 20 && !hasEarnedReward && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-black rounded-full"
                              title="ลูกค้าประจำ VIP (สั่งสะสม 20+ ครั้ง)"
                            >
                              VIP
                            </span>
                          )}
                        </div>
                      </td>

                    {/* Phone */}
                    <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`tel:${cust.phone.replace(/[^0-9]/g, '')}`}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-lg font-bold text-xs transition border border-stone-200"
                        title="กดเพื่อโทร"
                      >
                        <Phone className="w-3 h-3 text-red-600" />
                        <span>{cust.phone}</span>
                      </a>
                    </td>

                    {/* Address */}
                    <td className="py-3.5 px-3 text-stone-600 max-w-[200px] truncate" title={cust.address}>
                      {cust.address ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                          <span className="truncate">{cust.address}</span>
                        </div>
                      ) : (
                        <span className="text-stone-400">-</span>
                      )}
                    </td>

                    {/* Last Order Month/Year */}
                    <td className="py-3.5 px-3 text-center text-stone-600 font-medium whitespace-nowrap">
                      <div
                        className="inline-flex items-center gap-1 text-[11px] bg-stone-100 px-2 py-0.5 rounded-md"
                        title={cust.lastOrderAt ? formatThaiDateTime(cust.lastOrderAt) : undefined}
                      >
                        <Calendar className="w-3 h-3 text-stone-400" />
                        <span>
                          {cust.lastOrderAt
                            ? formatThaiDateTime(cust.lastOrderAt)
                            : cust.lastOrderMonthYear || '-'}
                        </span>
                      </div>
                    </td>

                    {/* Total Orders */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-block px-2.5 py-1 bg-stone-100 text-stone-900 font-black rounded-lg text-xs">
                        {cust.totalOrders} ครั้ง
                      </span>
                    </td>

                    {/* 🥤 Coke Loyalty (Rule: ครบ 20 ออเดอร์ ฟรี 1 ขวด) */}
                    <td className="py-3.5 px-3">
                      {cust.availableCoke > 0 ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-black text-[11px]">
                            <CupSoda className="w-3 h-3 text-emerald-600" />
                            <span>ฟรี {cust.availableCoke} ขวด!</span>
                          </span>
                          <div className="text-[10px] text-stone-500">
                            รอบถัดไป: {cust.cokeProgress}/20 (ขาด {cust.cokeNeeded})
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between text-[10px] text-stone-500 mb-0.5">
                            <span>{cust.cokeProgress}/20 ออเดอร์</span>
                            <span>ขาดอีก {cust.cokeNeeded}</span>
                          </div>
                          <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-amber-500 h-1.5 rounded-full"
                              style={{ width: `${(cust.cokeProgress / 20) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* 🥩 Menu Loyalty (Rule: ครบ 10 จานของแต่ละอย่าง ฟรี 1 ออเดอร์) */}
                    <td className="py-3.5 px-3">
                      {cust.totalAvailableFreeDishes > 0 ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-full font-black text-[11px]">
                            <Gift className="w-3 h-3 text-rose-600" />
                            <span>ฟรี {cust.totalAvailableFreeDishes} จาน!</span>
                          </span>
                          <div className="text-[10px] text-stone-500 truncate max-w-[150px]">
                            {cust.itemRewards
                              .filter((r) => r.available > 0)
                              .map((r) => `${r.name} (${r.available})`)
                              .join(', ')}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-stone-500">
                          {cust.itemRewards.length > 0 ? (
                            <span>
                              สะสม {cust.itemRewards.length} เมนู
                              <span className="text-[10px] block text-stone-400">
                                สูงสุด: {Math.max(...cust.itemRewards.map((r) => r.progress))}/10 จาน
                              </span>
                            </span>
                          ) : (
                            <span className="text-stone-400">ยังไม่มีข้อมูลจาน</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(cust)}
                        className="px-2.5 py-1.5 bg-stone-100 hover:bg-red-50 text-stone-700 hover:text-red-700 border border-stone-200 hover:border-red-200 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                      >
                        ดูแต้มสะสม
                      </button>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-3 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
            <div>
              แสดงทั้งหมด <strong>{filteredCustomers.length}</strong> จาก {customers.length} คน
            </div>
            <div className="text-[11px]">
              * คลิกที่แถวหรือปุ่ม "ดูแต้มสะสม" เพื่อเปิดดูรายละเอียดแต้มทุกเมนูและกดใช้สิทธิ์
            </div>
          </div>
        </div>
      )}

      {/* 3. Customer Rewards Detail Modal */}
      {selectedCustomer && currentSelectedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-stone-900">
                    {currentSelectedData.name || 'ลูกค้า'}
                  </h3>
                  {currentSelectedData.totalOrders >= 20 && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full">
                      VIP Member
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-stone-500">
                  <a
                    href={`tel:${currentSelectedData.phone.replace(/[^0-9]/g, '')}`}
                    className="flex items-center gap-1 font-bold text-red-600 hover:underline"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{currentSelectedData.phone}</span>
                  </a>
                  <span>• สั่งซื้อสะสม: <strong>{currentSelectedData.totalOrders} ครั้ง</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Address & Month info */}
            <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200 text-xs space-y-1">
              {currentSelectedData.address && (
                <div className="flex items-start gap-1.5 text-stone-700">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  <span><strong>ที่อยู่:</strong> {currentSelectedData.address}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-stone-500">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>เดือน/ปี ที่สั่งล่าสุด: <strong>{currentSelectedData.lastOrderMonthYear}</strong></span>
              </div>
            </div>

            {/* Loyalty Rule 1: น้ำโค้กฟรี (ครบทุก 20 ออเดอร์รวมกัน ฟรีน้ำโค้ก 1 ขวด) */}
            <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 rounded-xl text-emerald-800">
                    <CupSoda className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-emerald-950">
                      สะสมน้ำโค้ก (ครบทุก 20 ออเดอร์ ฟรี 1 ขวด)
                    </h4>
                    <p className="text-[11px] text-emerald-700">
                      สั่งสะสมรวม {currentSelectedData.totalOrders} ครั้ง (ได้รับแล้ว {currentSelectedData.totalCokeEarned} ขวด)
                    </p>
                  </div>
                </div>

                {currentSelectedData.availableCoke > 0 && (
                  <span className="px-2.5 py-1 bg-emerald-600 text-white font-black text-xs rounded-xl shadow-xs">
                    พร้อมรับ {currentSelectedData.availableCoke} ขวด
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-emerald-900 font-semibold">
                  <span>ความคืบหน้ารอบปัจจุบัน</span>
                  <span>
                    {currentSelectedData.cokeProgress}/20 ออเดอร์ (ขาดอีก {currentSelectedData.cokeNeeded} ครั้ง)
                  </span>
                </div>
                <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentSelectedData.cokeProgress / 20) * 100}%` }}
                  />
                </div>
              </div>

              {/* Redeem Button for Coke */}
              {currentSelectedData.availableCoke > 0 && (
                <div className="pt-2 flex items-center justify-between border-t border-emerald-200">
                  <span className="text-xs text-emerald-800">
                    แลกใช้สิทธิ์ไปแล้ว: {currentSelectedData.redeemedCoke} ขวด
                  </span>
                  <button
                    type="button"
                    disabled={isRedeeming}
                    onClick={() => handleRedeem(currentSelectedData.phone, 'coke')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition active:scale-95 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isRedeeming ? 'กำลังบันทึก...' : 'บันทึกแจกโค้กฟรี 1 ขวด'}
                  </button>
                </div>
              )}
            </div>

            {/* Loyalty Rule 2: ฟรี 1 ออเดอร์ ของแต่ละอย่าง (สั่งครบทุก 10 ออเดอร์ของแต่ละอย่าง ฟรี 1 ออเดอร์) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-red-600" />
                  <h4 className="font-extrabold text-sm text-stone-900">
                    แต้มสะสมรายเมนู (ครบทุก 10 ออเดอร์ ฟรี 1 ออเดอร์)
                  </h4>
                </div>
                <span className="text-[11px] text-stone-500 font-medium">
                  {currentSelectedData.itemRewards.length} เมนูที่เคยสั่ง
                </span>
              </div>

              {currentSelectedData.itemRewards.length === 0 ? (
                <div className="p-4 text-center bg-stone-50 rounded-2xl border border-stone-200 text-stone-400 text-xs">
                  ยังไม่มีประวัติการนับจำนวนจานของแต่ละเมนู
                </div>
              ) : (
                <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  {currentSelectedData.itemRewards.map((itm) => (
                    <div key={itm.name} className="p-3 bg-white hover:bg-stone-50/50 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-extrabold text-xs text-stone-900">{itm.name}</div>
                          <div className="text-[11px] text-stone-500">
                            สั่งแล้ว {itm.count} จาน
                            {itm.redeemed > 0 && ` (แลกฟรีไปแล้ว ${itm.redeemed} จาน)`}
                          </div>
                        </div>

                        {itm.available > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[11px] font-black rounded-lg">
                              ฟรี {itm.available} จาน
                            </span>
                            <button
                              type="button"
                              disabled={isRedeeming}
                              onClick={() =>
                                handleRedeem(currentSelectedData.phone, 'item', itm.name)
                              }
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black rounded-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                              บันทึกแถมฟรี
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold text-stone-400">
                            ขาดอีก {itm.needed} จาน
                          </span>
                        )}
                      </div>

                      {/* Progress bar per item */}
                      <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-red-500 h-1.5 rounded-full"
                          style={{ width: `${(itm.progress / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Close Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl font-black text-xs transition active:scale-95"
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
