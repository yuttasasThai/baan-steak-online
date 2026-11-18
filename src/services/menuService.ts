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
import { CategoryItem, CustomerRecord, DailyExpenseItem, DailyExpenseRecord, DiningType, MenuItem, Order, OrderItem, OrderItemStatus, OrderStatus, RestaurantTable, ShopSettings } from '../types';
import { resolveMenuImageUrl, DEFAULT_FALLBACK_IMAGE } from '../utils/menuImages';
import { sendOrderNotification } from './notificationService';
import { CURRENT_REVISION } from '../revisionInfo';

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
  shopLatitude: 16.5373606, // พิกัด บ้านสเต็กออนไลน์ ประยูรพืชผล อ.ชุมแพ จ.ขอนแก่น 40130
  shopLongitude: 102.102266,
  heroBannerUrl: '/IMG_20261007_161813.jpg',
  hideAdminButtonInCustomerView: false,
  lineNotifyEnabled: false,
  notificationProvider: 'line_oa',
  lineChannelAccessToken: '',
  lineDestinationId: '',
  webhookUrl: '',
  lineNotifyToken: '',
  lineNotifySendOnCreate: true,
  recommendedMenuMode: 'auto',
  recommendedMenuIds: [],
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
        const rawLat = typeof data.shopLatitude === 'number' ? data.shopLatitude : DEFAULT_SHOP_SETTINGS.shopLatitude;
        const rawLng = typeof data.shopLongitude === 'number' ? data.shopLongitude : DEFAULT_SHOP_SETTINGS.shopLongitude;
        const isLegacyDefaultPin =
          Math.abs(rawLat - 16.5447) < 0.0001 && Math.abs(rawLng - 102.1005) < 0.0001;

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
          shopLatitude: isLegacyDefaultPin ? DEFAULT_SHOP_SETTINGS.shopLatitude : rawLat,
          shopLongitude: isLegacyDefaultPin ? DEFAULT_SHOP_SETTINGS.shopLongitude : rawLng,
          heroBannerUrl:
            data.heroBannerUrl &&
            !data.heroBannerUrl.includes('file_00000000322c8230a99655a0452e2494')
              ? data.heroBannerUrl
              : '/IMG_20261007_161813.jpg',
          hideAdminButtonInCustomerView: Boolean(data.hideAdminButtonInCustomerView),
          lineNotifyEnabled: Boolean(data.lineNotifyEnabled),
          notificationProvider: data.notificationProvider || DEFAULT_SHOP_SETTINGS.notificationProvider,
          lineChannelAccessToken: typeof data.lineChannelAccessToken === 'string' ? data.lineChannelAccessToken : '',
          lineDestinationId: typeof data.lineDestinationId === 'string' ? data.lineDestinationId : '',
          lineNotifyToken: typeof data.lineNotifyToken === 'string' ? data.lineNotifyToken : '',
          webhookUrl: typeof data.webhookUrl === 'string' ? data.webhookUrl : '',
          lineNotifySendOnCreate: data.lineNotifySendOnCreate !== false,
          recommendedMenuMode: data.recommendedMenuMode === 'manual' ? 'manual' : 'auto',
          recommendedMenuIds: Array.isArray(data.recommendedMenuIds)
            ? data.recommendedMenuIds.filter((id: unknown): id is string => typeof id === 'string')
            : [],
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

// Initial default tables (8 โต๊ะ)
export const INITIAL_TABLES: RestaurantTable[] = Array.from({ length: 8 }, (_, i) => ({
  id: `table_${i + 1}`,
  number: i + 1,
  name: `โต๊ะ ${i + 1}`,
  isOccupied: false,
}));

// Subscribe to Tables Real-Time
export function subscribeTables(
  onUpdate: (tables: RestaurantTable[]) => void
): () => void {
  const tableDocRef = doc(db, 'settings', 'tables');
  return onSnapshot(
    tableDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.tables) && data.tables.length > 0) {
          onUpdate(data.tables);
          return;
        }
      }
      // Initialize if empty
      setDoc(
        tableDocRef,
        { tables: INITIAL_TABLES, updatedAt: new Date().toISOString() },
        { merge: true }
      ).catch(() => {});
      onUpdate(INITIAL_TABLES);
    },
    (err) => {
      console.warn('Error subscribing tables:', err);
      onUpdate(INITIAL_TABLES);
    }
  );
}

// Toggle or update single table status (ว่าง / เต็ม)
export async function updateTableStatus(
  tableId: string,
  isOccupied: boolean,
  source: 'order' | 'manual' = 'manual'
): Promise<void> {
  const tableDocRef = doc(db, 'settings', 'tables');
  const snap = await getDoc(tableDocRef);
  let currentTables: RestaurantTable[] = INITIAL_TABLES;
  if (snap.exists() && Array.isArray(snap.data().tables)) {
    currentTables = snap.data().tables;
  }
  const updated = currentTables.map((t) => {
    if (t.id !== tableId) return t;
    const { occupiedSource: _prev, ...rest } = t;
    return isOccupied
      ? { ...rest, isOccupied: true, occupiedSource: source, updatedAt: new Date().toISOString() }
      : { ...rest, isOccupied: false, updatedAt: new Date().toISOString() };
  });
  await setDoc(tableDocRef, { tables: updated, updatedAt: new Date().toISOString() }, { merge: true });
}

// Set total table count (e.g. 1 to 30 โต๊ะ)
export async function setTotalTableCount(count: number): Promise<void> {
  const validCount = Math.max(1, Math.min(50, count));
  const tableDocRef = doc(db, 'settings', 'tables');
  const snap = await getDoc(tableDocRef);
  let currentTables: RestaurantTable[] = [];
  if (snap.exists() && Array.isArray(snap.data().tables)) {
    currentTables = snap.data().tables;
  }

  const newTables: RestaurantTable[] = [];
  for (let i = 1; i <= validCount; i++) {
    const existing = currentTables.find((t) => t.number === i || t.id === `table_${i}`);
    if (existing) {
      newTables.push(existing);
    } else {
      newTables.push({
        id: `table_${i}`,
        number: i,
        name: `โต๊ะ ${i}`,
        isOccupied: false,
      });
    }
  }

  await setDoc(tableDocRef, { tables: newTables, updatedAt: new Date().toISOString() }, { merge: true });
}

// Set all tables status (ว่างทั้งหมด หรือ เต็มทั้งหมด)
export async function setAllTablesStatus(isOccupied: boolean): Promise<void> {
  const tableDocRef = doc(db, 'settings', 'tables');
  const snap = await getDoc(tableDocRef);
  let currentTables: RestaurantTable[] = INITIAL_TABLES;
  if (snap.exists() && Array.isArray(snap.data().tables)) {
    currentTables = snap.data().tables;
  }
  const updated = currentTables.map((t) => {
    const { occupiedSource: _prev, ...rest } = t;
    return isOccupied
      ? { ...rest, isOccupied: true, occupiedSource: 'manual' as const, updatedAt: new Date().toISOString() }
      : { ...rest, isOccupied: false, updatedAt: new Date().toISOString() };
  });
  await setDoc(tableDocRef, { tables: updated, updatedAt: new Date().toISOString() }, { merge: true });
}

// Add custom table name
export async function addCustomTable(name: string): Promise<void> {
  const tableDocRef = doc(db, 'settings', 'tables');
  const snap = await getDoc(tableDocRef);
  let currentTables: RestaurantTable[] = INITIAL_TABLES;
  if (snap.exists() && Array.isArray(snap.data().tables)) {
    currentTables = snap.data().tables;
  }
  const nextNum = currentTables.length + 1;
  const newTable: RestaurantTable = {
    id: `table_${Date.now()}`,
    number: nextNum,
    name: name.trim() || `โต๊ะ ${nextNum}`,
    isOccupied: false,
  };
  await setDoc(tableDocRef, { tables: [...currentTables, newTable], updatedAt: new Date().toISOString() }, { merge: true });
}

// Delete custom table
export async function deleteTable(tableId: string): Promise<void> {
  const tableDocRef = doc(db, 'settings', 'tables');
  const snap = await getDoc(tableDocRef);
  if (!snap.exists() || !Array.isArray(snap.data().tables)) return;
  const filtered = snap.data().tables.filter((t: RestaurantTable) => t.id !== tableId);
  await setDoc(tableDocRef, { tables: filtered, updatedAt: new Date().toISOString() }, { merge: true });
}

export const INITIAL_CATEGORIES: CategoryItem[] = [
  { id: 'cat_steak', name: 'สเต็ก', orderIndex: 0 },
  { id: 'cat_salad', name: 'สลัด', orderIndex: 1 },
  { id: 'cat_snacks', name: 'ของทานเล่น', orderIndex: 2 },
  { id: 'cat_drinks', name: 'เครื่องดื่ม', orderIndex: 3 },
];

