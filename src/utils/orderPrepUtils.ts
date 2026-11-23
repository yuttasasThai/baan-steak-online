import { MenuItem, Order, OrderItem } from '../types';

export const DEFAULT_SHOP_PREP_MINUTES = 12;

export const STOCKOUT_CANCEL_REASONS = [
  'ของหมดกระทันหัน',
  'วัตถุดิบหมด',
  'ลูกค้าขอยกเลิก',
] as const;

export function getThaiCalendarDateKey(dateInput?: string | Date): string {
  try {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

export function isOrderItemCancelled(
  item?: Pick<OrderItem, 'isCancelled' | 'itemStatus'> | null
): boolean {
  return Boolean(item && (item.isCancelled || item.itemStatus === 'ยกเลิก'));
}

export function getDefaultPrepTimeByCategory(
  category?: string,
  shopDefault: number = DEFAULT_SHOP_PREP_MINUTES
): number {
  const safeDefault = Math.max(
    1,
    Math.min(180, Math.round(Number(shopDefault) || DEFAULT_SHOP_PREP_MINUTES))
  );
  const cat = (category || '').trim().toLowerCase();
  if (!cat) return safeDefault;

  if (/เครื่องดื่ม|น้ำ|drink|beverage|soda|tea|coffee|ชา|กาแฟ/.test(cat)) {
    return 3;
  }
  if (/สลัด|salad/.test(cat)) {
    return 7;
  }
  if (/ทานเล่น|snack|appetizer|ของกินเล่น|เกี๊ยว|เฟรนช์ฟราย/.test(cat)) {
    return 8;
  }
  if (/สปาเก็ตตี้|สปาเกตตี้|สปาเก็ตตี|spaghetti|พาสต้า|pasta/.test(cat)) {
    return Math.max(5, Math.min(safeDefault, 10));
  }
  return safeDefault;
}

export function resolveMenuPrepTimeMinutes(
  menu?: Pick<MenuItem, 'prepTimeMinutes' | 'category'> | null,
  shopDefault: number = DEFAULT_SHOP_PREP_MINUTES
): number {
  if (
    menu &&
    typeof menu.prepTimeMinutes === 'number' &&
    Number.isFinite(menu.prepTimeMinutes) &&
    menu.prepTimeMinutes > 0
  ) {
    return Math.max(1, Math.min(180, Math.round(menu.prepTimeMinutes)));
  }
  return getDefaultPrepTimeByCategory(menu?.category, shopDefault);
}

export function estimateOrderPrepMinutes(
  items: OrderItem[] = [],
  menus: Array<Pick<MenuItem, 'id' | 'name' | 'category' | 'prepTimeMinutes'>> = [],
  shopDefault: number = DEFAULT_SHOP_PREP_MINUTES
): number {
  const activeItems = (items || []).filter((it) => !isOrderItemCancelled(it));
  if (activeItems.length === 0) return 0;

  let maxUnitPrep = 0;
  let totalDishes = 0;

  for (const it of activeItems) {
    const qty = Math.max(1, Number(it.quantity) || 1);
    totalDishes += qty;

    let unitPrep = 0;
    if (
      typeof it.prepTimeMinutes === 'number' &&
      Number.isFinite(it.prepTimeMinutes) &&
      it.prepTimeMinutes > 0
    ) {
      unitPrep = Math.max(1, Math.min(180, Math.round(it.prepTimeMinutes)));
    } else {
      const cleanName = (it.name || '').trim().toLowerCase();
      const matchedMenu =
        menus.find((m) => m.id === it.menuId) ||
        menus.find((m) => (m.name || '').trim().toLowerCase() === cleanName) ||
        null;
      unitPrep = resolveMenuPrepTimeMinutes(matchedMenu, shopDefault);
    }

    if (unitPrep > maxUnitPrep) {
      maxUnitPrep = unitPrep;
    }
  }

  const batchBuffer = Math.min(10, Math.floor(Math.max(0, totalDishes - 1) * 1.5));
  return Math.max(2, Math.min(90, maxUnitPrep + batchBuffer));
}

export type OrderSpeedState = 'on_track' | 'warning' | 'overdue' | 'done' | 'cancelled';

export interface OrderTimingMetrics {
  targetMinutes: number;
  elapsedMinutes: number;
  remainingMinutes: number;
  overdueMinutes: number;
  speedState: OrderSpeedState;
  isFinished: boolean;
  isOnTime: boolean;
  progressRatio: number;
}

export function getOrderTimingMetrics(
  order: Pick<
    Order,
    | 'items'
    | 'status'
    | 'estimatedPrepMinutes'
    | 'cookingStartedAt'
    | 'readyAt'
    | 'checkedOutAt'
    | 'createdAt'
    | 'updatedAt'
    | 'isCancelled'
  >,
  nowMs: number = Date.now(),
  menus: Array<Pick<MenuItem, 'id' | 'name' | 'category' | 'prepTimeMinutes'>> = [],
  shopDefault: number = DEFAULT_SHOP_PREP_MINUTES
): OrderTimingMetrics {
  const safeDefault = Math.max(
    1,
    Math.min(180, Math.round(Number(shopDefault) || DEFAULT_SHOP_PREP_MINUTES))
  );

  const computedFromItems = estimateOrderPrepMinutes(order.items || [], menus, safeDefault);
  const targetMinutes =
    typeof order.estimatedPrepMinutes === 'number' &&
    Number.isFinite(order.estimatedPrepMinutes) &&
    order.estimatedPrepMinutes > 0
      ? Math.max(1, Math.min(180, Math.round(order.estimatedPrepMinutes)))
      : computedFromItems > 0
      ? computedFromItems
      : safeDefault;

  const startIso = order.cookingStartedAt || order.createdAt;
  const parsedStart = startIso ? new Date(startIso).getTime() : NaN;
  const startMs = Number.isFinite(parsedStart) ? parsedStart : nowMs;

  const isCancelledOrder = Boolean(order.isCancelled || order.status === 'ยกเลิก');
  const isFinished = Boolean(
    isCancelledOrder ||
      order.readyAt ||
      order.status === 'ส่งออเดอร์' ||
      order.status === 'กำลังส่ง' ||
      order.status === 'ส่งแล้ว' ||
      order.status === 'เช็คบิล'
  );

  let endMs = nowMs;
  if (isFinished) {
    const endIso = order.readyAt || order.checkedOutAt || order.updatedAt || order.createdAt;
    const parsedEnd = endIso ? new Date(endIso).getTime() : NaN;
    endMs = Number.isFinite(parsedEnd) ? Math.max(startMs, parsedEnd) : startMs;
  }

  const elapsedMinutes = Math.max(0, Math.round((endMs - startMs) / 60000));
  const remainingMinutes = targetMinutes - elapsedMinutes;
  const overdueMinutes = Math.max(0, elapsedMinutes - targetMinutes);
  const warningThreshold = Math.max(2, Math.round(targetMinutes * 0.25));

  let speedState: OrderSpeedState = 'on_track';
  if (isCancelledOrder) {
    speedState = 'cancelled';
  } else if (isFinished) {
    speedState = 'done';
  } else if (elapsedMinutes > targetMinutes) {
    speedState = 'overdue';
  } else if (remainingMinutes <= warningThreshold) {
    speedState = 'warning';
  }

  return {
    targetMinutes,
    elapsedMinutes,
    remainingMinutes,
    overdueMinutes,
    speedState,
    isFinished,
    isOnTime: !isCancelledOrder && elapsedMinutes <= targetMinutes,
    progressRatio: targetMinutes > 0 ? Math.min(1.5, elapsedMinutes / targetMinutes) : 0,
  };
}

export interface DailyKitchenSpeedStats {
  activeCount: number;
  overdueCount: number;
  warningCount: number;
  onTrackCount: number;
  completedTodayCount: number;
  avgActualPrepMinutes: number;
  onTimeRatePct: number;
}

export function getDailyKitchenSpeedStats(
  orders: Order[],
  menus: Array<Pick<MenuItem, 'id' | 'name' | 'category' | 'prepTimeMinutes'>> = [],
  shopDefault: number = DEFAULT_SHOP_PREP_MINUTES,
  nowMs: number = Date.now()
): DailyKitchenSpeedStats {
  const todayKey = getThaiCalendarDateKey(new Date(nowMs));
  let activeCount = 0;
  let overdueCount = 0;
  let warningCount = 0;
  let onTrackCount = 0;

  let completedTodayCount = 0;
  let totalCompletedMinutes = 0;
  let onTimeCompletedCount = 0;

  for (const ord of orders || []) {
    const isCancelledOrder = Boolean(ord.isCancelled || ord.status === 'ยกเลิก');
    if (isCancelledOrder) continue;

    const isDone = Boolean(
      ord.isArchived ||
        ord.status === 'ส่งแล้ว' ||
        ord.status === 'เช็คบิล' ||
        ord.status === 'ส่งออเดอร์' ||
        ord.status === 'กำลังส่ง'
    );

    const metrics = getOrderTimingMetrics(ord, nowMs, menus, shopDefault);

    if (!isDone) {
      activeCount += 1;
      if (metrics.speedState === 'overdue') overdueCount += 1;
      else if (metrics.speedState === 'warning') warningCount += 1;
      else onTrackCount += 1;
    }

    const ordDateKey = getThaiCalendarDateKey(ord.createdAt);
    if (isDone && ordDateKey === todayKey) {
      completedTodayCount += 1;
      totalCompletedMinutes += metrics.elapsedMinutes;
      if (metrics.isOnTime) {
        onTimeCompletedCount += 1;
      }
    }
  }

  return {
    activeCount,
    overdueCount,
    warningCount,
    onTrackCount,
    completedTodayCount,
    avgActualPrepMinutes:
      completedTodayCount > 0 ? Math.round(totalCompletedMinutes / completedTodayCount) : 0,
    onTimeRatePct:
      completedTodayCount > 0 ? Math.round((onTimeCompletedCount / completedTodayCount) * 100) : 100,
  };
}
