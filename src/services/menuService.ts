import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { CategoryItem, CustomerRecord, DiningType, MenuItem, Order, OrderStatus, ShopSettings } from '../types';
import { resolveMenuImageUrl, DEFAULT_FALLBACK_IMAGE } from '../utils/menuImages';

export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  name: 'บ้าน สเต็กออนไลน์',
  slogan: 'อร่อย สะอาด ส่งถึงบ้าน',
  phone: '085-045-1606',
  lineOaName: 'บ้าน สเต็กออนไลน์',
  lineName: 'บ้าน สเต็กออนไลน์',
  lineUrl: 'https://line.me/ti/p/~0850451606',
  lineId: '@baansteak',
  lineEnabled: true,
  isOpen: true,
  shopLatitude: 16.5447, // พิกัด อ.ชุมแพ จ.ขอนแก่น
  shopLongitude: 102.1005,
  heroBannerUrl: '/IMG_20261007_161813.jpg',
  hideAdminButtonInCustomerView: false,
};

export const SHOP_INFO = {
  ...DEFAULT_SHOP_SETTINGS,
  phone1: '085-045-1606',
  phone2: '085-045-1606', // Deprecated, only single number
};

// Calculate distance in kilometers using Haversine formula
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

// Calculate delivery fee by GPS distance:
// 0 - 2 กม. = ฟรี 0 บาท
// มากกว่า 2 - 4 กม. = 20 บาท
// มากกว่า 4 - 5 กม. = 30 บาท
// มากกว่า 5 - 6 กม. = 40 บาท
// มากกว่า 6 - 10 กม. = 50 บาท
// มากกว่า 10 - 12 กม. = 80 บาท
// มากกว่า 12 กม. = 100 บาท
export function calculateDeliveryFeeByDistance(distanceKm: number): {
  fee: number;
  rateDescription: string;
} {
  if (distanceKm <= 2) {
    return { fee: 0, rateDescription: '0 - 2 กม. (ฟรีค่าจัดส่ง 0 บาท)' };
  } else if (distanceKm <= 4) {
    return { fee: 20, rateDescription: 'มากกว่า 2 - 4 กม. (20 บาท)' };
  } else if (distanceKm <= 5) {
    return { fee: 30, rateDescription: 'มากกว่า 4 - 5 กม. (30 บาท)' };
  } else if (distanceKm <= 6) {
    return { fee: 40, rateDescription: 'มากกว่า 5 - 6 กม. (40 บาท)' };
  } else if (distanceKm <= 10) {
    return { fee: 50, rateDescription: 'มากกว่า 6 - 10 กม. (50 บาท)' };
  } else if (distanceKm <= 12) {
    return { fee: 80, rateDescription: 'มากกว่า 10 - 12 กม. (80 บาท)' };
  } else {
    return { fee: 100, rateDescription: 'มากกว่า 12 กม. (100 บาท)' };
  }
}

// Subscribe to Shop Settings from Firestore
export function subscribeShopSettings(
  onUpdate: (settings: ShopSettings) => void
): () => void {
  const settingsDocRef = doc(db, 'settings', 'shop');
  return onSnapshot(
    settingsDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onUpdate({
          name: data.name || DEFAULT_SHOP_SETTINGS.name,
          slogan: data.slogan || DEFAULT_SHOP_SETTINGS.slogan,
          phone: data.phone || DEFAULT_SHOP_SETTINGS.phone,
          lineOaName: data.lineOaName || data.lineName || DEFAULT_SHOP_SETTINGS.lineOaName,
          lineName: data.lineName || data.lineOaName || DEFAULT_SHOP_SETTINGS.lineName,
          lineUrl: data.lineUrl || DEFAULT_SHOP_SETTINGS.lineUrl,
          lineId: data.lineId || DEFAULT_SHOP_SETTINGS.lineId,
          lineEnabled: data.lineEnabled !== false,
          isOpen: data.isOpen !== false,
          shopLatitude:
            typeof data.shopLatitude === 'number'
              ? data.shopLatitude
              : DEFAULT_SHOP_SETTINGS.shopLatitude,
          shopLongitude:
            typeof data.shopLongitude === 'number'
              ? data.shopLongitude
              : DEFAULT_SHOP_SETTINGS.shopLongitude,
          heroBannerUrl:
            data.heroBannerUrl &&
            !data.heroBannerUrl.includes('file_00000000322c8230a99655a0452e2494')
              ? data.heroBannerUrl
              : '/IMG_20261007_161813.jpg',
          hideAdminButtonInCustomerView: Boolean(data.hideAdminButtonInCustomerView),
        });
      } else {
        onUpdate(DEFAULT_SHOP_SETTINGS);
      }
    },
    (err) => {
      console.warn('Error subscribing shop settings:', err);
      onUpdate(DEFAULT_SHOP_SETTINGS);
    }
  );
}