export const CATEGORY_PRIORITY_ORDER = ['สเต็ก', 'สลัด', 'ของทานเล่น', 'เครื่องดื่ม'];

export function getCategoryPriorityIndex(categoryName?: string, categories?: CategoryItem[]): number {
  if (!categoryName) return 999;
  const trimmed = categoryName.trim();
  const idx = CATEGORY_PRIORITY_ORDER.indexOf(trimmed);
  if (idx !== -1) return idx;
  if (categories && categories.length > 0) {
    const found = categories.find((c) => c.name.trim() === trimmed || c.id === trimmed);
    if (found) return 100 + (found.orderIndex ?? 0);
  }
  return 999;
}

export function sortCategories(categories: CategoryItem[]): CategoryItem[] {
  return [...categories].sort((a, b) => {
    const idxA = getCategoryPriorityIndex(a.name);
    const idxB = getCategoryPriorityIndex(b.name);
    if (idxA !== idxB) return idxA - idxB;
    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
  });
}

export function isDrinkCategory(categoryName?: string): boolean {
  if (!categoryName) return false;
  const normalized = categoryName.trim().toLowerCase();
  return (
    normalized === 'เครื่องดื่ม' ||
    normalized.includes('เครื่องดื่ม') ||
    normalized.includes('drink') ||
    normalized.includes('beverage')
  );
}

/**
 * จัดเรียงเมนูอาหารตามความต้องการล่าสุด:
 * 1) เมนูอาหารทั้งหมด (ไม่ใช่เครื่องดื่ม) อยู่ด้านบน — เมนูเครื่องดื่มจัดไว้ด้านล่างเสมอ
 * 2) ภายในกลุ่มอาหาร และภายในกลุ่มเครื่องดื่ม: เรียงลำดับตามราคาจาก "ราคาน้อย (ถูก) อยู่บน" -> "ราคาแพงอยู่ล่าง" ทุกครั้ง
 * 3) หากราคาเท่ากัน: ใช้ลำดับหมวดหมู่, orderIndex และชื่อภาษาไทยตามลำดับ
 */
export function sortMenus(items: MenuItem[], categories?: CategoryItem[]): MenuItem[] {
  return [...items].sort((a, b) => {
    const isDrinkA = isDrinkCategory(a.category);
    const isDrinkB = isDrinkCategory(b.category);
    if (isDrinkA !== isDrinkB) {
      return isDrinkA ? 1 : -1;
    }

    // ราคาถูกลงมาราคาแพงทุกครั้ง (lowest price first)
    if (a.price !== b.price) {
      return a.price - b.price;
    }

    const catA = getCategoryPriorityIndex(a.category, categories);
    const catB = getCategoryPriorityIndex(b.category, categories);
    if (catA !== catB) return catA - catB;

    if ((a.orderIndex ?? 0) !== (b.orderIndex ?? 0)) {
      return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
    }
    return a.name.localeCompare(b.name, 'th');
  });
}

