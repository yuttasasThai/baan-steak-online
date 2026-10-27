export interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  category: string;
  isAvailable: boolean; // เปิด/ปิดการขาย (true = ขาย, false = หมดชั่วคราว)
  isPublished: boolean; // กำหนดให้แสดงบนหน้าเว็บลูกค้าหรือไม่
  orderIndex: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  orderIndex: number;
}

export type OrderStatus =
  | 'รับออเดอร์'
  | 'กำลังทำ'
  | 'กำลังส่ง'
  | 'ส่งแล้ว'
  | 'ยกเลิก';

export type DiningType = 'มาทานที่ร้าน' | 'ส่งอาหารที่บ้าน' | 'นัดรับอาหาร';

export interface OrderItem {
  menuId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  deliveryType?: DiningType;
  gps?: {
    lat: number;
    lng: number;
  } | null;
  distanceKm?: number;
  items: OrderItem[];
  subtotal: number;
  deliveryArea: string;
  deliveryFee: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean; // true เมื่อสถานะเป็น "ส่งแล้ว" หรือ "ยกเลิก" เพื่อซ่อนจาก Active Orders
  isCancelled?: boolean;
  cancelledAt?: string;
  cancelReason?: string;
  isOutOfDeliveryZone?: boolean;
  earnedRewardsNotice?: string[];
  tableNumber?: number | string;
}

export interface ShopSettings {
  name: string;
  slogan: string;
  phone: string; // 085-045-1606
  lineOaName: string; // เริ่มต้น: บ้าน สเต็กออนไลน์
  lineName?: string;
  lineUrl: string; // ลิงก์ LINE OA
  lineId?: string; // ID LINE OA
  lineEnabled: boolean; // เปิด/ปิดการแสดง LINE OA (true = แสดง, false = ซ่อน)
  isOpen: boolean; // สถานะร้าน: true = 🟢 ร้านเปิด (สั่งได้), false = 🔴 ร้านปิด (งดรับออเดอร์)
  shopLatitude: number;
  shopLongitude: number;
  heroBannerUrl?: string;
  hideAdminButtonInCustomerView?: boolean; // ซ่อนปุ่ม Admin บนหน้าลูกค้า (ให้เข้าผ่านลิงก์ /admin เท่านั้น)
}

export interface CustomerRecord {
  phone: string;
  name: string;
  address: string;
  orderCount: number;
  lastOrderMonthYear: string; // e.g. "10/2569"
  lastOrderAt: string;
  itemCounts?: Record<string, number>; // จำนวนจาน/ออเดอร์ของแต่ละเมนู e.g. { "สเต็กเนื้อโคขุน": 12 }
  redeemedCoke?: number; // จำนวนขวดโค้กที่ใช้สิทธิ์ไปแล้ว
  redeemedItems?: Record<string, number>; // จำนวนสิทธิ์ฟรีที่ใช้ไปแล้วของแต่ละเมนู
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface RestaurantTable {
  id: string; // e.g. "table_1"
  number: number; // 1, 2, 3...
  name: string; // e.g. "โต๊ะ 1"
  isOccupied: boolean; // false = ว่าง (Available), true = เต็ม (Occupied)
  updatedAt?: string;
}