// Update Shop Settings in Firestore
export async function updateShopSettings(settings: Partial<ShopSettings>): Promise<void> {
  const settingsDocRef = doc(db, 'settings', 'shop');
  await setDoc(settingsDocRef, settings, { merge: true });
}

export const INITIAL_CATEGORIES: CategoryItem[] = [
  { id: 'cat_steak', name: 'สเต็ก', orderIndex: 0 },
  { id: 'cat_salad', name: 'สลัด', orderIndex: 1 },
  { id: 'cat_snacks', name: 'ของทานเล่น', orderIndex: 2 },
];

// The EXACT 5 items requested by the user:
export const EXACT_INITIAL_MENUS: Omit<MenuItem, 'id'>[] = [
  {
    name: 'สเต็กหมู',
    price: 69,
    category: 'สเต็ก',
    description: 'สเต็กหมูหมักนุ่มสูตรพิเศษ ย่างหอมกรุ่น เสิร์ฟพร้อมเฟรนช์ฟรายส์ สลัดผัก และน้ำสลัด',
    imageUrl: '/images/steak_moo_1791353856229.jpg',
    isAvailable: true,
    isPublished: true,
    orderIndex: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: 'สเต็กไก่',
    price: 59,
    category: 'สเต็ก',
    description: 'สเต็กอกไก่นุ่ม ย่างพริกไทยดำหอมกลมกล่อม เสิร์ฟพร้อมเฟรนช์ฟรายส์และสลัดผักสด',
    imageUrl: '/images/steak_gai_1791353798435.jpg',
    isAvailable: true,
    isPublished: true,
    orderIndex: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: 'สลัดไก่',
    price: 49,
    category: 'สลัด',
    description: 'ผักสลัดสดใหม่ กะหล่ำม่วง แครอท ข้าวโพดหวาน ท็อปด้วยเนื้อไก่ย่างนุ่ม พร้อมน้ำสลัดเข้มข้น',
    imageUrl: '/images/salad_gai_1791353810767.jpg',
    isAvailable: true,
    isPublished: true,
    orderIndex: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: 'เกี๊ยวน้ำหมูสับ',
    price: 35,
    category: 'ของทานเล่น',
    description: 'เกี๊ยวหมูสับคำโต แป้งนุ่มหมูแน่น ในน้ำซุปใสหอมหวานกลมกล่อม โรยกระเทียมเจียวหอมๆ',
    imageUrl: '/images/kiao_nam_1791353821099.jpg',
    isAvailable: true,
    isPublished: true,
    orderIndex: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: 'เกี๊ยวหมูสับทอด',
    price: 35,
    category: 'ของทานเล่น',
    description: 'เกี๊ยวหมูสับทอดกรอบสีทอง กรอบอร่อยเคี้ยวเพลิน เสิร์ฟพร้อมน้ำจิ้มไก่รสหวานกลมกล่อม',
    imageUrl: '/images/kiao_thod_1791353830468.jpg',
    isAvailable: true,
    isPublished: true,
    orderIndex: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Helper: Normalize menu image URLs so published site never loses images
export function normalizeMenuImageUrl(url?: string, menuName?: string): string {
  return resolveMenuImageUrl(url, menuName);
}
export { resolveMenuImageUrl, DEFAULT_FALLBACK_IMAGE };

// Helper: Format current Month/Year in Thai (e.g., 10/2569)
export function getThaiMonthYear(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear() + 543;
  return `${month}/${year}`;
}

// Helper: Format ISO timestamp to Thai Date & Time (e.g., "9 ต.ค. 2569, 14:20 น.")
export function formatThaiDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    const day = d.getDate();
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];
    const month = thaiMonths[d.getMonth()];
    const year = d.getFullYear() + 543;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes} น.`;
  } catch {
    return '-';
  }
}

// Helper: Format ISO timestamp to Thai Month/Year (e.g., "10/2569")
export function formatOrderThaiMonth(isoString?: string): string {
  if (!isoString) return getThaiMonthYear();
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return getThaiMonthYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear() + 543;
    return `${month}/${year}`;
  } catch {
    return getThaiMonthYear();
  }
}

// Normalize order status to strict allowed statuses
export function normalizeOrderStatus(rawStatus?: string): OrderStatus {
  if (rawStatus === 'กำลังทำ') return 'กำลังทำ';
  if (rawStatus === 'กำลังส่ง' || rawStatus === 'ออกไปส่ง') return 'กำลังส่ง';
  if (rawStatus === 'ส่งแล้ว') return 'ส่งแล้ว';
  if (rawStatus === 'ยกเลิก') return 'ยกเลิก';
  return 'รับออเดอร์';
}

// Strictly 1-way order status forward transitions
export const NEXT_ORDER_STATUS_MAP: Record<OrderStatus, OrderStatus | null> = {
  'รับออเดอร์': 'กำลังทำ',
  'กำลังทำ': 'กำลังส่ง',
  'กำลังส่ง': 'ส่งแล้ว',
  'ส่งแล้ว': null,
  'ยกเลิก': null,
};

// Subscribe Menus
export function subscribeMenus(
  onUpdate: (menus: MenuItem[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const menusRef = collection(db, 'menus');
  const q = query(menusRef, orderBy('orderIndex', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: MenuItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          name: data.name || '',
          price: Number(data.price) || 0,
          category: data.category || 'สเต็ก',
          imageUrl: normalizeMenuImageUrl(data.imageUrl),
          description: data.description || '',
          isAvailable: Boolean(data.isAvailable),
          isPublished: data.isPublished !== undefined ? Boolean(data.isPublished) : true,
          orderIndex: Number(data.orderIndex) ?? 0,
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
        });
      });
      items.sort((a, b) => a.orderIndex - b.orderIndex);
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'menus');
    }
  );
}

// Subscribe Categories
export function subscribeCategories(
  onUpdate: (categories: CategoryItem[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const catRef = collection(db, 'categories');
  const q = query(catRef, orderBy('orderIndex', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: CategoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          name: data.name || '',
          orderIndex: Number(data.orderIndex) || 0,
        });
      });
      items.sort((a, b) => a.orderIndex - b.orderIndex);
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'categories');
    }
  );
}

// Subscribe Orders
export function subscribeOrders(
  onUpdate: (orders: Order[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const ordersRef = collection(db, 'orders');
  const q = query(ordersRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const normStatus = normalizeOrderStatus(data.status);
        const isCancelled = Boolean(data.isCancelled || normStatus === 'ยกเลิก');
        const isArchived = Boolean(data.isArchived || normStatus === 'ส่งแล้ว' || isCancelled);

        // Infer or read deliveryType from Firestore document
        const rawDeliveryType = data.deliveryType as DiningType | undefined;
        const inferredDeliveryType: DiningType =
          rawDeliveryType ||
          (typeof data.address === 'string' && data.address.includes('มาทานที่ร้าน')
            ? 'มาทานที่ร้าน'
            : (typeof data.address === 'string' && data.address.includes('นัดรับ')) ||
              (typeof data.deliveryArea === 'string' && data.deliveryArea.includes('นัดรับ'))
            ? 'นัดรับอาหาร'
            : 'ส่งอาหารที่บ้าน');

        orders.push({
          id: docSnap.id,
          orderNumber: data.orderNumber || docSnap.id,
          customerName: data.customerName || '',
          customerPhone: data.customerPhone || '',
          address: data.address || '',
          deliveryType: inferredDeliveryType,
          gps: data.gps || null,
          distanceKm: typeof data.distanceKm === 'number' ? data.distanceKm : undefined,
          items: data.items || [],
          subtotal: Number(data.subtotal) || 0,
          deliveryArea: data.deliveryArea || '',
          deliveryFee: Number(data.deliveryFee) || 0,
          totalAmount: Number(data.totalAmount) || 0,
          status: normStatus,
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
          isArchived,
          isCancelled,
          cancelledAt: data.cancelledAt,
          cancelReason: data.cancelReason,
          isOutOfDeliveryZone: Boolean(
            data.isOutOfDeliveryZone ||
              (typeof data.distanceKm === 'number' && data.distanceKm > 12)
          ),
          earnedRewardsNotice: Array.isArray(data.earnedRewardsNotice) ? data.earnedRewardsNotice : [],
        });
      });
      onUpdate(orders);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'orders');
    }
  );
}

// Subscribe Customers (Customer History)
export function subscribeCustomers(
  onUpdate: (customers: CustomerRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const custRef = collection(db, 'customers');

  return onSnapshot(
    custRef,
    (snapshot) => {
      const records: CustomerRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        records.push({
          phone: docSnap.id,
          name: data.name || '',
          address: data.address || '',
          orderCount: Number(data.orderCount) || 1,
          lastOrderMonthYear: data.lastOrderMonthYear || getThaiMonthYear(),
          lastOrderAt: data.lastOrderAt || '',
          itemCounts: data.itemCounts || {},
          redeemedCoke: Number(data.redeemedCoke) || 0,
          redeemedItems: data.redeemedItems || {},
        });
      });
      // Sort by latest order first (ล่าสุดให้อยู่บนสุด)
      records.sort((a, b) => {
        const timeA = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
        const timeB = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.orderCount || 0) - (a.orderCount || 0);
      });
      onUpdate(records);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'customers');
    }
  );
}

// Create a new order
export async function createOrder(data: {
  customerName: string;
  customerPhone: string;
  address: string;
  deliveryType?: DiningType;
  gps?: { lat: number; lng: number } | null;
  distanceKm?: number;
  items: { menuId: string; name: string; price: number; quantity: number }[];
  subtotal: number;
  deliveryArea: string;
  deliveryFee: number;
  totalAmount: number;
  earnedRewardsNotice?: string[];
}): Promise<string> {
  const orderNumber = `BSO-${Date.now().toString().slice(-6)}`;
  const orderId = `order_${Date.now()}`;
  const orderRef = doc(db, 'orders', orderId);

  // Check whether the shop is open in Firestore
  try {
    const settingsDocRef = doc(db, 'settings', 'shop');
    const settingsSnap = await getDoc(settingsDocRef);
    if (settingsSnap.exists()) {
      const sData = settingsSnap.data();
      if (sData.isOpen === false) {
        throw new Error('ขณะนี้ร้านปิด ยังไม่สามารถสั่งอาหารได้');
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('ขณะนี้ร้านปิด')) {
      throw err;
    }
  }

  const isOutOfZone = Boolean(
    typeof data.distanceKm === 'number' && data.distanceKm > 12
  );

  const payload = {
    orderNumber,
    customerName: data.customerName.trim(),
    customerPhone: data.customerPhone.trim(),
    address: data.address.trim(),
    deliveryType: data.deliveryType || 'ส่งอาหารที่บ้าน',
    gps: data.gps || null,
    latitude: data.gps ? data.gps.lat : null,
    longitude: data.gps ? data.gps.lng : null,
    distanceKm: typeof data.distanceKm === 'number' ? data.distanceKm : null,
    isOutOfDeliveryZone: isOutOfZone,
    earnedRewardsNotice: data.earnedRewardsNotice || [],
    items: data.items,
    subtotal: data.subtotal,
    deliveryArea: data.deliveryArea,
    deliveryFee: data.deliveryFee,
    totalAmount: data.totalAmount,
    status: 'รับออเดอร์' as OrderStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(orderRef, payload);

    // Register or update customer record in Firestore immediately
    if (data.customerPhone) {
      const cleanPhone = data.customerPhone.trim().replace(/[^0-9]/g, '');
      if (cleanPhone) {
        try {
          const custRef = doc(db, 'customers', cleanPhone);
          const custSnap = await getDoc(custRef);
          const existingData = custSnap.exists() ? (custSnap.data() || {}) : {};
          const currentCount = custSnap.exists()
            ? Number(existingData.orderCount || 1)
            : 1;

          await setDoc(
            custRef,
            {
              name: data.customerName.trim(),
              phone: data.customerPhone.trim(),
              address: data.address.trim(),
              monthYear: getThaiMonthYear(),
              lastOrderMonthYear: getThaiMonthYear(),
              orderCount: currentCount,
              lastOrderAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (custErr) {
          console.warn('Customer upsert on createOrder non-fatal warning:', custErr);
        }
      }
    }

    return orderNumber;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `orders/${orderId}`);
  }
}

// Cancel an order (Removes from active list, retains items history for best seller metrics without customer point accumulation)
export async function cancelOrder(order: Order, reason: string = 'ยกเลิกโดยร้าน'): Promise<void> {
  const orderRef = doc(db, 'orders', order.id);
  const updatePayload = {
    status: 'ยกเลิก' as OrderStatus,
    isArchived: true,
    isCancelled: true,
    cancelReason: reason,
    cancelledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await updateDoc(orderRef, updatePayload);
  } catch (error) {
    try {
      await setDoc(orderRef, updatePayload, { merge: true });
    } catch (fallbackError) {
      handleFirestoreError(fallbackError, OperationType.UPDATE, `orders/${order.id}`);
      throw fallbackError;
    }
  }
}

// Query customer rewards eligibility by phone for checkout display
export async function getCustomerRewardsByPhone(rawPhone: string): Promise<{
  phone: string;
  orderCount: number;
  availableCoke: number;
  freeDishes: Array<{ name: string; available: number }>;
  allRewardsSummary: string[];
}> {
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  if (!cleanPhone) {
    return { phone: '', orderCount: 0, availableCoke: 0, freeDishes: [], allRewardsSummary: [] };
  }
  try {
    const custRef = doc(db, 'customers', cleanPhone);
    const snap = await getDoc(custRef);
    if (!snap.exists()) {
      return { phone: cleanPhone, orderCount: 0, availableCoke: 0, freeDishes: [], allRewardsSummary: [] };
    }
    const data = snap.data();
    const orderCount = Number(data.orderCount) || 0;
    const totalCokeEarned = Math.floor(orderCount / 20);
    const redeemedCoke = Number(data.redeemedCoke) || 0;
    const availableCoke = Math.max(0, totalCokeEarned - redeemedCoke);

    const itemCounts = (data.itemCounts || {}) as Record<string, number>;
    const redeemedItems = (data.redeemedItems || {}) as Record<string, number>;
    const freeDishes: Array<{ name: string; available: number }> = [];

    Object.entries(itemCounts).forEach(([name, count]) => {
      const earned = Math.floor(count / 10);
      const used = redeemedItems[name] || 0;
      const avail = Math.max(0, earned - used);
      if (avail > 0) {
        freeDishes.push({ name, available: avail });
      }
    });

    const allRewardsSummary: string[] = [];
    if (availableCoke > 0) {
      allRewardsSummary.push(`ฟรีน้ำโค้ก ${availableCoke} ขวด (สะสมครบ 20 ออเดอร์)`);
    }
    freeDishes.forEach((d) => {
      allRewardsSummary.push(`ฟรี "${d.name}" ${d.available} ออเดอร์ (สะสมครบ 10 ออเดอร์)`);
    });

    return {
      phone: cleanPhone,
      orderCount,
      availableCoke,
      freeDishes,
      allRewardsSummary,
    };
  } catch (err) {
    console.warn('Could not query customer rewards:', err);
    return { phone: cleanPhone, orderCount: 0, availableCoke: 0, freeDishes: [], allRewardsSummary: [] };
  }
}

// Update order status & record customer summary when status is "ส่งแล้ว"
// Strictly 1-way: รับออเดอร์ -> กำลังทำ -> กำลังส่ง -> ส่งแล้ว
export async function updateOrderStatus(order: Order, newStatus: OrderStatus): Promise<void> {
  const currentStatus = normalizeOrderStatus(order.status);
  const targetStatus = normalizeOrderStatus(newStatus);

  // Status transitions can ONLY go forward:
  if (currentStatus === 'ส่งแล้ว') {
    throw new Error('ออเดอร์นี้จัดส่งแล้ว ไม่สามารถเปลี่ยนสถานะได้');
  }

  const allowedNext = NEXT_ORDER_STATUS_MAP[currentStatus];
  if (allowedNext !== targetStatus) {
    throw new Error(`ไม่อนุญาตให้ย้อนสถานะหรือข้ามสถานะ (จาก "${currentStatus}" ไป "${targetStatus}")`);
  }

  const orderRef = doc(db, 'orders', order.id);

  try {
    const isArchived = targetStatus === 'ส่งแล้ว';
    await updateDoc(orderRef, {
      status: targetStatus,
      isArchived: isArchived,
      updatedAt: new Date().toISOString(),
    });

    // When status changes to "ส่งแล้ว":
    // 1. บันทึก/อัปเดตข้อมูลลูกค้าในฐานข้อมูลลูกค้า
    // 2. ใช้เบอร์โทรศัพท์ลูกค้าเป็นตัวระบุลูกค้า
    // 3. ถ้ามีเบอร์นี้อยู่แล้ว ให้เพิ่มจำนวนครั้งที่สั่งซื้อ +1
    // 4. ถ้าเป็นลูกค้าใหม่ ให้สร้างข้อมูลลูกค้าใหม่
    // 5. ฐานข้อมูลลูกค้าเก็บ: ชื่อลูกค้า, เบอร์โทร, ที่อยู่, เดือน/ปี, จำนวนครั้งที่สั่งซื้อ
    // 6. ไม่ต้องเก็บรายการอาหารเก่าไว้ในฐานข้อมูลลูกค้า
    // 7. ไม่ต้องเก็บ GPS เก่าไว้ในฐานข้อมูลลูกค้า
    if (targetStatus === 'ส่งแล้ว' && order.customerPhone) {
      const rawPhone = order.customerPhone.trim();
      const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
      if (cleanPhone) {
        const custRef = doc(db, 'customers', cleanPhone);
        const existingSnap = await getDoc(custRef);

        const existingData = existingSnap.exists() ? (existingSnap.data() || {}) : {};
        const currentCount = existingSnap.exists()
          ? Number(existingData.orderCount || 0) + 1
          : 1;

        // บันทึก/สะสมจำนวนจานของแต่ละเมนู: สั่งครบทุก 10 ออเดอร์ของแต่ละอย่าง ฟรี 1 ออเดอร์
        const currentItemCounts: Record<string, number> = { ...(existingData.itemCounts || {}) };
        if (Array.isArray(order.items)) {
          for (const itm of order.items) {
            if (itm.name) {
              const q = Number(itm.quantity) || 1;
              currentItemCounts[itm.name] = (currentItemCounts[itm.name] || 0) + q;
            }
          }
        }

        await setDoc(
          custRef,
          {
            name: order.customerName.trim(),
            phone: rawPhone,
            address: order.address.trim(),
            monthYear: getThaiMonthYear(),
            lastOrderMonthYear: getThaiMonthYear(),
            orderCount: currentCount,
            itemCounts: currentItemCounts,
            lastOrderAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
  }
}

// Redeem customer loyalty reward (Coke or Free item)
export async function redeemCustomerReward(
  rawPhone: string,
  rewardType: 'coke' | 'item',
  itemName?: string
): Promise<void> {
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return;

  const custRef = doc(db, 'customers', cleanPhone);
  try {
    const snap = await getDoc(custRef);
    if (!snap.exists()) return;

    const data = snap.data();
    if (rewardType === 'coke') {
      const currentCoke = Number(data.redeemedCoke || 0) + 1;
      await updateDoc(custRef, {
        redeemedCoke: currentCoke,
        updatedAt: new Date().toISOString(),
      });
    } else if (rewardType === 'item' && itemName) {
      const currentItems: Record<string, number> = { ...(data.redeemedItems || {}) };
      currentItems[itemName] = (currentItems[itemName] || 0) + 1;
      await updateDoc(custRef, {
        redeemedItems: currentItems,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `customers/${cleanPhone}`);
  }
}

// Menu Management Functions for Admin
export async function addMenuItem(data: Omit<MenuItem, 'id'>): Promise<string> {
  const menuId = `menu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const menuRef = doc(db, 'menus', menuId);

  const payload = {
    name: data.name.trim().slice(0, 120),
    price: Number(data.price),
    category: data.category.trim().slice(0, 60),
    imageUrl: (data.imageUrl || '').slice(0, 1000),
    description: (data.description || '').slice(0, 800),
    isAvailable: Boolean(data.isAvailable),
    isPublished: Boolean(data.isPublished),
    orderIndex: Number(data.orderIndex),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(menuRef, payload);
    return menuId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `menus/${menuId}`);
  }
}