// The core items for "บ้าน สเต็กออนไลน์" (สเต็ก, สลัด, ของทานเล่น, เครื่องดื่ม)
// เรียงลำดับ: สเต็กไก่ (59) -> สเต็กหมู (69) -> สลัด (49) -> ของทานเล่น (35) -> เครื่องดื่ม (10, 20, 25):
export const EXACT_INITIAL_MENUS: Omit<MenuItem, 'id'>[] = [
  {
    name: 'สเต็กไก่',
    price: 59,
    category: 'สเต็ก',
    description: 'สเต็กอกไก่นุ่ม ย่างพริกไทยดำหอมกลมกล่อม เสิร์ฟพร้อมเฟรนช์ฟรายส์และสลัดผักสด',
    imageUrl: '/images/steak_gai_1791353798435.jpg',
    isAvailable: true,
    isPublished: true,
    orderIndex: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: 'สเต็กหมู',
    price: 69,
    category: 'สเต็ก',
    description: 'สเต็กหมูหมักนุ่มสูตรพิเศษ ย่างหอมกรุ่น เสิร์ฟพร้อมเฟรนช์ฟรายส์ สลัดผัก และน้ำสลัด',
    imageUrl: '/images/steak_moo_1791353856229.jpg',
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
  {
    name: 'น้ำดื่มขวดเย็น',
    price: 10,
    category: 'เครื่องดื่ม',
    description: 'น้ำดื่มสะอาดบริสุทธิ์ แช่เย็นสดชื่น ดับกระหาย',
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    isPublished: true,
    orderIndex: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: 'โค้ก / เป๊ปซี่ เย็นฉ่ำ',
    price: 20,
    category: 'เครื่องดื่ม',
    description: 'น้ำอัดลมเย็นสดชื่น ซ่าถึงใจ เข้ากันดีกับสเต็ก',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    isPublished: true,
    orderIndex: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: 'ชามะนาวเย็น',
    price: 25,
    category: 'เครื่องดื่ม',
    description: 'ชาดำผสมมะนาวแท้ รสชาติเปรี้ยวอมหวาน หอมกลิ่นชา ดื่มแล้วสดชื่นทันที',
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    isPublished: true,
    orderIndex: 7,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: 'ชาเขียวเย็น',
    price: 25,
    category: 'เครื่องดื่ม',
    description: 'ชาเขียวหอมละมุน ชงสดเย็นชื่นใจ ดื่มง่าย หวานกำลังดี',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    isPublished: true,
    orderIndex: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    name: 'น้ำส้มเย็นสดชื่น',
    price: 25,
    category: 'เครื่องดื่ม',
    description: 'น้ำส้มรสชาติหวานอมเปรี้ยว สดชื่น อุดมด้วยวิตามินซี',
    imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    isPublished: true,
    orderIndex: 9,
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
  if (rawStatus === 'ส่งออเดอร์' || rawStatus === 'กำลังส่ง' || rawStatus === 'ออกไปส่ง') return 'ส่งออเดอร์';
  if (rawStatus === 'ส่งแล้ว' || rawStatus === 'สำเร็จ') return 'ส่งแล้ว';
  if (rawStatus === 'เช็คบิล') return 'เช็คบิล';
  if (rawStatus === 'ยกเลิก') return 'ยกเลิก';
  return 'รับออเดอร์';
}

// Strictly 1-way order status forward transitions: รับออเดอร์ -> กำลังทำ -> ส่งออเดอร์ -> ส่งแล้ว -> เช็คบิล
export const NEXT_ORDER_STATUS_MAP: Record<OrderStatus, OrderStatus | null> = {
  'รับออเดอร์': 'กำลังทำ',
  'กำลังทำ': 'ส่งออเดอร์',
  'ส่งออเดอร์': 'ส่งแล้ว',
  'กำลังส่ง': 'ส่งแล้ว',
  'ส่งแล้ว': 'เช็คบิล',
  'เช็คบิล': null,
  'ยกเลิก': null,
};

export interface MenuFetchAuditEntry {
  seq: number;
  readAt: string;
  readAtThai: string;
  fromCache: boolean;
  hasPendingWrites: boolean;
  totalDocs: number;
  changesCount: number;
  anomaliesCount: number;
  appRevision: string;
  host: string;
  anomalies: Array<{
    menuId: string;
    name: string;
    price: number;
    category: string;
    changeType: 'initial-scan' | 'added' | 'modified' | 'removed';
    readAt: string;
    readAtThai: string;
    fromCache: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
    createdSourceAppVersion: string;
    createdHost: string;
    inferredOrigin: string;
    anomalyReasons: string[];
  }>;
  changes: Array<{
    type: 'added' | 'modified' | 'removed';
    menuId: string;
    name: string;
    price: number;
    category: string;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    inferredOrigin: string;
  }>;
}

const MENU_FETCH_AUDIT_LOGS: MenuFetchAuditEntry[] = [];
const MAX_MENU_AUDIT_LOGS = 100;

export function getMenuFetchAuditLogs(): MenuFetchAuditEntry[] {
  return [...MENU_FETCH_AUDIT_LOGS];
}

function getRuntimeHost(): string {
  return typeof window !== 'undefined' ? window.location.host : 'server';
}

export function inferMenuCreatorOrigin(menuId: string, data: Record<string, any>): string {
  if (typeof data.createdBy === 'string' && data.createdBy.trim()) {
    return data.createdBy.trim();
  }
  if (/^menu_drink_\d+$/.test(menuId)) {
    return 'legacy-auto-drink-seeder (!hasDrinks)';
  }
  if (/^menu_00\d+$/.test(menuId)) {
    return 'legacy-exact-initial-seeder (hasOldMockData / forceReset)';
  }
  if (/^menu_seed_\d+_\d+$/.test(menuId)) {
    return 'explicit-initial-seeder';
  }
  if (/^menu_\d{13}_[a-z0-9]+$/i.test(menuId)) {
    return 'admin-manual-form (legacy-untagged)';
  }
  return 'unknown-external-client';
}

function detectMenuAnomalyReasons(
  menuId: string,
  data: Record<string, any>,
  inferredOrigin: string,
  changeType: 'initial-scan' | 'added' | 'modified' | 'removed',
  isRuntimeUpdate: boolean
): string[] {
  const reasons: string[] = [];
  const name = String(data.name || '').trim();
  const price = Number(data.price) || 0;

  if (/^menu_drink_\d+$/.test(menuId)) {
    reasons.push('legacy_auto_drink_id');
  }
  if (/^menu_00\d+$/.test(menuId)) {
    reasons.push('legacy_initial_seed_id');
  }
  if (/^menu_seed_\d+_\d+$/.test(menuId)) {
    reasons.push('explicit_seed_id');
  }
  if (!data.createdBy) {
    reasons.push('missing_createdBy_provenance');
  }
  if (AUTO_INJECTED_DRINK_NAMES.includes(name)) {
    reasons.push('matches_auto_injected_drink_name');
  }
  if ((name === 'เกี๊ยวน้ำหมูสับ' || name === 'เกี๊ยวหมูสับทอด') && !data.createdBy) {
    reasons.push('matches_legacy_snack_without_creator');
  }
  if (name === 'สเต็กไก่' && price === 59 && /^menu_00\d+$/.test(menuId)) {
    reasons.push('legacy_default_chicken_steak_price_59');
  }
  if (inferredOrigin === 'unknown-external-client') {
    reasons.push('unrecognized_doc_id_pattern');
  }
  if (isRuntimeUpdate && changeType === 'added' && (!data.createdBy || data.createdBy !== 'admin-manual')) {
    reasons.push('runtime_added_non_manual_source');
  }

  return reasons;
}

// Subscribe Menus
export function subscribeMenus(
  onUpdate: (menus: MenuItem[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const menusRef = collection(db, 'menus');
  const q = query(menusRef, orderBy('orderIndex', 'asc'));
  let snapshotSeq = 0;

  return onSnapshot(
    q,
    (snapshot) => {
      snapshotSeq += 1;
      const isInitialSnapshot = snapshotSeq === 1;
      const readDate = new Date();
      const readAt = readDate.toISOString();
      const readAtThai = new Intl.DateTimeFormat('th-TH', {
        dateStyle: 'short',
        timeStyle: 'medium',
        timeZone: 'Asia/Bangkok',
      }).format(readDate);
      const fromCache = snapshot.metadata.fromCache;
      const hasPendingWrites = snapshot.metadata.hasPendingWrites;
      const runtimeHost = getRuntimeHost();

      const items: MenuItem[] = [];
      const docDataById = new Map<string, Record<string, any>>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        docDataById.set(docSnap.id, data);
        items.push({
          id: docSnap.id,
          name: data.name || '',
          price: Number(data.price) || 0,
          cost: Number(data.cost) || 0,
          category: data.category || 'สเต็ก',
          imageUrl: normalizeMenuImageUrl(data.imageUrl),
          description: data.description || '',
          isAvailable: Boolean(data.isAvailable),
          isPublished: data.isPublished !== undefined ? Boolean(data.isPublished) : true,
          orderIndex: Number(data.orderIndex) ?? 0,
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
          createdBy: typeof data.createdBy === 'string' ? data.createdBy : undefined,
          updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined,
          createdSourceAppVersion:
            typeof data.createdSourceAppVersion === 'string' ? data.createdSourceAppVersion : undefined,
          createdHost: typeof data.createdHost === 'string' ? data.createdHost : undefined,
        });
      });

      const docChanges = snapshot.docChanges();
      const changeLogs: MenuFetchAuditEntry['changes'] = [];
      const anomalies: MenuFetchAuditEntry['anomalies'] = [];
      const flaggedIds = new Set<string>();

      docChanges.forEach((change) => {
        const docSnap = change.doc;
        const data = docSnap.data();
        const inferredOrigin = inferMenuCreatorOrigin(docSnap.id, data);

        changeLogs.push({
          type: change.type,
          menuId: docSnap.id,
          name: String(data.name || ''),
          price: Number(data.price) || 0,
          category: String(data.category || ''),
          createdAt: String(data.createdAt || ''),
          updatedAt: String(data.updatedAt || ''),
          createdBy: String(data.createdBy || ''),
          inferredOrigin,
        });

        if (change.type !== 'removed') {
          const reasons = detectMenuAnomalyReasons(
            docSnap.id,
            data,
            inferredOrigin,
            change.type,
            !isInitialSnapshot
          );
          if (reasons.length > 0) {
            flaggedIds.add(docSnap.id);
            anomalies.push({
              menuId: docSnap.id,
              name: String(data.name || ''),
              price: Number(data.price) || 0,
              category: String(data.category || ''),
              changeType: change.type,
              readAt,
              readAtThai,
              fromCache,
              createdAt: String(data.createdAt || ''),
              updatedAt: String(data.updatedAt || ''),
              createdBy: String(data.createdBy || '(none)'),
              updatedBy: String(data.updatedBy || '(none)'),
              createdSourceAppVersion: String(data.createdSourceAppVersion || '(unknown-older-version)'),
              createdHost: String(data.createdHost || '(unknown-host)'),
              inferredOrigin,
              anomalyReasons: reasons,
            });
          }
        }
      });

      // On initial snapshot, ensure any pre-existing doc not emitted or missed in changes is scanned
      if (isInitialSnapshot) {
        docDataById.forEach((data, docId) => {
          if (flaggedIds.has(docId)) return;
          const inferredOrigin = inferMenuCreatorOrigin(docId, data);
          const reasons = detectMenuAnomalyReasons(docId, data, inferredOrigin, 'initial-scan', false);
          if (reasons.length > 0) {
            flaggedIds.add(docId);
            anomalies.push({
              menuId: docId,
              name: String(data.name || ''),
              price: Number(data.price) || 0,
              category: String(data.category || ''),
              changeType: 'initial-scan',
              readAt,
              readAtThai,
              fromCache,
              createdAt: String(data.createdAt || ''),
              updatedAt: String(data.updatedAt || ''),
              createdBy: String(data.createdBy || '(none)'),
              updatedBy: String(data.updatedBy || '(none)'),
              createdSourceAppVersion: String(data.createdSourceAppVersion || '(unknown-older-version)'),
              createdHost: String(data.createdHost || '(unknown-host)'),
              inferredOrigin,
              anomalyReasons: reasons,
            });
          }
        });
      }

      const auditEntry: MenuFetchAuditEntry = {
        seq: snapshotSeq,
        readAt,
        readAtThai,
        fromCache,
        hasPendingWrites,
        totalDocs: items.length,
        changesCount: changeLogs.length,
        anomaliesCount: anomalies.length,
        appRevision: CURRENT_REVISION.revisionCode,
        host: runtimeHost,
        anomalies,
        changes: changeLogs,
      };

      MENU_FETCH_AUDIT_LOGS.push(auditEntry);
      if (MENU_FETCH_AUDIT_LOGS.length > MAX_MENU_AUDIT_LOGS) {
        MENU_FETCH_AUDIT_LOGS.shift();
      }
      if (typeof window !== 'undefined') {
        (window as any).__baanSteakMenuLogs = MENU_FETCH_AUDIT_LOGS;
      }

      console.info(
        `[subscribeMenus] #${snapshotSeq} readAt=${readAtThai} (${readAt}) | source=${
          fromCache ? 'local-cache' : 'firestore-server'
        } | pendingWrites=${hasPendingWrites} | docs=${items.length} | changes=${changeLogs.length} | anomalies=${anomalies.length}`,
        {
          appRevision: CURRENT_REVISION.revisionCode,
          host: runtimeHost,
          changes: changeLogs,
        }
      );

      if (anomalies.length > 0) {
        console.warn(
          `[subscribeMenus][ANOMALY] พบเมนูผิดปกติหรือไม่มีข้อมูลผู้สร้าง ${anomalies.length} รายการ (อ่านเมื่อ ${readAtThai}, source=${
            fromCache ? 'local-cache' : 'firestore-server'
          }):`,
          anomalies
        );
      }

      const sortedItems = sortMenus(items);
      onUpdate(sortedItems);
    },
    (error) => {
      console.error('[subscribeMenus][ERROR]', {
        readAt: new Date().toISOString(),
        error,
      });
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
      const sortedCats = sortCategories(items);
      onUpdate(sortedCats);
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
        const isArchived = Boolean(
          data.isArchived || normStatus === 'ส่งแล้ว' || normStatus === 'เช็คบิล' || isCancelled
        );

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
          tableNumber: data.tableNumber !== null && data.tableNumber !== undefined ? data.tableNumber : undefined,
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
          checkedOutAt: data.checkedOutAt,
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
  tableNumber?: number | string;
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
    tableNumber: data.tableNumber !== undefined ? data.tableNumber : null,
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

    // Auto update table status to occupied (ไม่ว่าง) if diningType is "มาทานที่ร้าน" and tableNumber is specified
    if (data.deliveryType === 'มาทานที่ร้าน' && data.tableNumber !== undefined && data.tableNumber !== null) {
      try {
        const rawNum = String(data.tableNumber).trim();
        const parsedNum = parseInt(rawNum, 10);
        const tableDocRef = doc(db, 'settings', 'tables');
        const snap = await getDoc(tableDocRef);
        let currentTables: RestaurantTable[] = INITIAL_TABLES;
        if (snap.exists() && Array.isArray(snap.data().tables)) {
          currentTables = snap.data().tables;
        }
        let found = false;
        const updated = currentTables.map((t) => {
          if (
            (!isNaN(parsedNum) && t.number === parsedNum) ||
            t.name === `โต๊ะ ${rawNum}` ||
            t.name === rawNum ||
            t.id === `table_${rawNum}` ||
            t.id === `table_${parsedNum}`
          ) {
            found = true;
            return {
              ...t,
              isOccupied: true,
              occupiedSource: 'order' as const,
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        });
        if (!found && !isNaN(parsedNum) && parsedNum > 0) {
          updated.push({
            id: `table_${parsedNum}`,
            number: parsedNum,
            name: `โต๊ะ ${parsedNum}`,
            isOccupied: true,
            occupiedSource: 'order',
            updatedAt: new Date().toISOString(),
          });
        }
        await setDoc(tableDocRef, { tables: updated, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (tblErr) {
        console.warn('Auto set table occupied error:', tblErr);
      }
    }

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

    // Trigger LINE Notify & Webhook notification in background
    try {
      const settingsDocRef = doc(db, 'settings', 'shop');
      const settingsSnap = await getDoc(settingsDocRef);
      const currentSettings = settingsSnap.exists()
        ? (settingsSnap.data() as ShopSettings)
        : DEFAULT_SHOP_SETTINGS;

      if (currentSettings.lineNotifyEnabled && currentSettings.lineNotifySendOnCreate !== false) {
        sendOrderNotification(
          {
            id: orderId,
            orderNumber,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            address: data.address,
            deliveryType: data.deliveryType,
            tableNumber: data.tableNumber,
            items: data.items,
            subtotal: data.subtotal,
            deliveryFee: data.deliveryFee,
            totalAmount: data.totalAmount,
            createdAt: payload.createdAt,
          },
          currentSettings
        ).catch((notifyErr) => {
          console.warn('Background order notification warning:', notifyErr);
        });
      }
    } catch (notifyErr) {
      console.warn('Order notification trigger non-fatal error:', notifyErr);
    }

    return orderNumber;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `orders/${orderId}`);
  }
}

// Append / Add extra items to an existing active order (ทั้งฝั่งลูกค้า และฝั่งแอดมิน)
export async function appendItemsToOrder(
  orderId: string,
  newItems: Array<{ menuId: string; name: string; price: number; quantity: number }>,
  customNote?: string
): Promise<{ newSubtotal: number; newTotal: number }> {
  if (!newItems || newItems.length === 0) {
    throw new Error('กรุณาเลือกรายการอาหารที่ต้องการสั่งเพิ่ม');
  }

  const orderRef = doc(db, 'orders', orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) {
    throw new Error('ไม่พบออเดอร์นี้ในระบบ');
  }

  const orderData = snap.data();
  const currentItems = (orderData.items || []) as OrderItem[];

  // Merge items: if same menuId, increase quantity; otherwise push new item
  const merged: OrderItem[] = [...currentItems];
  for (const it of newItems) {
    const existingIdx = merged.findIndex((m) => m.menuId === it.menuId);
    if (existingIdx >= 0) {
      merged[existingIdx] = {
        ...merged[existingIdx],
        quantity: (merged[existingIdx].quantity || 1) + it.quantity,
      };
    } else {
      merged.push({
        menuId: it.menuId,
        name: it.name,
        price: Number(it.price) || 0,
        quantity: it.quantity,
        itemStatus: 'รอทำ',
      });
    }
  }

  const addedSubtotal = newItems.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
    0
  );
  const newSubtotal = (Number(orderData.subtotal) || 0) + addedSubtotal;
  const newTotal = (Number(orderData.totalAmount) || 0) + addedSubtotal;

  const currentNotes = orderData.notes || '';
  const newNoteText = customNote
    ? `${currentNotes ? currentNotes + ' | ' : ''}สั่งเพิ่ม: ${customNote}`
    : currentNotes;

  await updateDoc(orderRef, {
    items: merged,
    subtotal: newSubtotal,
    totalAmount: newTotal,
    hasAddition: true,
    lastAdditionAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(newNoteText ? { notes: newNoteText } : {}),
  });

  return { newSubtotal, newTotal };
}

// Cancel an order (Removes from active list and frees its table if no other active order occupies it)
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

  // Reconcile / free table associated with this cancelled order
  await freeTableIfNoOtherActiveOrders(order);
}

// Permanently delete a single order document from Firestore (Admin only)
export async function deleteOrder(orderId: string): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);
  try {
    const snap = await getDoc(orderRef);
    const orderData = snap.exists() ? ({ id: snap.id, ...snap.data() } as Order) : null;
    await deleteDoc(orderRef);
    if (orderData) {
      await freeTableIfNoOtherActiveOrders(orderData);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
    throw error;
  }
}

// Clear order history for Admin (supports all orders, only completed/cancelled, or only active test orders)
export async function clearOrdersHistory(options: {
  scope: 'all' | 'archived_and_cancelled' | 'active_only';
  resetCustomerPoints?: boolean;
}): Promise<{ deletedOrdersCount: number; resetCustomersCount: number }> {
  try {
    const ordersSnap = await getDocs(collection(db, 'orders'));
    const orderDocsToDelete: string[] = [];

    ordersSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const status = normalizeOrderStatus(data.status);
      const isArchived = Boolean(data.isArchived || status === 'ส่งแล้ว' || status === 'เช็คบิล');
      const isCancelled = Boolean(data.isCancelled || status === 'ยกเลิก');

      if (options.scope === 'all') {
        orderDocsToDelete.push(docSnap.id);
      } else if (options.scope === 'archived_and_cancelled') {
        if (isArchived || isCancelled) {
          orderDocsToDelete.push(docSnap.id);
        }
      } else if (options.scope === 'active_only') {
        if (!isArchived && !isCancelled) {
          orderDocsToDelete.push(docSnap.id);
        }
      }
    });

    // Delete in parallel chunks of 20
    const chunkSize = 20;
    for (let i = 0; i < orderDocsToDelete.length; i += chunkSize) {
      const chunk = orderDocsToDelete.slice(i, i + chunkSize);
      await Promise.all(chunk.map((id) => deleteDoc(doc(db, 'orders', id))));
    }

    let resetCustomersCount = 0;
    if (options.resetCustomerPoints) {
      const custSnap = await getDocs(collection(db, 'customers'));
      const custIds: string[] = [];
      custSnap.forEach((docSnap) => {
        custIds.push(docSnap.id);
      });
      for (let i = 0; i < custIds.length; i += chunkSize) {
        const chunk = custIds.slice(i, i + chunkSize);
        await Promise.all(chunk.map((id) => deleteDoc(doc(db, 'customers', id))));
      }
      resetCustomersCount = custIds.length;
    }

    // If active orders were wiped, free stale order-locked tables as well
    if (options.scope === 'all' || options.scope === 'active_only') {
      try {
        const tableDocRef = doc(db, 'settings', 'tables');
        const tableSnap = await getDoc(tableDocRef);
        if (tableSnap.exists() && Array.isArray(tableSnap.data().tables)) {
          const remainingOrdersSnap = await getDocs(collection(db, 'orders'));
          const remainingOrders: Order[] = remainingOrdersSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Order, 'id'>),
          }));
          await reconcileTablesWithOrders(tableSnap.data().tables as RestaurantTable[], remainingOrders);
        }
      } catch (tblErr) {
        console.warn('Reconcile tables after clearOrdersHistory warning:', tblErr);
      }
    }

    return {
      deletedOrdersCount: orderDocsToDelete.length,
      resetCustomersCount,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'orders');
    throw error;
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

