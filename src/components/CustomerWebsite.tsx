import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  ExternalLink,
  Gift,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Minus,
  Navigation,
  PhoneCall,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  Utensils,
  X,
} from 'lucide-react';
import { CartItem, CategoryItem, DiningType, MenuItem, RestaurantTable, ShopSettings } from '../types';
import {
  calculateDeliveryFeeByDistance,
  calculateDistanceKm,
  createOrder,
  getCustomerRewardsByPhone,
  normalizeMenuImageUrl,
  SHOP_INFO,
} from '../services/menuService';
import heroImage from '../assets/IMG_20261007_161813.jpg';
import { audioAlert } from '../utils/audioAlert';
import { DeliveryMapPicker } from './DeliveryMapPicker';

interface CustomerWebsiteProps {
  menus: MenuItem[];
  categories: CategoryItem[];
  settings?: ShopSettings;
  tables?: RestaurantTable[];
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAdminLogin: () => void;
  isAdmin?: boolean;
}

export const CustomerWebsite: React.FC<CustomerWebsiteProps> = ({
  menus,
  categories,
  settings,
  tables = [],
  onNotify,
  onOpenAdminLogin,
  isAdmin = false,
}) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Customer order form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [diningType, setDiningType] = useState<DiningType>('ส่งอาหารที่บ้าน');
  const [address, setAddress] = useState('');
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isOutOfZoneProceed, setIsOutOfZoneProceed] = useState<'yes' | 'no' | null>(null);
  const [manualGpsInput, setManualGpsInput] = useState('');
  const [showManualGps, setShowManualGps] = useState(false);

  // Order submission states
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);
  const [completedOrderRewards, setCompletedOrderRewards] = useState<string[]>([]);
  const [completedOrderIsOutOfZone, setCompletedOrderIsOutOfZone] = useState<boolean>(false);
  const [completedOrderDiningType, setCompletedOrderDiningType] = useState<DiningType>('ส่งอาหารที่บ้าน');

  // Cover Image: Uses real-time settings from Firestore if updated, otherwise defaults to latest sent heroImage
  const activeHeroImage =
    settings?.heroBannerUrl &&
    !settings.heroBannerUrl.includes('file_00000000322c8230a99655a0452e2494')
      ? settings.heroBannerUrl
      : heroImage;

  React.useEffect(() => {
    try {
      localStorage.removeItem('baan_steak_custom_hero');
    } catch {
      // ignore
    }
  }, []);

  // Table number from URL query (e.g. ?table=1)
  const [urlTableNumber, setUrlTableNumber] = useState<string | null>(null);
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);

  // Parse URL query parameters (?table=, ?type=, ?category=)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const tableParam = params.get('table');
      const typeParam = params.get('type') || params.get('deliveryType');
      const catParam = params.get('category') || params.get('cat');

      if (tableParam) {
        setUrlTableNumber(tableParam);
        setSelectedTableNumber(Number(tableParam));
        setDiningType('มาทานที่ร้าน');
        setCustomerName(`โต๊ะ ${tableParam}`);
        setAddress(`ทานที่ร้าน โต๊ะ ${tableParam}`);
      } else if (typeParam) {
        if (typeParam === 'pickup' || typeParam === 'takeaway') {
          setDiningType('นัดรับอาหาร');
        } else if (typeParam === 'delivery') {
          setDiningType('ส่งอาหารที่บ้าน');
        }
      }

      if (catParam) {
        setSelectedCategory(decodeURIComponent(catParam));
      }
    } catch {
      // ignore non-fatal parameter error
    }
  }, []);

  // Real-time synchronization of items in cart with Firestore menus
  React.useEffect(() => {
    if (cart.length === 0 || menus.length === 0) return;
    setCart((prevCart) => {
      let hasChanged = false;
      const updated = prevCart.map((cartItem) => {
        const latestMenu = menus.find((m) => m.id === cartItem.menuItem.id);
        if (latestMenu) {
          if (
            latestMenu.price !== cartItem.menuItem.price ||
            latestMenu.name !== cartItem.menuItem.name ||
            latestMenu.isAvailable !== cartItem.menuItem.isAvailable
          ) {
            hasChanged = true;
            return {
              ...cartItem,
              menuItem: latestMenu,
            };
          }
        }
        return cartItem;
      });
      return hasChanged ? updated : prevCart;
    });
  }, [menus]);

  // Customer loyalty rewards earned (e.g. Free Coke or Free Dish)
  const [customerRewardsNotice, setCustomerRewardsNotice] = useState<string[]>([]);

  React.useEffect(() => {
    const rawClean = customerPhone.replace(/[^0-9]/g, '');
    if (rawClean.length >= 9) {
      getCustomerRewardsByPhone(rawClean).then((res) => {
        setCustomerRewardsNotice(res.allRewardsSummary);
      });
    } else {
      setCustomerRewardsNotice([]);
    }
  }, [customerPhone]);

  // Filter published menus only
  const visibleMenus = menus.filter((m) => m.isPublished);
  const filteredMenus =
    selectedCategory === 'ทั้งหมด'
      ? visibleMenus
      : visibleMenus.filter((m) => m.category === selectedCategory);

  // GPS Distance & Delivery Fee Calculation
  const shopLat = settings?.shopLatitude ?? 16.5447;
  const shopLng = settings?.shopLongitude ?? 102.1005;

  const distanceKm = gpsLocation
    ? calculateDistanceKm(shopLat, shopLng, gpsLocation.lat, gpsLocation.lng)
    : null;

  const isOutOfDeliveryZone = Boolean(distanceKm !== null && distanceKm > 12);

  const deliveryCalculation =
    distanceKm !== null ? calculateDeliveryFeeByDistance(distanceKm) : null;

  // Active delivery fee based on dining type:
  // มาทานที่ร้าน: 0 บาท
  // นัดรับอาหาร: 0 บาท (แจ้งว่ายังไม่รวมค่าส่ง)
  // ส่งอาหารที่บ้าน: คำนวณตามระยะทาง GPS
  const deliveryFee =
    diningType === 'ส่งอาหารที่บ้าน'
      ? (deliveryCalculation ? deliveryCalculation.fee : 0)
      : 0;

  const foodSubtotal = cart.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);
  const totalAmount =
    diningType === 'ส่งอาหารที่บ้าน'
      ? (foodSubtotal > 0 ? foodSubtotal + deliveryFee : 0)
      : foodSubtotal;
  const cartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  // Add / reduce item in cart
  const handleAddToCart = (item: MenuItem) => {
    if (settings?.isOpen === false) {
      onNotify('ขณะนี้ร้านปิด ยังไม่สามารถสั่งอาหารได้', 'error');
      return;
    }

    if (!item.isAvailable) {
      onNotify('เมนูนี้สินค้าหมด ไม่สามารถสั่งได้', 'error');
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((c) => c.menuItem.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].quantity += 1;
        return next;
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
    onNotify(`เพิ่ม "${item.name}" แล้ว`, 'success');
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.menuItem.id === itemId) {
            const newQ = c.quantity + delta;
            return newQ > 0 ? { ...c, quantity: newQ } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // GPS Pinning for Customer Home Delivery
  const handleLocateCustomer = () => {
    if (!navigator.geolocation) {
      onNotify('อุปกรณ์ของท่านไม่รองรับการค้นหาพิกัด GPS', 'error');
      setShowManualGps(true);
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        setGpsLocation(coords);
        setIsLocating(false);
        setIsOutOfZoneProceed(null);
        onNotify('📍 ปักหมุดตำแหน่ง GPS บ้านลูกค้าเรียบร้อย', 'success');
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        onNotify('ไม่สามารถดึงพิกัดอัตโนมัติได้ กรุณากดอนุญาตสิทธิ์ หรือระบุพิกัด', 'info');
        setShowManualGps(true);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleApplyManualGps = () => {
    const trimmed = manualGpsInput.trim();
    if (!trimmed) {
      onNotify('กรุณาระบุพิกัดหรือลิงก์ Google Maps', 'error');
      return;
    }
    const match = trimmed.match(/@?(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        setGpsLocation({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
        setIsOutOfZoneProceed(null);
        setShowManualGps(false);
        onNotify('📍 ปักหมุดพิกัดเรียบร้อย', 'success');
        return;
      }
    }
    onNotify('รูปแบบพิกัดไม่ถูกต้อง (เช่น 16.5447, 102.1005)', 'error');
  };

  // Submit Order
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings?.isOpen === false) {
      onNotify('ขณะนี้ร้านปิด ยังไม่สามารถสั่งอาหารได้', 'error');
      return;
    }
    if (cart.length === 0) {
      onNotify('กรุณาเลือกรายการอาหารก่อนกดสั่งซื้อ', 'error');
      return;
    }

    const isTableOrder = Boolean(urlTableNumber || diningType === 'มาทานที่ร้าน');
    const effectiveName = isTableOrder
      ? (customerName.trim() || `โต๊ะ ${urlTableNumber || selectedTableNumber || 1}`)
      : customerName.trim();

    if (!effectiveName) {
      onNotify(isTableOrder ? 'กรุณาระบุชื่อโต๊ะ' : 'กรุณากรอกชื่อสำหรับเรียกรับอาหาร', 'error');
      return;
    }

    // Phone number is ONLY required for delivery and pickup, NOT for table orders!
    if (!isTableOrder) {
      const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 9) {
        onNotify('กรุณากรอกเบอร์โทรศัพท์ที่ติดต่อได้ (อย่างน้อย 9 หลัก)', 'error');
        return;
      }
    }

    // Validation according to dining type
    if (diningType === 'มาทานที่ร้าน') {
      if (tables.length > 0) {
        const isAllTablesFull = tables.every((t) => t.isOccupied);
        if (isAllTablesFull && !urlTableNumber) {
          onNotify('ขณะนี้โต๊ะในร้านเต็มทุกโต๊ะ กรุณาเลือกสั่งแบบ "ส่งอาหารที่บ้าน" หรือ "นัดรับอาหาร"', 'error');
          return;
        }
      }
    } else if (diningType === 'ส่งอาหารที่บ้าน') {
      if (!address.trim()) {
        onNotify('กรุณากรอกที่อยู่ หรือจุดสังเกตการส่งอาหาร', 'error');
        return;
      }
      if (!gpsLocation) {
        onNotify('กรุณากดปุ่ม "ปักหมุด GPS บ้านลูกค้า" เพื่อคำนวณระยะทาง', 'error');
        return;
      }
      if (distanceKm !== null && distanceKm > 12) {
        if (isOutOfZoneProceed !== 'yes') {
          onNotify('ตำแหน่งอยู่นอกเขตบริการ (เกิน 12 กม.) กรุณาเลือกนัดรับอาหารที่ร้าน', 'error');
          return;
        }
      }
    } else if (diningType === 'นัดรับอาหาร') {
      // นัดรับอาหาร: ลูกค้าสามารถโทรนัดหมายกับทางร้าน หรือระบุจุดนัดรับได้
    }

    try {
      setIsSubmittingOrder(true);
      const effectiveAddress =
        diningType === 'มาทานที่ร้าน'
          ? (address.trim() || (selectedTableNumber ? `ทานที่ร้าน โต๊ะ ${selectedTableNumber}` : 'มาทานที่ร้าน (ไม่มีค่าจัดส่ง)'))
          : diningType === 'นัดรับอาหาร'
          ? (address.trim() || 'นัดรับอาหาร (โทรนัดหมายกับทางร้าน)')
          : address.trim();

      const effectiveDeliveryArea =
        diningType === 'มาทานที่ร้าน'
          ? (selectedTableNumber ? `มาทานที่ร้าน โต๊ะ ${selectedTableNumber}` : 'มาทานที่ร้าน (ไม่มีค่าจัดส่ง)')
          : diningType === 'นัดรับอาหาร'
          ? 'นัดรับอาหาร (ยังไม่รวมค่าส่ง)'
          : deliveryCalculation
          ? `${deliveryCalculation.rateDescription} (ระยะทาง ${distanceKm} กม.)`
          : 'ส่งอาหารที่บ้าน';

      const effectiveDeliveryFee = diningType === 'ส่งอาหารที่บ้าน' ? deliveryFee : 0;
      const effectiveTotalAmount = diningType === 'ส่งอาหารที่บ้าน' ? totalAmount : foodSubtotal;

      const orderNum = await createOrder({
        customerName: effectiveName,
        customerPhone: isTableOrder ? (customerPhone.trim() || '-') : customerPhone.trim(),
        address: effectiveAddress,
        deliveryType: diningType,
        tableNumber: selectedTableNumber !== null ? selectedTableNumber : (urlTableNumber ? Number(urlTableNumber) : undefined),
        gps: diningType === 'ส่งอาหารที่บ้าน' ? gpsLocation : null,
        distanceKm: diningType === 'ส่งอาหารที่บ้าน' ? (distanceKm ?? 0) : 0,
        items: cart.map((c) => ({
          menuId: c.menuItem.id,
          name: c.menuItem.name,
          price: c.menuItem.price,
          quantity: c.quantity,
        })),
        subtotal: foodSubtotal,
        deliveryArea: effectiveDeliveryArea,
        deliveryFee: effectiveDeliveryFee,
        totalAmount: effectiveTotalAmount,
        earnedRewardsNotice: customerRewardsNotice,
      });

      setCompletedOrderRewards([...customerRewardsNotice]);
      setCompletedOrderIsOutOfZone(
        Boolean(diningType === 'ส่งอาหารที่บ้าน' && distanceKm !== null && distanceKm > 12)
      );
      setCompletedOrderDiningType(diningType);
      setCompletedOrderNumber(orderNum);
      setCart([]);
      setIsCartOpen(false);
      onNotify('สั่งอาหารสำเร็จเรียบร้อย', 'success');
    } catch (err) {
      onNotify('เกิดข้อผิดพลาดในการสั่งอาหาร กรุณาลองใหม่อีกครั้ง', 'error');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-24 text-stone-900">
      {/* 1. Hero Image of the shop (Uploaded banner) */}
      <div className="w-full overflow-hidden rounded-2xl bg-stone-950 border border-stone-200 shadow-sm">
        <img
          src={activeHeroImage}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = heroImage;
          }}
          alt="บ้าน สเต็กออนไลน์"
          className="w-full h-auto block rounded-2xl"
          loading="eager"
        />
      </div>

      {/* 2. กรอบยาวแจ้งสถานะ "วันนี้ร้านเปิด" / "วันนี้ร้านปิด" ใต้รูปภาพหน้าปก (สีเด่นเห็นชัดเจน) */}
      {settings?.isOpen === false ? (
        <div className="w-full py-2.5 sm:py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white font-black text-sm sm:text-base border-2 border-rose-400 shadow-md flex items-center justify-center gap-2 tracking-wide text-center animate-fadeIn">
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
          <span className="text-base sm:text-lg">🔴</span>
          <span className="drop-shadow-xs font-black tracking-wide">วันนี้ร้านปิด (งดรับออเดอร์ชั่วคราว)</span>
        </div>
      ) : (
        <div className="w-full py-2.5 sm:py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 text-white font-black text-sm sm:text-base border-2 border-emerald-400 shadow-md flex items-center justify-center gap-2 tracking-wide text-center animate-fadeIn">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-200 animate-ping"></span>
          <span className="text-base sm:text-lg">🟢</span>
          <span className="drop-shadow-xs font-black tracking-wide">วันนี้ร้านเปิด (สั่งอาหารได้เลยครับ)</span>
        </div>
      )}

      {/* 2.0 Real-time Table Status Indicator (ใต้ปุ่ม ร้านเปิด/ร้านปิด ตามที่กำหนดในลิงก์ Admin) */}
      {tables && tables.length > 0 && (
        <div className="w-full bg-white rounded-2xl p-3 sm:p-3.5 border border-stone-200 shadow-2xs space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-stone-900">
              <span className="text-sm">🍽️</span>
              <span>สถานะโต๊ะอาหารในร้าน (เรียลไทม์)</span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                tables.every((t) => t.isOccupied)
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              {tables.every((t) => t.isOccupied)
                ? '🔴 โต๊ะเต็มทุกโต๊ะ'
                : `🟢 ว่าง ${tables.filter((t) => !t.isOccupied).length}/${tables.length} โต๊ะ`}
            </span>
          </div>

          {/* Grid of Individual Tables showing ว่าง / เต็ม */}
          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {tables.map((tbl) => {
              const isOccupied = tbl.isOccupied;
              const isMyScannedTable =
                urlTableNumber &&
                (String(tbl.number) === urlTableNumber || tbl.name === `โต๊ะ ${urlTableNumber}`);

              return (
                <div
                  key={tbl.id}
                  className={`py-2 px-1.5 rounded-xl text-center border transition flex flex-col items-center justify-center gap-0.5 ${
                    isMyScannedTable
                      ? 'bg-amber-50 border-2 border-amber-500 ring-2 ring-amber-300 text-amber-950 font-black shadow-xs'
                      : isOccupied
                      ? 'bg-rose-50/70 border-rose-200 text-rose-800'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-extrabold'
                  }`}
                >
                  <span className="text-xs font-black truncate max-w-full">
                    {tbl.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                      isOccupied
                        ? 'bg-rose-200/70 text-rose-800'
                        : 'bg-emerald-200/80 text-emerald-900'
                    }`}
                  >
                    {isOccupied ? '🔴 เต็ม' : '🟢 ว่าง'}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-stone-400 text-center">
            * ข้อมูลสถานะโต๊ะซิงก์ตรงจากร้านแบบเรียลไทม์ (ลูกค้าที่ร้านสามารถสแกน QR Code ประจำโต๊ะเพื่อสั่งได้ทันที)
          </p>
        </div>
      )}

      {/* 2.1 Table Dine-in Welcome Banner (if opened from table QR/link) */}
      {urlTableNumber && (
        <div className="w-full py-2.5 px-3.5 rounded-2xl bg-amber-50 text-amber-950 border border-amber-300 font-bold text-xs flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-lg">🍽️</span>
            <div>
              <span>สั่งอาหารสำหรับ: </span>
              <span className="text-red-700 font-black text-sm underline">
                โต๊ะ {urlTableNumber}
              </span>
              <span className="text-stone-500 font-medium ml-1">
                (ทานที่ร้าน ฟรีค่าจัดส่ง)
              </span>
            </div>
          </div>
          <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded-full font-extrabold text-amber-900 shrink-0">
            สแกนจากโต๊ะ
          </span>
        </div>
      )}

      {/* 2.2 Pickup Welcome Banner */}
      {!urlTableNumber && diningType === 'นัดรับอาหาร' && (
        <div className="w-full py-2.5 px-3.5 rounded-2xl bg-amber-50 text-amber-950 border border-amber-300 font-bold text-xs flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛍️</span>
            <div>
              <span>โหมดสั่งอาหาร: </span>
              <span className="text-amber-800 font-black text-sm underline">
                นัดรับกลับบ้านที่ร้าน (Pickup)
              </span>
              <span className="text-stone-500 font-medium ml-1">
                (ฟรีค่าจัดส่ง 0 บาท)
              </span>
            </div>
          </div>
          <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded-full font-extrabold text-amber-900 shrink-0">
            รับกลับบ้าน
          </span>
        </div>
      )}

      {/* 3. Shop Title & Compact Contact Line */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-stone-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          {/* Shop Name & Slogan */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-red-600 tracking-tight leading-none">
              {SHOP_INFO.name}
            </h1>
            <p className="text-[11px] font-medium text-stone-500 mt-0.5">
              {SHOP_INFO.slogan} • อ.ชุมแพ
            </p>
          </div>
        </div>

        {/* 3. Compact Contact Bar: 📞 เบอร์โทรศัพท์, [LINE], และ 📍 พิกัดร้าน อยู่ในแนวเดียวกัน */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-stone-100 w-full overflow-x-auto no-scrollbar">
          {/* Phone Link (Clickable directly to tel:0850451606) */}
          <a
            href={`tel:${(settings?.phone || '085-045-1606').replace(/[^0-9]/g, '')}`}
            className="inline-flex items-center gap-1 font-bold text-stone-800 hover:text-red-600 active:scale-95 transition bg-stone-50 hover:bg-stone-100 px-2 py-1 rounded-lg border border-stone-200 text-xs shrink-0 whitespace-nowrap shadow-2xs"
            title="กดเพื่อโทรสั่งอาหาร"
          >
            <span className="text-xs">📞</span>
            <span className="font-extrabold tracking-tight">
              {settings?.phone || '085-045-1606'}
            </span>
          </a>

          {/* QR Code LINE OA Thumbnail (On same line as phone) */}
          {settings?.lineEnabled !== false && (
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg transition font-bold text-xs active:scale-95 cursor-pointer shrink-0 whitespace-nowrap shadow-2xs"
              title="สแกนหรือเปิด LINE OA"
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                  settings?.lineUrl || 'https://line.me/ti/p/~0850451606'
                )}`}
                alt="QR LINE"
                className="w-3.5 h-3.5 rounded-xs object-contain bg-white"
                loading="lazy"
              />
              <span>[LINE]</span>
            </button>
          )}

          {/* ปุ่มพิกัดร้าน ต่อจาก "เบอร์โทร" "QR Line" พร้อม icon ปักหมุด "มาทานที่ร้าน" อยู่ในแนวเดียวกัน */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${settings?.shopLatitude || 16.5447},${settings?.shopLongitude || 102.1005}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 rounded-lg transition font-bold text-xs active:scale-95 shadow-2xs cursor-pointer shrink-0 whitespace-nowrap"
            title="ดูพิกัดร้านค้าบน Google Maps เพื่อเดินทางมาทานที่ร้าน"
          >
            <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>พิกัด "มาทานที่ร้าน"</span>
          </a>

          {/* ป้ายแสดงสถานะโต๊ะในร้านแบบเรียลไทม์ (ว่าง/เต็ม) */}
          {tables && tables.length > 0 && (
            <div
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-black shrink-0 whitespace-nowrap shadow-2xs transition ${
                tables.every((t) => t.isOccupied)
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
              title="สถานะโต๊ะอาหารสำหรับทานที่ร้านในปัจจุบัน"
            >
              <Utensils className="w-3.5 h-3.5 shrink-0" />
              <span>
                {tables.every((t) => t.isOccupied)
                  ? 'โต๊ะเต็มทุกโต๊ะ'
                  : `โต๊ะว่าง ${tables.filter((t) => !t.isOccupied).length}/${tables.length}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Category Filter Pills (if any new categories added) */}
      {categories.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('ทั้งหมด')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'ทั้งหมด'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            ทั้งหมด ({visibleMenus.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.name)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === c.name
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* 7. Menu List (Food Items) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-stone-800 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-red-600" />
              <span>รายการอาหาร</span>
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Real-Time
            </span>
          </div>
          <span className="text-xs text-stone-500">
            {filteredMenus.length} รายการ
          </span>
        </div>

        {filteredMenus.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-500 text-sm">
            ไม่มีรายการอาหารในหมวดหมู่นี้
          </div>
        ) : (
          filteredMenus.map((item) => {
            const cartItem = cart.find((c) => c.menuItem.id === item.id);
            const isSoldOut = !item.isAvailable;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-3.5 sm:p-4 border shadow-sm transition flex gap-3.5 items-center ${
                  isSoldOut ? 'border-rose-200 bg-rose-50/20' : 'border-stone-200'
                }`}
              >
                {/* Food Photo */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                  {item.imageUrl ? (
                    <img
                      src={normalizeMenuImageUrl(item.imageUrl, item.name)}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover ${
                        isSoldOut ? 'grayscale brightness-75' : ''
                      }`}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        (e.currentTarget as HTMLImageElement).src = normalizeMenuImageUrl('', item.name);
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                      <Utensils className="w-8 h-8" />
                    </div>
                  )}

                  {/* Requirement: สินค้าหมด: แสดง “สินค้าหมด” และห้ามเพิ่มลงตะกร้า */}
                  {isSoldOut && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-1">
                      <span className="px-2 py-1 rounded bg-rose-600 text-white font-extrabold text-[11px] tracking-wide shadow">
                        สินค้าหมด
                      </span>
                    </div>
                  )}
                </div>

                {/* Info & Order Controls (Clean & Minimal: Photo, Name, Price, Status, Add Button) */}
                <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`font-bold text-base leading-tight truncate ${
                        isSoldOut ? 'text-stone-500' : 'text-stone-900'
                      }`}
                    >
                      {item.name}
                    </h3>

                    {/* Status Badge: พร้อมขาย / สินค้าหมด */}
                    {isSoldOut ? (
                      <span className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-700 font-bold border border-rose-200 rounded-md shrink-0">
                        สินค้าหมด
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 rounded-md shrink-0">
                        พร้อมขาย
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-stone-100">
                    <div className="font-extrabold text-lg text-red-600">
                      {item.price} <span className="text-xs font-normal text-stone-500">บาท</span>
                    </div>

                    {/* Add/Reduce Quantity Buttons */}
                    {isSoldOut ? (
                      <span className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-400 text-xs font-semibold cursor-not-allowed">
                        สินค้าหมด
                      </span>
                    ) : cartItem ? (
                      <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl p-1">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          className="w-7 h-7 flex items-center justify-center bg-white text-red-600 rounded-lg shadow-xs hover:bg-red-50 active:scale-90 font-bold"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center font-bold text-sm text-red-700">
                          {cartItem.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          className="w-7 h-7 flex items-center justify-center bg-red-600 text-white rounded-lg shadow-xs hover:bg-red-700 active:scale-90 font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="flex items-center gap-1 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>เพิ่ม</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 9, 10, 11, 12, 13. Cart Drawer & Customer Order Form */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-lg max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-900">
            {/* Cart Header */}
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-red-600" />
                <h3 className="font-extrabold text-base">รายการสั่งอาหารในตะกร้า</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items & Form Body */}
            <form onSubmit={handleOrderSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Items in cart */}
              <div className="space-y-2 bg-stone-50 p-3 rounded-2xl border border-stone-200">
                <div className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                  อาหารที่เลือก ({cartItemCount} ชิ้น)
                </div>
                {cart.map((c) => (
                  <div
                    key={c.menuItem.id}
                    className="flex items-center justify-between py-1.5 border-b border-stone-200/60 last:border-0 text-sm"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-bold text-stone-800 truncate">{c.menuItem.name}</div>
                      <div className="text-xs text-stone-500">
                        {c.menuItem.price} บ. × {c.quantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(c.menuItem.id, -1)}
                          className="w-6 h-6 flex items-center justify-center text-stone-600 hover:text-red-600"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold">{c.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(c.menuItem.id, 1)}
                          className="w-6 h-6 flex items-center justify-center text-stone-600 hover:text-red-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="font-bold text-stone-800 w-14 text-right">
                        {c.menuItem.price * c.quantity} บ.
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Customer Details: Nickname, Phone, Address */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  {urlTableNumber || diningType === 'มาทานที่ร้าน' ? 'ข้อมูลโต๊ะสั่งอาหาร' : 'ข้อมูลผู้สั่งอาหาร'}
                </div>

                {/* 1) กรณีสั่งจากการสแกนที่โต๊ะ: ให้กรอก/แสดงเป็น "ชื่อโต๊ะ" และ "ไม่ต้องมีช่องพิมพ์เบอร์โทร" */}
                {urlTableNumber || diningType === 'มาทานที่ร้าน' ? (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      ชื่อโต๊ะ / หมายเลขโต๊ะ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="เช่น โต๊ะ 1, โต๊ะ 2"
                      className="w-full px-3.5 py-2.5 bg-amber-50/50 border-2 border-amber-300 rounded-xl text-sm font-bold text-stone-900 focus:outline-none focus:border-red-500 focus:bg-white"
                    />
                    <div className="text-[11px] text-stone-500 flex items-center gap-1">
                      <span className="text-emerald-600 font-bold">✓ สแกนจากโต๊ะอาหารในร้าน</span>
                      <span>(ส่งออเดอร์เข้าห้องครัวโดยตรง ไม่จำเป็นต้องกรอกเบอร์โทร)</span>
                    </div>
                  </div>
                ) : (
                  /* 2) กรณีสั่ง Delivery หรือ สแกน QR Code รับกลับบ้าน: มีช่องพิมพ์ชื่อลูกค้า และ เบอร์โทรศัพท์ */
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        ชื่อลูกค้า / ชื่อเล่น <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="เช่น คุณสมศักดิ์, พี่เอก, น้องมุก"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="เช่น 081-234-5678"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:bg-white"
                      />
                    </div>
                  </>
                )}

                {/* 🎁 แจ้งสิทธิของฟรีเมื่อลูกค้ามีแต้มสะสม */}
                {customerRewardsNotice.length > 0 && (
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-300 space-y-1 text-xs text-emerald-950 animate-fadeIn">
                    <div className="flex items-center gap-1.5 font-black text-emerald-800">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>🎉 ท่านได้รับสิทธิพิเศษจากแต้มสะสม:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-emerald-900 font-bold text-[11px] pl-1">
                      {customerRewardsNotice.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                    <p className="text-[10px] text-emerald-700">
                      (ระบบจะแจ้งสิทธิ์นี้ไปยังร้านค้า และร้านจะจัดของแถมให้พร้อมกับออเดอร์นี้)
                    </p>
                  </div>
                )}

                {/* 3) รูปแบบรับอาหาร 'มาทานที่ร้าน' ให้นำออกจากตัวเลือกสั่งทั่วไป (แสดงเฉพาะ Delivery & Pickup) */}
                {urlTableNumber || diningType === 'มาทานที่ร้าน' ? (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-bold text-stone-800">
                      รูปแบบการรับอาหาร
                    </label>
                    <div className="p-3 bg-amber-50 rounded-2xl border-2 border-amber-300 flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">🍽️</span>
                        <div>
                          <div className="text-xs font-black text-amber-950">
                            ทานที่ร้าน: {customerName || (urlTableNumber ? `โต๊ะ ${urlTableNumber}` : 'โต๊ะอาหาร')}
                          </div>
                          <div className="text-[11px] text-amber-800 font-medium">
                            สแกนสั่งจาก QR Code ประจำโต๊ะ (ฟรีค่าจัดส่ง 0 บาท)
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-500 text-stone-950 rounded-xl text-[10px] font-black shrink-0 border border-amber-600">
                        ประจำโต๊ะ
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-bold text-stone-800">
                      เลือกรูปแบบการรับอาหาร <span className="text-red-500">*</span>
                    </label>
                    {/* เหลือเฉพาะ 2 ตัวเลือก: ส่งอาหารที่บ้าน (Delivery) และ นัดรับอาหาร (Pickup) */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-2xl border border-stone-200">
                      <button
                        type="button"
                        onClick={() => {
                          setDiningType('ส่งอาหารที่บ้าน');
                        }}
                        className={`py-2.5 px-2 text-center rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                          diningType === 'ส่งอาหารที่บ้าน'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                        }`}
                      >
                        <Truck className="w-4 h-4" />
                        <span>1) ส่งอาหารที่บ้าน (Delivery)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDiningType('นัดรับอาหาร');
                          setIsOutOfZoneProceed(null);
                        }}
                        className={`py-2.5 px-2 text-center rounded-xl text-xs font-bold transition flex flex-col items-center gap-1 ${
                          diningType === 'นัดรับอาหาร'
                            ? 'bg-amber-400 text-stone-950 font-black shadow-xs ring-2 ring-amber-300'
                            : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                        }`}
                      >
                        <MapPin className="w-4 h-4" />
                        <span>2) นัดรับอาหาร (รับกลับบ้าน)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* --- สรุปข้อมูลสำหรับผู้สั่งสแกนจากโต๊ะ --- */}
                {(urlTableNumber || diningType === 'มาทานที่ร้าน') && (
                  <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-200 text-xs text-stone-800 space-y-1 animate-fadeIn">
                    <div className="font-extrabold text-red-700 flex items-center gap-1.5 text-xs">
                      <Store className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>{SHOP_INFO.name} (อ.ชุมแพ)</span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      ออเดอร์นี้จะถูกส่งไปยังห้องครัวทันทีโดยระบุ {customerName || `โต๊ะ ${urlTableNumber || 1}`} (ไม่มีค่าจัดส่ง)
                    </p>
                  </div>
                )}

                {/* --- 2.1 กรณี ส่งอาหารที่บ้าน: ใส่ที่อยู่ + ปุ่มปักหมุด GPS บ้านลูกค้า (ไม่แสดงแผนที่) --- */}
                {diningType === 'ส่งอาหารที่บ้าน' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        ที่อยู่ / จุดสังเกตส่งอาหาร <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="ระบุบ้านเลขที่ ซอย หมู่บ้าน หรือจุดสังเกต..."
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:bg-white"
                      />
                    </div>

                    {/* ปุ่ม ปักหมุด GPS บ้านลูกค้า (ไม่ต้องแสดงแผนที่เพราะกินพื้นที่หน้าจอ) */}
                    <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-red-600" />
                          <span>พิกัด GPS บ้านลูกค้า</span>
                        </span>
                        {gpsLocation && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>ปักหมุดแล้ว</span>
                          </span>
                        )}
                      </div>

                      {/* ปุ่มกดเพื่อดึงพิกัด GPS */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={handleLocateCustomer}
                          disabled={isLocating}
                          className="flex-1 py-2.5 px-3 bg-red-600 hover:bg-red-700 active:scale-98 disabled:bg-stone-300 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                        >
                          {isLocating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>กำลังค้นหาพิกัด GPS...</span>
                            </>
                          ) : (
                            <>
                              <Navigation className="w-4 h-4" />
                              <span>{gpsLocation ? '🔄 ปักหมุด GPS ใหม่' : '📍 ปักหมุด GPS บ้านลูกค้า'}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowManualGps(!showManualGps)}
                          className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold border border-stone-300 transition"
                        >
                          {showManualGps ? 'ปิดช่องระบุพิกัด' : 'ระบุพิกัด/ลิงก์'}
                        </button>
                      </div>

                      {/* แสดงพิกัดและระยะทางที่คำนวณได้ */}
                      {gpsLocation && (
                        <div className="p-2.5 bg-white rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-stone-600">ระยะทางจากร้าน:</span>
                            <strong className="text-sm text-red-600">{distanceKm} กม.</strong>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-stone-500">ค่าจัดส่ง:</span>
                            <span className="font-bold text-emerald-700">
                              {deliveryFee === 0 ? 'ฟรี 0 บาท' : `${deliveryFee} บาท`}
                            </span>
                          </div>
                          <div className="text-[10px] text-stone-400 font-mono pt-0.5 truncate">
                            พิกัด: {gpsLocation.lat.toFixed(5)}, {gpsLocation.lng.toFixed(5)}
                          </div>
                        </div>
                      )}

                      {/* ช่องใส่พิกัดแบบ Manual / Google Maps URL หากดึง GPS ไม่ได้ */}
                      {showManualGps && (
                        <div className="p-2.5 bg-white rounded-xl border border-stone-300 space-y-1.5 text-xs">
                          <label className="text-[11px] font-semibold text-stone-600">
                            วางลิงก์ Google Maps หรือพิกัด (เช่น 16.5447, 102.1005):
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={manualGpsInput}
                              onChange={(e) => setManualGpsInput(e.target.value)}
                              placeholder="วางพิกัด เช่น 16.5447, 102.1005"
                              className="flex-1 px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                            />
                            <button
                              type="button"
                              onClick={handleApplyManualGps}
                              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded-lg text-xs font-bold shrink-0"
                            >
                              ตกลง
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 2.3 หากตำแหน่ง GPS อยู่นอกเขตบริการเกิน 12 กิโลเมตร */}
                      {isOutOfDeliveryZone && (
                        <div className="p-3 bg-amber-50 rounded-xl border-2 border-amber-300 text-xs text-amber-950 space-y-2 animate-fadeIn">
                          <div className="flex items-center gap-1.5 font-black text-amber-900 text-xs sm:text-sm">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>นอกเขตพื้นที่บริการ (ระยะทาง {distanceKm} กม. เกิน 12 กม.)</span>
                          </div>
                          <p className="text-[11px] text-stone-700 leading-relaxed">
                            ตำแหน่งบ้านลูกค้าอยู่นอกเขตบริการจัดส่งเดลิเวอรี่ของร้าน (บริการจัดส่งภายใน 12 กม.)
                          </p>

                          <div className="pt-1.5 border-t border-amber-200">
                            <p className="font-bold text-stone-800 mb-1.5">ต้องการสั่งต่อหรือไม่?</p>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setIsOutOfZoneProceed('no')}
                                className={`py-1.5 px-2.5 rounded-xl font-bold text-xs border transition ${
                                  isOutOfZoneProceed === 'no'
                                    ? 'bg-stone-800 text-white border-stone-900'
                                    : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                                }`}
                              >
                                ❌ ไม่ต้องการ
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsOutOfZoneProceed('yes')}
                                className={`py-1.5 px-2.5 rounded-xl font-bold text-xs border transition ${
                                  isOutOfZoneProceed === 'yes'
                                    ? 'bg-amber-500 text-stone-950 font-black border-amber-600 ring-2 ring-amber-300'
                                    : 'bg-white text-amber-900 border-amber-400 hover:bg-amber-100'
                                }`}
                              >
                                ✅ ต้องการ
                              </button>
                            </div>
                          </div>

                          {isOutOfZoneProceed === 'no' && (
                            <div className="p-2 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 text-[11px] font-semibold">
                              ขออภัยในความไม่สะดวกครับ ทางร้านให้บริการนำส่งถึงบ้านภายในระยะ 12 กม. เท่านั้น
                            </div>
                          )}

                          {isOutOfZoneProceed === 'yes' && (
                            <div className="p-2.5 bg-white rounded-xl border border-amber-300 space-y-2 text-xs">
                              <p className="font-bold text-stone-800">
                                ท่านสามารถเปลี่ยนเป็นรูปแบบนัดรับกลับบ้านได้:
                              </p>
                              <div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDiningType('นัดรับอาหาร');
                                    setIsOutOfZoneProceed(null);
                                    onNotify('เปลี่ยนรูปแบบเป็น: นัดรับอาหาร (รับกลับบ้าน)', 'info');
                                  }}
                                  className="w-full py-2.5 px-3 bg-amber-400 hover:bg-amber-500 text-stone-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs ring-1 ring-amber-500"
                                >
                                  <MapPin className="w-4 h-4" />
                                  <span>เปลี่ยนเป็น "นัดรับอาหารที่ร้าน (รับกลับบ้าน)" ฟรีค่าจัดส่ง</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* --- 3. กรณี นัดรับอาหาร: แจ้งเบอร์โทรร้านเพื่อนัดรับ + สรุปยอดค่าอาหาร (ยังไม่รวมค่าส่ง) --- */}
                {diningType === 'นัดรับอาหาร' && (
                  <div className="p-3.5 bg-amber-50 rounded-2xl border-2 border-amber-300 text-xs text-amber-950 space-y-2.5 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-black text-amber-900 text-xs sm:text-sm">
                        <MapPin className="w-4 h-4 text-amber-600" />
                        <span>นัดรับอาหาร (โทรนัดหมายกับทางร้าน)</span>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-950 rounded-full font-black text-[10px] border border-amber-400">
                        📍 นัดรับ
                      </span>
                    </div>

                    {/* กล่องเบอร์โทรร้านเพื่อนัดรับ */}
                    <div className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between gap-2 shadow-2xs">
                      <div>
                        <div className="text-[11px] text-stone-500 font-medium">เบอร์โทรติดต่อร้านเพื่อนัดรับ:</div>
                        <div className="text-sm font-black text-red-600 tracking-wide">
                          {settings?.phone || '085-045-1606'}
                        </div>
                      </div>
                      <a
                        href={`tel:${(settings?.phone || '085-045-1606').replace(/[^0-9]/g, '')}`}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs shrink-0 transition"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>โทรนัดรับ</span>
                      </a>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        จุดนัดรับ / ข้อความระบุถึงร้าน <span className="text-stone-400 font-normal">(ถ้ามี หรือโทรนัดหมายได้)</span>
                      </label>
                      <textarea
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="ระบุจุดนัดพบที่สะดวก หรือช่วงเวลาที่ต้องการนัดรับอาหาร (ถ้ามี)..."
                        className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* Price Summary Breakdown */}
                <div className="p-4 bg-stone-100/80 rounded-2xl border border-stone-200/80 text-xs space-y-2">
                  <div className="text-xs font-bold text-stone-800 uppercase tracking-wider pb-1 border-b border-stone-200">
                    สรุปยอดชำระเงิน
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>ค่าอาหาร ({cartItemCount} ชิ้น)</span>
                    <span className="font-semibold text-stone-900">{foodSubtotal} บาท</span>
                  </div>

                  {/* ค่าจัดส่งตามรูปแบบการรับอาหาร */}
                  <div className="flex justify-between text-stone-600 items-center">
                    <span>
                      ค่าจัดส่ง
                      {diningType === 'ส่งอาหารที่บ้าน' && distanceKm !== null
                        ? ` (${distanceKm} กม.)`
                        : ''}
                    </span>
                    <span className="font-semibold text-stone-900">
                      {diningType === 'มาทานที่ร้าน' ? (
                        <span className="text-emerald-600 font-bold">ฟรี 0 บาท (ทานที่ร้าน)</span>
                      ) : diningType === 'นัดรับอาหาร' ? (
                        <span className="text-amber-900 font-bold bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                          ยังไม่รวมค่าส่ง
                        </span>
                      ) : gpsLocation ? (
                        deliveryFee === 0 ? (
                          <span className="text-emerald-600 font-bold">ฟรี 0 บาท</span>
                        ) : (
                          `${deliveryFee} บาท`
                        )
                      ) : (
                        <span className="text-amber-700 font-medium">รอระบุ GPS</span>
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm font-extrabold text-red-600 pt-2 border-t border-stone-200 items-baseline">
                    <span>ยอดรวมทั้งหมด</span>
                    <div className="text-right">
                      <span className="text-base font-black">
                        {diningType === 'ส่งอาหารที่บ้าน' ? totalAmount : foodSubtotal} บาท
                      </span>
                      {diningType === 'นัดรับอาหาร' && (
                        <span className="block text-[10px] text-amber-700 font-medium">
                          *(ยังไม่รวมค่าส่ง)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Submit Button */}
              <div className="pt-2">
                {settings?.isOpen === false ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 bg-rose-600 text-white font-extrabold text-sm rounded-2xl shadow-md opacity-90 cursor-not-allowed text-center"
                  >
                    ขณะนี้ร้านปิด ยังไม่สามารถสั่งอาหารได้
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={
                      isSubmittingOrder ||
                      cart.length === 0 ||
                      (diningType === 'ส่งอาหารที่บ้าน' && isOutOfDeliveryZone && isOutOfZoneProceed !== 'yes') ||
                      (diningType === 'ส่งอาหารที่บ้าน' && isOutOfZoneProceed === 'no')
                    }
                    className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:scale-98 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-extrabold text-base rounded-2xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    {isSubmittingOrder ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>กำลังส่งคำสั่งซื้อ...</span>
                      </span>
                    ) : diningType === 'มาทานที่ร้าน' ? (
                      <span>ยืนยันสั่งอาหาร (มาทานที่ร้าน) ({foodSubtotal} บาท)</span>
                    ) : diningType === 'นัดรับอาหาร' ? (
                      <span>ยืนยันสั่งอาหาร (นัดรับอาหาร) ({foodSubtotal} บาท)</span>
                    ) : !gpsLocation ? (
                      <span>ปักหมุด GPS แล้วสั่งอาหาร ({totalAmount} บาท)</span>
                    ) : isOutOfDeliveryZone && isOutOfZoneProceed !== 'yes' ? (
                      <span>นอกเขตบริการ (เลือกเปลี่ยนรูปแบบการรับ)</span>
                    ) : (
                      <span>ยืนยันสั่งอาหาร ({totalAmount} บาท)</span>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 14, 15, 16. Order Success Modal:
          "หลังสั่งสำเร็จแสดงเลขออเดอร์"
          "แสดงเพียง “สั่งอาหารเรียบร้อย รอร้านติดต่อกลับ”"
          "ลูกค้าไม่ต้องเห็นสถานะออเดอร์" */}
      {completedOrderNumber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center space-y-4 border border-stone-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                เลขออเดอร์ของคุณ
              </span>
              <div className="text-2xl font-black text-red-600 tracking-wider">
                #{completedOrderNumber}
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-stone-700 font-bold text-sm">
              สั่งอาหารเรียบร้อย รอร้านติดต่อกลับ
            </div>

            {/* Dining Type summary badge */}
            <div className="flex justify-center">
              {completedOrderDiningType === 'มาทานที่ร้าน' ? (
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-xs font-black">
                    <Store className="w-3.5 h-3.5 text-emerald-700" />
                    <span>🍽️ รูปแบบ: มาทานที่ร้าน {selectedTableNumber ? `(โต๊ะ ${selectedTableNumber})` : ''}</span>
                  </span>
                  <p className="text-[11px] text-stone-500 font-medium">
                    ทางร้านกำลังปรุงอาหารและจะนำไปเสิร์ฟที่ โต๊ะ {selectedTableNumber || urlTableNumber} ครับ
                  </p>
                </div>
              ) : completedOrderDiningType === 'นัดรับอาหาร' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400 text-stone-950 border-2 border-amber-600 rounded-full text-xs font-black shadow-xs">
                  <MapPin className="w-3.5 h-3.5 text-stone-950" />
                  <span>📍 รูปแบบ: นัดรับอาหาร (โทรนัดหมายร้าน)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100 text-sky-900 border border-sky-300 rounded-full text-xs font-bold">
                  <Truck className="w-3.5 h-3.5 text-sky-700" />
                  <span>🛵 รูปแบบ: ส่งอาหารที่บ้าน</span>
                </span>
              )}
            </div>

            {/* 🎁 แจ้งสิทธิพิเศษที่ได้รับ */}
            {completedOrderRewards.length > 0 && (
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-300 text-xs text-emerald-950 text-left space-y-1">
                <div className="flex items-center gap-1.5 font-black text-emerald-800">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>🎉 สิทธิ์พิเศษที่คุณได้รับจากแต้มสะสม:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] font-bold text-emerald-900 pl-1 space-y-0.5">
                  {completedOrderRewards.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
                <p className="text-[10px] text-emerald-700 pt-0.5">
                  (ระบบแจ้งสิทธิ์ไปยังร้านแล้ว และร้านจะจัดของแถมให้พร้อมออเดอร์นี้)
                </p>
              </div>
            )}

            {/* ⚠️ แจ้งเตือนนอกเขตบริการเกิน 12 กม. */}
            {completedOrderIsOutOfZone && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 text-xs text-amber-950 text-left space-y-1">
                <div className="flex items-center gap-1.5 font-black text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>แจ้งเตือน: นอกเขตบริการ (เกิน 12 กม.)</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                  รายการออเดอร์เข้าสู่ระบบเรียบร้อย เนื่องจากระยะทางเกิน 12 กม. ทางร้านจะโทรติดต่อกลับเพื่อพิจารณาการจัดส่งหรือแจ้งให้ทราบครับ
                </p>
              </div>
            )}

            <p className="text-xs text-stone-500 leading-relaxed">
              ทางร้าน {SHOP_INFO.name} ได้รับรายการแล้ว จะรีบโทรยืนยันและนำส่งความอร่อยถึงบ้านครับ
            </p>

            <button
              onClick={() => setCompletedOrderNumber(null)}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition shadow-sm"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* Sticky Bottom Bar for Cart summary */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-xl">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-stone-500">
                เลือกไว้ {cartItemCount} รายการ
              </div>
              <div className="text-lg font-black text-red-600">
                {foodSubtotal + deliveryFee}{' '}
                <span className="text-xs font-normal text-stone-600">บาท (รวมส่ง)</span>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 py-3 px-6 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-md transition"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>ดูตะกร้า & สั่งอาหาร</span>
            </button>
          </div>
        </div>
      )}

      {/* LINE OA QR Code Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn text-stone-900">
          <div className="w-full max-w-xs bg-white rounded-3xl p-5 shadow-2xl text-center space-y-3.5 border border-stone-200">
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <h3 className="font-extrabold text-sm text-stone-900">
                LINE OA {settings?.lineName || settings?.lineOaName || 'บ้าน สเต็กออนไลน์'}
              </h3>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 inline-block mx-auto shadow-2xs">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  settings?.lineUrl || 'https://line.me/ti/p/~0850451606'
                )}`}
                alt="QR Code LINE OA"
                className="w-44 h-44 object-contain mx-auto"
              />
            </div>

            <p className="text-xs text-stone-500 font-medium">
              สแกน QR Code ด้วยแอป LINE เพื่อเพิ่มเพื่อนและสั่งอาหาร
            </p>

            <a
              href={settings?.lineUrl || 'https://line.me/ti/p/~0850451606'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 bg-[#06C755] hover:bg-[#05b34c] text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>เปิดแอป LINE ทันที</span>
            </a>
          </div>
        </div>
      )}

      {/* Customer Footer Note & Admin Access */}
      <div className="text-center pt-8 pb-4 text-xs text-stone-400 font-medium flex flex-col items-center gap-2">
        <span>© บ้าน สเต็กออนไลน์ • บริการส่งความอร่อยถึงมือคุณ</span>
        <button
          type="button"
          onClick={onOpenAdminLogin}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 text-xs font-semibold transition cursor-pointer"
          title="เข้าสู่ระบบ Admin สำหรับร้านค้า"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>เข้าสู่ระบบ Admin</span>
        </button>
      </div>
    </div>
  );
};