export async function updateMenuItem(id: string, data: Partial<MenuItem>): Promise<void> {
  const menuRef = doc(db, 'menus', id);
  const payload: Record<string, any> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name !== undefined) payload.name = data.name.trim().slice(0, 120);
  if (data.price !== undefined) payload.price = Math.max(0, Number(data.price));
  if (data.category !== undefined) payload.category = data.category.trim().slice(0, 60);
  if (data.imageUrl !== undefined) payload.imageUrl = data.imageUrl.slice(0, 1000);
  if (data.description !== undefined) payload.description = data.description.slice(0, 800);
  if (data.isAvailable !== undefined) payload.isAvailable = Boolean(data.isAvailable);
  if (data.isPublished !== undefined) payload.isPublished = Boolean(data.isPublished);
  if (data.orderIndex !== undefined) payload.orderIndex = Number(data.orderIndex);

  try {
    await updateDoc(menuRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `menus/${id}`);
  }
}

export async function deleteMenuItem(id: string): Promise<void> {
  const menuRef = doc(db, 'menus', id);
  try {
    await deleteDoc(menuRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `menus/${id}`);
  }
}

export async function toggleMenuItemAvailability(id: string, current: boolean): Promise<boolean> {
  const next = !current;
  await updateMenuItem(id, { isAvailable: next });
  return next;
}