// Helper: Extract numeric/raw table identifier from an Order
export function extractOrderTableIdentifier(order: Pick<Order, 'tableNumber' | 'customerName' | 'address'>): string {
  let rawNum = '';
  if (order.tableNumber !== undefined && order.tableNumber !== null && String(order.tableNumber).trim() !== '') {
    rawNum = String(order.tableNumber).replace(/^โต๊ะ(?:ที่)?\s*/i, '').trim();
  }
  if (!rawNum && order.customerName) {
    const m = order.customerName.match(/โต๊ะ(?:ที่)?\s*(\d+)/i);
    if (m) rawNum = m[1];
  }
  if (!rawNum && order.address) {
    const m = order.address.match(/โต๊ะ(?:ที่)?\s*(\d+)/i);
    if (m) rawNum = m[1];
  }
  return rawNum;
}

// Helper: Determine whether an order currently holds a table (active dine-in before checkout/cancel)
export function isOrderHoldingTable(order: Order): boolean {
  const normStatus = normalizeOrderStatus(order.status);
  if (order.isCancelled || normStatus === 'ยกเลิก' || normStatus === 'เช็คบิล') {
    return false;
  }
  // Pre-v2.22 legacy delivered orders older than 12 hours no longer hold a physical table
  if (normStatus === 'ส่งแล้ว') {
    const refIso = order.updatedAt || order.createdAt;
    const ageHours = refIso ? (Date.now() - new Date(refIso).getTime()) / (1000 * 60 * 60) : 999;
    if (isNaN(ageHours) || ageHours > 12) {
      return false;
    }
  }
  const hasTable = extractOrderTableIdentifier(order) !== '';
  return hasTable && (order.deliveryType === 'มาทานที่ร้าน' || order.tableNumber !== undefined && order.tableNumber !== null);
}

// Reconcile occupied tables with live orders so phantom/stale occupied flags clear automatically
export async function reconcileTablesWithOrders(
  tables: RestaurantTable[],
  orders: Order[]
): Promise<boolean> {
  if (!Array.isArray(tables) || tables.length === 0) return false;

  const activeTableKeys = new Set<string>();
  for (const ord of orders) {
    if (!isOrderHoldingTable(ord)) continue;
    const rawNum = extractOrderTableIdentifier(ord);
    if (rawNum) {
      activeTableKeys.add(rawNum);
      const parsed = parseInt(rawNum, 10);
      if (!isNaN(parsed)) {
        activeTableKeys.add(String(parsed));
      }
    }
  }

  let hasChanges = false;
  const updated = tables.map((t) => {
    if (!t.isOccupied) return t;
    // Respect explicit manual locks toggled by Admin
    if (t.occupiedSource === 'manual') return t;

    const numKey = String(t.number);
    const nameKey = t.name.replace(/^โต๊ะ(?:ที่)?\s*/i, '').trim();
    const hasActiveOrder = activeTableKeys.has(numKey) || (nameKey && activeTableKeys.has(nameKey));

    if (!hasActiveOrder) {
      hasChanges = true;
      const { occupiedSource: _prev, ...rest } = t;
      return { ...rest, isOccupied: false, updatedAt: new Date().toISOString() };
    }
    return t;
  });

  if (!hasChanges) return false;

  try {
    const tableDocRef = doc(db, 'settings', 'tables');
    await setDoc(tableDocRef, { tables: updated, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Reconcile stale tables warning:', err);
    return false;
  }
}

// Helper: Extract table number from order & set table status to available (false) if no other active order occupies it
async function freeTableIfNoOtherActiveOrders(order: Order): Promise<void> {
  const rawNum = extractOrderTableIdentifier(order);
  if (!rawNum) return;

  try {
    const parsedNum = parseInt(rawNum, 10);
    const ordersSnap = await getDocs(collection(db, 'orders'));
    let stillOccupiedByOther = false;
    ordersSnap.forEach((d) => {
      if (d.id === order.id) return;
      const other = { id: d.id, ...(d.data() as Omit<Order, 'id'>) };
      if (!isOrderHoldingTable(other)) return;
      const otherRaw = extractOrderTableIdentifier(other);
      const otherParsed = parseInt(otherRaw, 10);
      if (otherRaw === rawNum || (!isNaN(parsedNum) && otherParsed === parsedNum)) {
        stillOccupiedByOther = true;
      }
    });

    if (!stillOccupiedByOther) {
      await freeTableForCheckedOutOrder(order);
    }
  } catch {
    await freeTableForCheckedOutOrder(order);
  }
}

// Helper: Extract table number from order & set table status to available (false) in real-time
async function freeTableForCheckedOutOrder(order: Order): Promise<void> {
  const rawNum = extractOrderTableIdentifier(order);
  if (!rawNum) return;

  try {
    const parsedNum = parseInt(rawNum, 10);
    const tableDocRef = doc(db, 'settings', 'tables');
    const snap = await getDoc(tableDocRef);
    let currentTables: RestaurantTable[] = INITIAL_TABLES;
    if (snap.exists() && Array.isArray(snap.data().tables)) {
      currentTables = snap.data().tables;
    }

    const updated = currentTables.map((t) => {
      if (
        (!isNaN(parsedNum) && t.number === parsedNum) ||
        t.name === `โต๊ะ ${rawNum}` ||
        t.name === rawNum ||
        t.id === `table_${rawNum}` ||
        t.id === `table_${parsedNum}`
      ) {
        const { occupiedSource: _prev, ...rest } = t;
        return { ...rest, isOccupied: false, updatedAt: new Date().toISOString() };
      }
      return t;
    });

    await setDoc(tableDocRef, { tables: updated, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Auto free table on checkout error:', err);
  }
}

// Order status linear index for forward-only progression
const ORDER_STEP_INDEX: Record<OrderStatus, number> = {
  'รับออเดอร์': 0,
  'กำลังทำ': 1,
  'ส่งออเดอร์': 2,
  'กำลังส่ง': 2,
  'ส่งแล้ว': 3,
  'เช็คบิล': 4,
  'ยกเลิก': 99,
};

export const ORDER_ITEM_STATUS_OPTIONS: OrderItemStatus[] = [
  'รอทำ',
  'กำลังทำ',
  'พร้อมเสิร์ฟ',
  'เสิร์ฟแล้ว',
];

export const ITEM_STEP_INDEX: Record<OrderItemStatus, number> = {
  'รอทำ': 0,
  'กำลังทำ': 1,
  'พร้อมเสิร์ฟ': 2,
  'เสิร์ฟแล้ว': 3,
};

export interface OrderItemUpdateResult {
  items: OrderItem[];
  previousOrderStatus: OrderStatus;
  nextOrderStatus: OrderStatus;
  didAdvanceOrderStatus: boolean;
}

export function getEffectiveItemStatus(item: OrderItem, orderStatus: OrderStatus): OrderItemStatus {
  const norm = normalizeOrderStatus(orderStatus);
  if (norm === 'ส่งแล้ว' || norm === 'เช็คบิล') {
    return 'เสิร์ฟแล้ว';
  }
  return item.itemStatus || 'รอทำ';
}

function computeNextOrderStatusFromItems(
  items: OrderItem[],
  currentOrderStatus: OrderStatus
): OrderStatus {
  const normCurrent = normalizeOrderStatus(currentOrderStatus);
  const currentIdx = ORDER_STEP_INDEX[normCurrent] ?? 0;

  if (
    items.length === 0 ||
    normCurrent === 'เช็คบิล' ||
    normCurrent === 'ยกเลิก' ||
    currentIdx >= 3
  ) {
    return normCurrent;
  }

  let minItemIdx = 3;
  for (const it of items) {
    const eff = getEffectiveItemStatus(it, normCurrent);
    const idx = ITEM_STEP_INDEX[eff] ?? 0;
    if (idx < minItemIdx) {
      minItemIdx = idx;
    }
  }

  // Strictly forward-only auto-advance for the main order:
  // All items >= กำลังทำ (1) -> กำลังทำ
  // All items >= พร้อมเสิร์ฟ (2) -> ส่งออเดอร์
  // All items == เสิร์ฟแล้ว (3) -> ส่งแล้ว
  const targetStep = Math.max(currentIdx, Math.min(3, minItemIdx));
  if (targetStep <= currentIdx) {
    return normCurrent;
  }

  if (targetStep >= 3) return 'ส่งแล้ว';
  if (targetStep === 2) return 'ส่งออเดอร์';
  if (targetStep === 1) return 'กำลังทำ';
  return normCurrent;
}

export function getOrderCompletionSummary(order: Pick<Order, 'items' | 'status'>): {
  totalLines: number;
  completedLines: number;
  readyLines: number;
  cookingLines: number;
  pendingLines: number;
  totalDishes: number;
  completedDishes: number;
  isAllCompleted: boolean;
  progressPercent: number;
} {
  const items = Array.isArray(order.items) ? order.items : [];
  let completedLines = 0;
  let readyLines = 0;
  let cookingLines = 0;
  let pendingLines = 0;
  let totalDishes = 0;
  let completedDishes = 0;

  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    totalDishes += qty;
    const effective = getEffectiveItemStatus(item, order.status);
    if (effective === 'เสิร์ฟแล้ว') {
      completedLines += 1;
      completedDishes += qty;
    } else if (effective === 'พร้อมเสิร์ฟ') {
      readyLines += 1;
    } else if (effective === 'กำลังทำ') {
      cookingLines += 1;
    } else {
      pendingLines += 1;
    }
  }

  const totalLines = items.length;
  const isAllCompleted = totalLines > 0 && completedLines === totalLines;
  const progressPercent = totalLines > 0 ? Math.round((completedLines / totalLines) * 100) : 0;

  return {
    totalLines,
    completedLines,
    readyLines,
    cookingLines,
    pendingLines,
    totalDishes,
    completedDishes,
    isAllCompleted,
    progressPercent,
  };
}

// Record customer loyalty summary helper (reusable across updateOrderStatus & finalizeOrderCheckout)
async function upsertCustomerStatsForOrder(
  order: Pick<Order, 'customerPhone' | 'customerName' | 'address' | 'items'>,
  nowIso: string
): Promise<void> {
  if (!order.customerPhone) return;
  const rawPhone = order.customerPhone.trim();
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  if (!cleanPhone) return;

  const custRef = doc(db, 'customers', cleanPhone);
  const existingSnap = await getDoc(custRef);

  const existingData = existingSnap.exists() ? (existingSnap.data() || {}) : {};
  const currentCount = existingSnap.exists()
    ? Number(existingData.orderCount || 0) + 1
    : 1;

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
      name: (order.customerName || '').trim(),
      phone: rawPhone,
      address: (order.address || '').trim(),
      monthYear: getThaiMonthYear(),
      lastOrderMonthYear: getThaiMonthYear(),
      orderCount: currentCount,
      itemCounts: currentItemCounts,
      lastOrderAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true }
  );
}

// Update individual item status inside an order (Strictly 1-way forward: รอทำ -> กำลังทำ -> พร้อมเสิร์ฟ -> เสิร์ฟแล้ว)
// Also automatically advances the main order status forward when all items in the order reach a higher stage
export async function updateOrderItemStatus(
  order: Order,
  itemIndex: number,
  nextItemStatus: OrderItemStatus
): Promise<OrderItemUpdateResult> {
  const currentOrderStatus = normalizeOrderStatus(order.status);
  if (currentOrderStatus === 'ยกเลิก' || order.isCancelled) {
    throw new Error('ออเดอร์นี้ถูกยกเลิกแล้ว ไม่สามารถเปลี่ยนสถานะรายการได้');
  }
  if (currentOrderStatus === 'เช็คบิล') {
    throw new Error('ออเดอร์นี้เช็คบิลเรียบร้อยแล้ว');
  }

  const currentItems = Array.isArray(order.items) ? [...order.items] : [];
  if (itemIndex < 0 || itemIndex >= currentItems.length) {
    throw new Error('ไม่พบรายการอาหารที่ต้องการอัปเดต');
  }

  const currentItemStatus = getEffectiveItemStatus(currentItems[itemIndex], currentOrderStatus);
  const currentItemIdx = ITEM_STEP_INDEX[currentItemStatus] ?? 0;
  const targetItemIdx = ITEM_STEP_INDEX[nextItemStatus] ?? 0;

  if (targetItemIdx <= currentItemIdx) {
    throw new Error(
      `ไม่อนุญาตให้ย้อนสถานะหรือเลือกสถานะเดิมของรายการอาหาร (จาก "${currentItemStatus}" ไป "${nextItemStatus}")`
    );
  }

  currentItems[itemIndex] = {
    ...currentItems[itemIndex],
    itemStatus: nextItemStatus,
  };

  const nextOrderStatus = computeNextOrderStatusFromItems(currentItems, currentOrderStatus);
  const didAdvanceOrderStatus = nextOrderStatus !== currentOrderStatus;
  const nowIso = new Date().toISOString();

  const updatePayload: Record<string, any> = {
    items: currentItems,
    updatedAt: nowIso,
  };

  if (didAdvanceOrderStatus) {
    updatePayload.status = nextOrderStatus;
    if (nextOrderStatus === 'ส่งแล้ว') {
      updatePayload.isArchived = true;
    }
  }

  const orderRef = doc(db, 'orders', order.id);
  try {
    await updateDoc(orderRef, updatePayload);

    if (didAdvanceOrderStatus && nextOrderStatus === 'ส่งแล้ว' && currentOrderStatus !== 'ส่งแล้ว') {
      await upsertCustomerStatsForOrder(
        {
          customerPhone: order.customerPhone,
          customerName: order.customerName,
          address: order.address,
          items: currentItems,
        },
        nowIso
      );
    }

    return {
      items: currentItems,
      previousOrderStatus: currentOrderStatus,
      nextOrderStatus,
      didAdvanceOrderStatus,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    return {
      items: currentItems,
      previousOrderStatus: currentOrderStatus,
      nextOrderStatus: currentOrderStatus,
      didAdvanceOrderStatus: false,
    };
  }
}

// Mark all items inside an order forward to a target status (e.g. 'เสิร์ฟแล้ว') & advance main order status
export async function markAllOrderItemsStatus(
  order: Order,
  targetItemStatus: OrderItemStatus = 'เสิร์ฟแล้ว'
): Promise<OrderItemUpdateResult> {
  const currentOrderStatus = normalizeOrderStatus(order.status);
  if (currentOrderStatus === 'ยกเลิก' || order.isCancelled) {
    throw new Error('ออเดอร์นี้ถูกยกเลิกแล้ว ไม่สามารถเปลี่ยนสถานะรายการได้');
  }
  if (currentOrderStatus === 'เช็คบิล') {
    throw new Error('ออเดอร์นี้เช็คบิลเรียบร้อยแล้ว');
  }

  const targetIdx = ITEM_STEP_INDEX[targetItemStatus] ?? 3;
  const currentItems = Array.isArray(order.items) ? order.items : [];
  const updatedItems: OrderItem[] = currentItems.map((it) => {
    const eff = getEffectiveItemStatus(it, currentOrderStatus);
    const curIdx = ITEM_STEP_INDEX[eff] ?? 0;
    if (curIdx >= targetIdx) {
      return { ...it, itemStatus: eff };
    }
    return { ...it, itemStatus: targetItemStatus };
  });

  const nextOrderStatus = computeNextOrderStatusFromItems(updatedItems, currentOrderStatus);
  const didAdvanceOrderStatus = nextOrderStatus !== currentOrderStatus;
  const nowIso = new Date().toISOString();

  const updatePayload: Record<string, any> = {
    items: updatedItems,
    updatedAt: nowIso,
  };

  if (didAdvanceOrderStatus) {
    updatePayload.status = nextOrderStatus;
    if (nextOrderStatus === 'ส่งแล้ว') {
      updatePayload.isArchived = true;
    }
  }

  const orderRef = doc(db, 'orders', order.id);
  try {
    await updateDoc(orderRef, updatePayload);

    if (didAdvanceOrderStatus && nextOrderStatus === 'ส่งแล้ว' && currentOrderStatus !== 'ส่งแล้ว') {
      await upsertCustomerStatsForOrder(
        {
          customerPhone: order.customerPhone,
          customerName: order.customerName,
          address: order.address,
          items: updatedItems,
        },
        nowIso
      );
    }

    return {
      items: updatedItems,
      previousOrderStatus: currentOrderStatus,
      nextOrderStatus,
      didAdvanceOrderStatus,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    return {
      items: updatedItems,
      previousOrderStatus: currentOrderStatus,
      nextOrderStatus: currentOrderStatus,
      didAdvanceOrderStatus: false,
    };
  }
}

// Finalize check-bill with summarized / added items and latest edited total amount
export async function finalizeOrderCheckout(params: {
  order: Order;
  finalItems: OrderItem[];
  deliveryFee: number;
  finalTotalAmount: number;
  markAllItemsServed?: boolean;
}): Promise<Order> {
  const { order, finalItems, deliveryFee, finalTotalAmount, markAllItemsServed = true } = params;
  const currentStatus = normalizeOrderStatus(order.status);

  if (currentStatus === 'ยกเลิก') {
    throw new Error('ออเดอร์นี้ถูกยกเลิกแล้ว ไม่สามารถเช็คบิลได้');
  }
  if (currentStatus === 'เช็คบิล') {
    throw new Error('ออเดอร์นี้เช็คบิลเรียบร้อยแล้ว');
  }

  const sanitizedItems: OrderItem[] = finalItems
    .filter((it) => Number(it.quantity) > 0)
    .map((it) => ({
      menuId: it.menuId,
      name: it.name,
      price: Math.max(0, Number(it.price) || 0),
      quantity: Math.max(1, Number(it.quantity) || 1),
      itemStatus: markAllItemsServed ? 'เสิร์ฟแล้ว' : it.itemStatus || 'เสิร์ฟแล้ว',
    }));

  const computedSubtotal = sanitizedItems.reduce(
    (sum, it) => sum + it.price * it.quantity,
    0
  );
  const safeDeliveryFee = Math.max(0, Number(deliveryFee) || 0);
  const safeTotal = Math.max(0, Number(finalTotalAmount) || 0);
  const nowIso = new Date().toISOString();

  const orderRef = doc(db, 'orders', order.id);
  try {
    await updateDoc(orderRef, {
      items: sanitizedItems,
      subtotal: computedSubtotal,
      deliveryFee: safeDeliveryFee,
      totalAmount: safeTotal,
      status: 'เช็คบิล' as OrderStatus,
      isArchived: true,
      checkedOutAt: nowIso,
      updatedAt: nowIso,
    });

    await freeTableForCheckedOutOrder(order);

    if (currentStatus !== 'ส่งแล้ว') {
      await upsertCustomerStatsForOrder(
        {
          customerPhone: order.customerPhone,
          customerName: order.customerName,
          address: order.address,
          items: sanitizedItems,
        },
        nowIso
      );
    }

    return {
      ...order,
      items: sanitizedItems,
      subtotal: computedSubtotal,
      deliveryFee: safeDeliveryFee,
      totalAmount: safeTotal,
      status: 'เช็คบิล',
      isArchived: true,
      checkedOutAt: nowIso,
      updatedAt: nowIso,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    throw error;
  }
}

// Update order status & record customer summary when status is "ส่งแล้ว" or "เช็คบิล"
// Strictly 1-way forward progression: รับออเดอร์ -> กำลังทำ -> ส่งออเดอร์ -> ส่งแล้ว -> เช็คบิล (หรือกดเช็คบิลได้ทันที)
export async function updateOrderStatus(order: Order, newStatus: OrderStatus): Promise<void> {
  const currentStatus = normalizeOrderStatus(order.status);
  const targetStatus = normalizeOrderStatus(newStatus);

  if (currentStatus === 'ยกเลิก') {
    throw new Error('ออเดอร์นี้ถูกยกเลิกแล้ว ไม่สามารถเปลี่ยนสถานะได้');
  }
  if (currentStatus === 'เช็คบิล') {
    throw new Error('ออเดอร์นี้เช็คบิลเรียบร้อยแล้ว');
  }

  const currentIdx = ORDER_STEP_INDEX[currentStatus] ?? 0;
  const targetIdx = ORDER_STEP_INDEX[targetStatus] ?? 0;
  if (targetStatus !== 'เช็คบิล' && targetIdx <= currentIdx) {
    throw new Error(`ไม่อนุญาตให้ย้อนสถานะหรือเลือกสถานะเดิม (จาก "${currentStatus}" ไป "${targetStatus}")`);
  }

  const orderRef = doc(db, 'orders', order.id);

  try {
    const nowIso = new Date().toISOString();
    const isArchived = targetStatus === 'ส่งแล้ว' || targetStatus === 'เช็คบิล';
    const updatePayload: Record<string, any> = {
      status: targetStatus,
      isArchived,
      updatedAt: nowIso,
    };
    if (targetStatus === 'ส่งแล้ว' || targetStatus === 'เช็คบิล') {
      updatePayload.items = (order.items || []).map((it) => ({
        ...it,
        itemStatus: 'เสิร์ฟแล้ว' as OrderItemStatus,
      }));
    }
    if (targetStatus === 'เช็คบิล') {
      updatePayload.checkedOutAt = nowIso;
    }

    await updateDoc(orderRef, updatePayload);

    // Free table in real-time when checking out dine-in or takeaway orders with a table
    if (targetStatus === 'เช็คบิล') {
      await freeTableForCheckedOutOrder(order);
    }

    // Record/update customer loyalty summary when completing ("ส่งแล้ว") or direct checkout ("เช็คบิล" from earlier step)
    const shouldRecordCustomer =
      (targetStatus === 'ส่งแล้ว' && currentStatus !== 'ส่งแล้ว') ||
      (targetStatus === 'เช็คบิล' && currentStatus !== 'ส่งแล้ว');

    if (shouldRecordCustomer) {
      await upsertCustomerStatsForOrder(order, nowIso);
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

async function markMenusInitializedFlag(): Promise<void> {
  try {
    await setDoc(doc(db, 'settings', 'shop'), { menusInitialized: true }, { merge: true });
  } catch {
    // non-fatal metadata flag
  }
}

// Menu Management Functions for Admin
export async function addMenuItem(data: Omit<MenuItem, 'id'>): Promise<string> {
  const menuId = `menu_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const menuRef = doc(db, 'menus', menuId);
  const nowIso = new Date().toISOString();
  const runtimeHost = getRuntimeHost();

  const payload = {
    name: data.name.trim().slice(0, 120),
    price: Math.max(0, Number(data.price) || 0),
    cost: Math.max(0, Number(data.cost) || 0),
    category: data.category.trim().slice(0, 60),
    imageUrl: data.imageUrl ? data.imageUrl.trim() : '',
    description: (data.description || '').slice(0, 800),
    isAvailable: Boolean(data.isAvailable),
    isPublished: Boolean(data.isPublished),
    orderIndex: Number(data.orderIndex),
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: data.createdBy || 'admin-manual',
    updatedBy: 'admin-manual',
    createdSourceAppVersion: CURRENT_REVISION.revisionCode,
    createdHost: runtimeHost,
  };

  try {
    await setDoc(menuRef, payload);
    void markMenusInitializedFlag();
    return menuId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `menus/${menuId}`);
  }
}

export async function updateMenuItem(id: string, data: Partial<MenuItem>): Promise<void> {
  const menuRef = doc(db, 'menus', id);
  const payload: Record<string, any> = {
    updatedAt: new Date().toISOString(),
    updatedBy: data.updatedBy || 'admin-manual',
    updatedSourceAppVersion: CURRENT_REVISION.revisionCode,
    updatedHost: getRuntimeHost(),
  };

  if (data.name !== undefined) payload.name = data.name.trim().slice(0, 120);
  if (data.price !== undefined) payload.price = Math.max(0, Number(data.price) || 0);
  if (data.cost !== undefined) payload.cost = Math.max(0, Number(data.cost) || 0);
  if (data.category !== undefined) payload.category = data.category.trim().slice(0, 60);
  if (data.imageUrl !== undefined) payload.imageUrl = data.imageUrl ? data.imageUrl.trim() : '';
  if (data.description !== undefined) payload.description = data.description.slice(0, 800);
  if (data.isAvailable !== undefined) payload.isAvailable = Boolean(data.isAvailable);
  if (data.isPublished !== undefined) payload.isPublished = Boolean(data.isPublished);
  if (data.orderIndex !== undefined) payload.orderIndex = Number(data.orderIndex);

  try {
    await updateDoc(menuRef, payload);
    void markMenusInitializedFlag();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `menus/${id}`);
  }
}

export async function deleteMenuItem(id: string): Promise<void> {
  const menuRef = doc(db, 'menus', id);
  try {
    await deleteDoc(menuRef);
    void markMenusInitializedFlag();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `menus/${id}`);
  }
}

export const AUTO_INJECTED_DRINK_NAMES = [
  'น้ำดื่มขวดเย็น',
  'โค้ก / เป๊ปซี่ เย็นฉ่ำ',
  'ชามะนาวเย็น',
  'ชาเขียวเย็น',
  'น้ำส้มเย็นสดชื่น',
];

export function isLegacyAutoSeededDrink(item: Pick<MenuItem, 'id' | 'name'>): boolean {
  return /^menu_drink_\d+$/.test(item.id) || AUTO_INJECTED_DRINK_NAMES.includes(item.name.trim());
}

/**
 * ลบเฉพาะเมนูเครื่องดื่มตัวอย่างที่ระบบเวอร์ชันเก่าแทรกเข้ามาอัตโนมัติ (id ขึ้นต้นด้วย menu_drink_*)
 * จะไม่แตะต้องเมนูที่ร้านค้าเพิ่มเอง (ซึ่งใช้ id รูปแบบ menu_<timestamp>_...)
 */
export async function cleanupLegacyAutoSeededMenus(idsToDelete?: string[]): Promise<number> {
  const menusSnap = await getDocs(collection(db, 'menus'));
  let deletedCount = 0;

  for (const docSnap of menusSnap.docs) {
    const matchesTarget = idsToDelete
      ? idsToDelete.includes(docSnap.id) && /^menu_drink_\d+$/.test(docSnap.id)
      : /^menu_drink_\d+$/.test(docSnap.id);

    if (matchesTarget) {
      await deleteDoc(doc(db, 'menus', docSnap.id));
      deletedCount++;
    }
  }

  await markMenusInitializedFlag();
  return deletedCount;
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

/**
 * ปรับปรุงและบันทึกลำดับ orderIndex ใน Firestore ทั้งหมดใหม่ทันที
 * ตามเงื่อนไข:
 * 1) หมวดหมู่นำหน้า: สเต็ก -> สลัด -> ของทานเล่น -> เครื่องดื่ม
 * 2) ราคา: ราคาน้อยอยู่บน -> ราคาแพงอยู่ล่าง (เช่น สเต็กไก่ 59 บ. ก่อน สเต็กหมู 69 บ.)
 */
export async function reorderMenusByCategoryAndPrice(categories?: CategoryItem[]): Promise<void> {
  const menusRef = collection(db, 'menus');
  const snap = await getDocs(menusRef);
  const items: MenuItem[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    items.push({
      id: docSnap.id,
      name: data.name || '',
      price: Number(data.price) || 0,
      category: data.category || 'สเต็ก',
      imageUrl: data.imageUrl || '',
      description: data.description || '',
      isAvailable: Boolean(data.isAvailable),
      isPublished: data.isPublished !== undefined ? Boolean(data.isPublished) : true,
      orderIndex: Number(data.orderIndex) || 0,
    });
  });

  const sorted = sortMenus(items, categories);
  const updates = sorted.map((item, idx) =>
    updateDoc(doc(db, 'menus', item.id), {
      orderIndex: idx,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin-auto-reorder',
      updatedSourceAppVersion: CURRENT_REVISION.revisionCode,
    })
  );
  await Promise.all(updates);
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

// Initialize shop settings once & ONLY seed initial menus on first-ever setup or explicit admin forceReset
export async function initializeBaanSteakMenu(forceReset: boolean = false): Promise<void> {
  try {
    let menusAlreadyInitialized = false;

    // 1. Ensure settings/shop uses the latest cover image, updated shop GPS pin, and read menusInitialized lock
    try {
      const shopRef = doc(db, 'settings', 'shop');
      const shopSnap = await getDoc(shopRef);
      if (!shopSnap.exists()) {
        await setDoc(
          shopRef,
          {
            heroBannerUrl: '/IMG_20261007_161813.jpg',
            isOpen: true,
            shopLatitude: DEFAULT_SHOP_SETTINGS.shopLatitude,
            shopLongitude: DEFAULT_SHOP_SETTINGS.shopLongitude,
          },
          { merge: true }
        );
      } else {
        const data = shopSnap.data();
        menusAlreadyInitialized = Boolean(data.menusInitialized);
        const updates: Record<string, any> = {};
        if (
          !data.heroBannerUrl ||
          data.heroBannerUrl.includes('file_00000000322c8230a99655a0452e2494')
        ) {
          updates.heroBannerUrl = '/IMG_20261007_161813.jpg';
        }
        const isLegacyPin =
          data.shopLatitude === undefined ||
          data.shopLongitude === undefined ||
          (Math.abs(Number(data.shopLatitude) - 16.5447) < 0.0001 &&
            Math.abs(Number(data.shopLongitude) - 102.1005) < 0.0001);
        if (isLegacyPin) {
          updates.shopLatitude = DEFAULT_SHOP_SETTINGS.shopLatitude;
          updates.shopLongitude = DEFAULT_SHOP_SETTINGS.shopLongitude;
        }
        if (Object.keys(updates).length > 0) {
          await setDoc(shopRef, updates, { merge: true });
        }
      }
    } catch {
      // ignore non-fatal settings sync
    }

    // 2. STRICT GUARD: Never modify, inject, or overwrite menus during normal startup!
    // Once menus have been initialized or any menu exists, never auto-seed again even if menus are later deleted.
    if (!forceReset && menusAlreadyInitialized) {
      return;
    }

    const menusSnap = await getDocs(collection(db, 'menus'));
    if (!forceReset && !menusSnap.empty) {
      await markMenusInitializedFlag();
      return;
    }

    // 3. Only runs when database has NEVER been initialized and is completely empty,
    // OR when Admin explicitly confirms a full forceReset.
    if (forceReset) {
      for (const docSnap of menusSnap.docs) {
        await deleteDoc(doc(db, 'menus', docSnap.id));
      }

      const catSnap = await getDocs(collection(db, 'categories'));
      for (const docSnap of catSnap.docs) {
        await deleteDoc(doc(db, 'categories', docSnap.id));
      }
    }

    const existingCatsSnap = await getDocs(collection(db, 'categories'));
    if (forceReset || existingCatsSnap.empty) {
      for (const cat of INITIAL_CATEGORIES) {
        await setDoc(doc(db, 'categories', cat.id), cat);
      }
    }

    const seedBatchTs = Date.now();
    const seedCreator = forceReset ? 'admin-force-reset' : 'initial-empty-seed';
    const runtimeHost = getRuntimeHost();
    for (let i = 0; i < EXACT_INITIAL_MENUS.length; i++) {
      const item = EXACT_INITIAL_MENUS[i];
      const menuId = `menu_seed_${seedBatchTs}_${i + 1}`;
      await setDoc(doc(db, 'menus', menuId), {
        ...item,
        orderIndex: i,
        createdBy: seedCreator,
        updatedBy: seedCreator,
        createdSourceAppVersion: CURRENT_REVISION.revisionCode,
        createdHost: runtimeHost,
      });
    }

    await markMenusInitializedFlag();
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

// Subscribe Daily Expenses Real-time from Firestore
export function subscribeDailyExpenses(
  onUpdate: (records: DailyExpenseRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const expRef = collection(db, 'daily_expenses');
  return onSnapshot(
    expRef,
    (snapshot) => {
      const list: DailyExpenseRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const items: DailyExpenseItem[] = Array.isArray(data.items)
          ? data.items.map((it: any) => ({
              id: String(it.id || `${Date.now()}_${Math.random()}`),
              category: String(it.category || 'อื่นๆ'),
              title: String(it.title || ''),
              amount: Math.max(0, Number(it.amount) || 0),
              note: it.note ? String(it.note) : '',
              createdAt: String(it.createdAt || new Date().toISOString()),
            }))
          : [];
        const totalExpense = items.reduce((s, it) => s + it.amount, 0);
        list.push({
          id: docSnap.id,
          dateKey: String(data.dateKey || docSnap.id),
          thaiDate: String(data.thaiDate || docSnap.id),
          items,
          totalExpense: Number(data.totalExpense) >= 0 ? Number(data.totalExpense) : totalExpense,
          updatedAt: String(data.updatedAt || ''),
        });
      });
      list.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
      onUpdate(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'daily_expenses');
    }
  );
}

// Format YYYY-MM-DD key to Thai readable date "13 / 11 / 2569"
export function formatDateKeyToThai(dateKey: string): string {
  const parts = dateKey.split('-');
  if (parts.length !== 3) return dateKey;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateKey;
  return `${day} / ${month} / ${year + 543}`;
}

// Save or update itemized daily expenses for a given YYYY-MM-DD dateKey
export async function saveDailyExpenseRecord(
  dateKey: string,
  items: DailyExpenseItem[]
): Promise<void> {
  const cleanKey = dateKey.trim().slice(0, 20);
  if (!cleanKey) throw new Error('กรุณาระบุวันที่');

  const sanitizedItems: DailyExpenseItem[] = items
    .filter((it) => it.title.trim() !== '' || Number(it.amount) > 0)
    .map((it) => ({
      id: it.id || `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category: (it.category || 'อื่นๆ').trim().slice(0, 80),
      title: (it.title || 'รายจ่าย').trim().slice(0, 160),
      amount: Math.max(0, Number(it.amount) || 0),
      note: (it.note || '').trim().slice(0, 250),
      createdAt: it.createdAt || new Date().toISOString(),
    }));

  const totalExpense = sanitizedItems.reduce((sum, it) => sum + it.amount, 0);
  const expRef = doc(db, 'daily_expenses', cleanKey);

  try {
    await setDoc(expRef, {
      dateKey: cleanKey,
      thaiDate: formatDateKeyToThai(cleanKey),
      items: sanitizedItems,
      totalExpense,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `daily_expenses/${cleanKey}`);
  }
}