export async function toggleMenuItemPublish(id: string, current: boolean): Promise<boolean> {
  const next = !current;
  await updateMenuItem(id, { isPublished: next });
  return next;
}

export async function reorderMenuItem(
  item: MenuItem,
  direction: 'up' | 'down',
  allItems: MenuItem[]
): Promise<void> {
  const currentIndex = allItems.findIndex((m) => m.id === item.id);
  if (currentIndex === -1) return;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= allItems.length) return;

  const targetItem = allItems[targetIndex];
  const currentOrder = item.orderIndex;
  const targetOrder = targetItem.orderIndex;

  const resolvedTarget = targetOrder === currentOrder
    ? (direction === 'up' ? currentOrder - 1 : currentOrder + 1)
    : targetOrder;

  await Promise.all([
    updateMenuItem(item.id, { orderIndex: resolvedTarget }),
    updateMenuItem(targetItem.id, { orderIndex: currentOrder }),
  ]);
}

export async function addCategory(name: string, orderIndex: number): Promise<string> {
  const catId = `cat_${Date.now()}`;
  const catRef = doc(db, 'categories', catId);
  try {
    await setDoc(catRef, { name: name.trim().slice(0, 60), orderIndex });
    return catId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `categories/${catId}`);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const catRef = doc(db, 'categories', id);
  try {
    await deleteDoc(catRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
  }
}

// Reset & Seed EXACTLY the user's 5 items for "บ้าน สเต็กออนไลน์"
export async function initializeBaanSteakMenu(forceReset: boolean = false): Promise<void> {
  try {
    // 1. Ensure settings/shop always uses the latest cover image
    try {
      const shopRef = doc(db, 'settings', 'shop');
      const shopSnap = await getDoc(shopRef);
      if (!shopSnap.exists()) {
        await setDoc(
          shopRef,
          { heroBannerUrl: '/IMG_20261007_161813.jpg', isOpen: true },
          { merge: true }
        );
      } else {
        const data = shopSnap.data();
        if (
          !data.heroBannerUrl ||
          data.heroBannerUrl !== '/IMG_20261007_161813.jpg' ||
          data.heroBannerUrl.includes('file_00000000322c8230a99655a0452e2494')
        ) {
          await setDoc(
            shopRef,
            { heroBannerUrl: '/IMG_20261007_161813.jpg' },
            { merge: true }
          );
        }
      }
    } catch {
      // ignore non-fatal settings sync
    }

    const menusSnap = await getDocs(collection(db, 'menus'));
    
    // Check if we already have the exact menus and don't need reset
    if (!forceReset && !menusSnap.empty) {
      // Check if existing items contain old placeholder like "Wagyu" or "Salmon"
      let hasOldMockData = false;
      menusSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.name && (data.name.includes('Wagyu') || data.name.includes('Salmon') || data.name.includes('ทีโบน'))) {
          hasOldMockData = true;
        }
      });
      if (!hasOldMockData) {
        return; // already clean and accurate
      }
    }

    // Delete existing old mock items to fulfill: "ลบข้อมูลตัวอย่างทั้งหมดที่ไม่ได้มาจากข้อมูลด้านบน"
    for (const docSnap of menusSnap.docs) {
      await deleteDoc(doc(db, 'menus', docSnap.id));
    }

    // Clear and set categories
    const catSnap = await getDocs(collection(db, 'categories'));
    for (const docSnap of catSnap.docs) {
      await deleteDoc(doc(db, 'categories', docSnap.id));
    }
    for (const cat of INITIAL_CATEGORIES) {
      await setDoc(doc(db, 'categories', cat.id), cat);
    }

    // Populate EXACT 5 items for "บ้าน สเต็กออนไลน์"
    for (let i = 0; i < EXACT_INITIAL_MENUS.length; i++) {
      const item = EXACT_INITIAL_MENUS[i];
      const menuId = `menu_00${i + 1}`;
      await setDoc(doc(db, 'menus', menuId), {
        ...item,
        orderIndex: i,
      });
    }

    // Ensure settings/shop uses the new cover image
    try {
      const shopRef = doc(db, 'settings', 'shop');
      const shopSnap = await getDoc(shopRef);
      if (!shopSnap.exists()) {
        await setDoc(shopRef, {
          heroBannerUrl: '/IMG_20261007_161813.jpg',
        }, { merge: true });
      } else {
        const data = shopSnap.data();
        if (!data.heroBannerUrl || data.heroBannerUrl.includes('file_00000000322c8230a99655a0452e2494')) {
          await setDoc(shopRef, {
            heroBannerUrl: '/IMG_20261007_161813.jpg',
          }, { merge: true });
        }
      }
    } catch {
      // ignore non-fatal settings sync
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'menus');
  }
}

// Subscribe to Shop Hero Banner
export function subscribeShopHeroBanner(
  onUpdate: (bannerUrl: string) => void
): () => void {
  const localBanner = localStorage.getItem('baan_steak_custom_hero');
  if (localBanner) {
    onUpdate(localBanner);
  }

  const settingsDocRef = doc(db, 'settings', 'shop');
  return onSnapshot(
    settingsDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.heroBannerUrl) {
          localStorage.setItem('baan_steak_custom_hero', data.heroBannerUrl);
          onUpdate(data.heroBannerUrl);
        }
      }
    },
    (err) => {
      console.warn('Could not subscribe to shop settings banner:', err);
    }
  );
}

// Update Shop Hero Banner
export async function updateShopHeroBanner(dataUrl: string): Promise<void> {
  localStorage.setItem('baan_steak_custom_hero', dataUrl);
  try {
    const settingsDocRef = doc(db, 'settings', 'shop');
    await setDoc(settingsDocRef, { heroBannerUrl: dataUrl }, { merge: true });
  } catch (err) {
    console.warn('Failed to sync banner to Firestore, saved locally:', err);
  }
}

// Reset Shop Hero Banner
export async function resetShopHeroBanner(): Promise<void> {
  localStorage.removeItem('baan_steak_custom_hero');
  try {
    const settingsDocRef = doc(db, 'settings', 'shop');
    await deleteDoc(settingsDocRef);
  } catch (err) {
    console.warn('Failed to delete settings doc:', err);
  }
}

