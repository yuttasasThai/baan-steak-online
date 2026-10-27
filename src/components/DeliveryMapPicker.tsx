import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Navigation,
  Maximize2,
  Minimize2,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Store,
  Compass,
} from 'lucide-react';

export interface GpsCoordinates {
  lat: number;
  lng: number;
}

interface DeliveryMapPickerProps {
  currentLocation: GpsCoordinates | null;
  shopLocation: GpsCoordinates;
  distanceKm: number | null;
  deliveryFee: number;
  rateDescription?: string;
  isOutOfDeliveryZone?: boolean;
  onLocationChange: (coords: GpsCoordinates) => void;
  onNotify?: (message: string, type: 'success' | 'error' | 'info') => void;
}

// Helper to parse pasted Google Maps URL or lat,lng text
export function parseCoordinatesOrUrl(input: string): GpsCoordinates | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Pattern 1: @16.5447,102.1005
  const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // Pattern 2: q=lat,lng or ll=lat,lng or query=lat,lng
  const qMatch = trimmed.match(/(?:q|ll|query|destination)=(-?\d+\.\d+),(-?\d+\.\d+)/i);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  // Pattern 3: direct "16.5447, 102.1005" or "16.5447 102.1005"
  const plainMatch = trimmed.match(/^(-?\d+\.\d+)[\s,]+(-?\d+\.\d+)$/);
  if (plainMatch) {
    const lat = parseFloat(plainMatch[1]);
    const lng = parseFloat(plainMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }

  return null;
}

export const DeliveryMapPicker: React.FC<DeliveryMapPickerProps> = ({
  currentLocation,
  shopLocation,
  distanceKm,
  deliveryFee,
  rateDescription,
  isOutOfDeliveryZone,
  onLocationChange,
  onNotify,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const modalMapContainerRef = useRef<HTMLDivElement | null>(null);

  const mapInstanceRef = useRef<L.Map | null>(null);
  const modalMapInstanceRef = useRef<L.Map | null>(null);

  const shopMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const modalShopMarkerRef = useRef<L.Marker | null>(null);
  const modalUserMarkerRef = useRef<L.Marker | null>(null);
  const modalPolylineRef = useRef<L.Polyline | null>(null);

  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Custom marker icons using Leaflet DivIcon
  const createShopIcon = () => {
    return L.divIcon({
      className: 'custom-shop-pin',
      html: `
        <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; pointer-events: none;">
          <div style="background-color: #059669; color: white; padding: 2px 8px; border-radius: 9999px; font-weight: 800; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 6px rgba(0,0,0,0.2); border: 2px solid white; display: flex; align-items: center; gap: 4px;">
            <span>🏪 ร้านบ้านสเต็ก</span>
          </div>
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #059669; margin-top: -1px;"></div>
        </div>
      `,
      iconSize: [30, 42],
      iconAnchor: [15, 42],
    });
  };

  const createUserIcon = () => {
    return L.divIcon({
      className: 'custom-user-pin',
      html: `
        <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; cursor: grab;">
          <div style="background-color: #dc2626; color: white; padding: 3px 10px; border-radius: 9999px; font-weight: 800; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 10px rgba(220,38,38,0.4); border: 2px solid white; display: flex; align-items: center; gap: 4px; animation: bounce 1s infinite alternate;">
            <span>📍 จุดจัดส่งอาหาร</span>
          </div>
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #dc2626; margin-top: -1px;"></div>
          <div style="width: 10px; height: 10px; background: rgba(220,38,38,0.4); border-radius: 50%; margin-top: -3px;"></div>
        </div>
      `,
      iconSize: [30, 42],
      iconAnchor: [15, 42],
    });
  };

  // Initialize embedded map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter: [number, number] = currentLocation
      ? [currentLocation.lat, currentLocation.lng]
      : [shopLocation.lat, shopLocation.lng];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: currentLocation ? 15 : 14,
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Shop Marker
    const shopMarker = L.marker([shopLocation.lat, shopLocation.lng], {
      icon: createShopIcon(),
      interactive: true,
    })
      .addTo(map)
      .bindPopup('<strong>ร้าน บ้าน สเต็กออนไลน์</strong><br/>จุดเริ่มต้นคำนวณค่าจัดส่ง');
    shopMarkerRef.current = shopMarker;

    // Delivery Marker (if location exists)
    if (currentLocation) {
      const userMarker = L.marker([currentLocation.lat, currentLocation.lng], {
        icon: createUserIcon(),
        draggable: true,
      }).addTo(map);

      userMarker.on('dragend', (e) => {
        const marker = e.target as L.Marker;
        const pos = marker.getLatLng();
        const coords = { lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) };
        onLocationChange(coords);
      });

      userMarkerRef.current = userMarker;

      // Polyline between shop and user
      const poly = L.polyline(
        [
          [shopLocation.lat, shopLocation.lng],
          [currentLocation.lat, currentLocation.lng],
        ],
        { color: '#dc2626', weight: 3, dashArray: '6, 8', opacity: 0.8 }
      ).addTo(map);
      polylineRef.current = poly;
    }

    // Tap/Click to pin on map
    map.on('click', (e: L.LeafletMouseEvent) => {
      const coords = {
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6)),
      };
      onLocationChange(coords);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update embedded map when currentLocation changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([currentLocation.lat, currentLocation.lng]);
      } else {
        const userMarker = L.marker([currentLocation.lat, currentLocation.lng], {
          icon: createUserIcon(),
          draggable: true,
        }).addTo(map);

        userMarker.on('dragend', (e) => {
          const marker = e.target as L.Marker;
          const pos = marker.getLatLng();
          const coords = { lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) };
          onLocationChange(coords);
        });

        userMarkerRef.current = userMarker;
      }

      if (polylineRef.current) {
        polylineRef.current.setLatLngs([
          [shopLocation.lat, shopLocation.lng],
          [currentLocation.lat, currentLocation.lng],
        ]);
      } else {
        const poly = L.polyline(
          [
            [shopLocation.lat, shopLocation.lng],
            [currentLocation.lat, currentLocation.lng],
          ],
          { color: '#dc2626', weight: 3, dashArray: '6, 8', opacity: 0.8 }
        ).addTo(map);
        polylineRef.current = poly;
      }
    } else {
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }
    }
  }, [currentLocation, shopLocation]);

  // Modal Map initialization
  useEffect(() => {
    if (!isModalOpen) {
      if (modalMapInstanceRef.current) {
        modalMapInstanceRef.current.remove();
        modalMapInstanceRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!modalMapContainerRef.current) return;
      if (modalMapInstanceRef.current) return;

      const initialCenter: [number, number] = currentLocation
        ? [currentLocation.lat, currentLocation.lng]
        : [shopLocation.lat, shopLocation.lng];

      const modalMap = L.map(modalMapContainerRef.current, {
        center: initialCenter,
        zoom: currentLocation ? 16 : 15,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(modalMap);

      // Shop marker
      L.marker([shopLocation.lat, shopLocation.lng], {
        icon: createShopIcon(),
      })
        .addTo(modalMap)
        .bindPopup('<strong>ร้าน บ้าน สเต็กออนไลน์</strong>');

      // User marker
      if (currentLocation) {
        const uMarker = L.marker([currentLocation.lat, currentLocation.lng], {
          icon: createUserIcon(),
          draggable: true,
        }).addTo(modalMap);

        uMarker.on('dragend', (e) => {
          const marker = e.target as L.Marker;
          const pos = marker.getLatLng();
          const coords = { lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) };
          onLocationChange(coords);
        });

        modalUserMarkerRef.current = uMarker;

        const poly = L.polyline(
          [
            [shopLocation.lat, shopLocation.lng],
            [currentLocation.lat, currentLocation.lng],
          ],
          { color: '#dc2626', weight: 3, dashArray: '6, 8', opacity: 0.8 }
        ).addTo(modalMap);
        modalPolylineRef.current = poly;
      }

      modalMap.on('click', (e: L.LeafletMouseEvent) => {
        const coords = {
          lat: Number(e.latlng.lat.toFixed(6)),
          lng: Number(e.latlng.lng.toFixed(6)),
        };
        onLocationChange(coords);
      });

      modalMapInstanceRef.current = modalMap;
      modalMap.invalidateSize();
    }, 150);

    return () => clearTimeout(timer);
  }, [isModalOpen]);

  // Update modal map markers
  useEffect(() => {
    const modalMap = modalMapInstanceRef.current;
    if (!modalMap) return;

    if (currentLocation) {
      if (modalUserMarkerRef.current) {
        modalUserMarkerRef.current.setLatLng([currentLocation.lat, currentLocation.lng]);
      } else {
        const uMarker = L.marker([currentLocation.lat, currentLocation.lng], {
          icon: createUserIcon(),
          draggable: true,
        }).addTo(modalMap);

        uMarker.on('dragend', (e) => {
          const marker = e.target as L.Marker;
          const pos = marker.getLatLng();
          const coords = { lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) };
          onLocationChange(coords);
        });
        modalUserMarkerRef.current = uMarker;
      }

      if (modalPolylineRef.current) {
        modalPolylineRef.current.setLatLngs([
          [shopLocation.lat, shopLocation.lng],
          [currentLocation.lat, currentLocation.lng],
        ]);
      } else {
        const poly = L.polyline(
          [
            [shopLocation.lat, shopLocation.lng],
            [currentLocation.lat, currentLocation.lng],
          ],
          { color: '#dc2626', weight: 3, dashArray: '6, 8', opacity: 0.8 }
        ).addTo(modalMap);
        modalPolylineRef.current = poly;
      }
    }
  }, [currentLocation, isModalOpen]);

  // Enhanced GPS Geolocation
  const handleGetGps = () => {
    if (!navigator.geolocation) {
      setGpsError('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับระบบ GPS กรุณาแตะบนแผนที่เพื่อปักหมุด');
      if (onNotify) onNotify('อุปกรณ์ไม่รองรับ GPS แตะบนแผนที่เพื่อปักหมุดได้เลยครับ', 'error');
      return;
    }

    setIsGettingGps(true);
    setGpsError(null);

    const onSuccess = (pos: GeolocationPosition) => {
      const coords = {
        lat: Number(pos.coords.latitude.toFixed(6)),
        lng: Number(pos.coords.longitude.toFixed(6)),
      };
      onLocationChange(coords);
      setIsGettingGps(false);
      setGpsError(null);

      // Pan maps to position
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([coords.lat, coords.lng], 16, { duration: 1 });
      }
      if (modalMapInstanceRef.current) {
        modalMapInstanceRef.current.flyTo([coords.lat, coords.lng], 16, { duration: 1 });
      }

      if (onNotify) onNotify('ดึงพิกัด GPS ปัจจุบันสำเร็จแล้ว', 'success');
    };

    const onError = (err: GeolocationPositionError) => {
      // If high accuracy timed out, retry with normal accuracy
      if (err.code === err.TIMEOUT) {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (fallbackErr) => {
            setIsGettingGps(false);
            setGpsError('ไม่สามารถดึงตำแหน่ง GPS ได้ กรุณาแตะเลือกจุดบนแผนที่ด้านล่างได้เลยครับ');
            if (onNotify) onNotify('ดึง GPS ไม่สำเร็จ แตะเลือกตำแหน่งบนแผนที่แทนได้เลยครับ', 'info');
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
        return;
      }

      setIsGettingGps(false);
      if (err.code === err.PERMISSION_DENIED) {
        setGpsError('เบราว์เซอร์ปฏิเสธสิทธิ์ตำแหน่ง ไม่เป็นไรครับ! แตะปักหมุดบนแผนที่ด้านล่างได้ทันที');
        if (onNotify) onNotify('เบราว์เซอร์ไม่ให้สิทธิ์ GPS แตะบนแผนที่เพื่อปักหมุดได้เลยครับ', 'info');
      } else {
        setGpsError('ไม่พบสัญญาณ GPS กรุณาแตะเลือกตำแหน่งบ้านของคุณบนแผนที่ด้านล่าง');
        if (onNotify) onNotify('แตะบนแผนที่เพื่อปักหมุดบ้านของคุณได้เลยครับ', 'info');
      }
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 0,
    });
  };

  // Handle pasted URL or coordinates
  const handleApplyPastedLocation = () => {
    setPasteError(null);
    if (!pasteInput.trim()) return;

    const parsed = parseCoordinatesOrUrl(pasteInput);
    if (parsed) {
      onLocationChange(parsed);
      setPasteInput('');
      setPasteError(null);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([parsed.lat, parsed.lng], 16);
      }
      if (modalMapInstanceRef.current) {
        modalMapInstanceRef.current.flyTo([parsed.lat, parsed.lng], 16);
      }
      if (onNotify) onNotify('ปักหมุดจากพิกัดเรียบร้อย', 'success');
    } else {
      setPasteError('รูปแบบพิกัดไม่ถูกต้อง เช่น 16.5447, 102.1005 หรือลิงก์ Google Maps');
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with Title and GPS Button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-stone-800 text-xs">
          <MapPin className="w-4 h-4 text-red-600" />
          <span>ปักหมุดตำแหน่งจัดส่ง (คำนวณค่าส่งอัตโนมัติ)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGetGps}
            disabled={isGettingGps}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 disabled:bg-stone-300 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-xs"
            title="ดึงพิกัดจากตำแหน่งปัจจุบันของคุณ"
          >
            <Navigation className={`w-3.5 h-3.5 ${isGettingGps ? 'animate-spin' : ''}`} />
            <span>{isGettingGps ? 'กำลังค้นหา...' : 'ใช้พิกัดปัจจุบัน (GPS)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="p-1.5 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 rounded-xl transition border border-stone-200"
            title="เปิดแผนที่เต็มจอเพื่อปักหมุดสะดวกขึ้น"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Helpful Hint on Tap Pinning */}
      <div className="flex items-center justify-between text-[11px] text-stone-500 bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-200">
        <div className="flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span>แตะบนแผนที่เพื่อ<strong>ปักหมุด</strong> หรือลากหมุดสีแดงได้ตามต้องการ</span>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-red-600 font-bold hover:underline shrink-0 text-[11px]"
        >
          ขยายเต็มจอ
        </button>
      </div>

      {/* Embedded Leaflet Map Container */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-stone-200 shadow-inner bg-stone-100">
        <div
          ref={mapContainerRef}
          style={{ height: '220px', width: '100%', zIndex: 10 }}
        />

        {/* Floating Quick Action Overlay */}
        <div className="absolute top-2 right-2 z-20 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.flyTo([shopLocation.lat, shopLocation.lng], 15);
              }
            }}
            className="px-2 py-1 bg-white/95 hover:bg-white text-stone-800 text-[10px] font-bold rounded-lg shadow-sm border border-stone-200 flex items-center gap-1"
            title="ดูที่ตั้งร้าน"
          >
            <Store className="w-3 h-3 text-emerald-600" />
            <span>ที่ตั้งร้าน</span>
          </button>
          {currentLocation && (
            <button
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([currentLocation.lat, currentLocation.lng], 16);
                }
              }}
              className="px-2 py-1 bg-white/95 hover:bg-white text-stone-800 text-[10px] font-bold rounded-lg shadow-sm border border-stone-200 flex items-center gap-1"
              title="เลื่อนไปที่จุดปักหมุด"
            >
              <MapPin className="w-3 h-3 text-red-600" />
              <span>จุดปักหมุด</span>
            </button>
          )}
        </div>
      </div>

      {/* Alternative input: Paste coordinates or Google Maps link */}
      <div className="bg-white p-2.5 rounded-xl border border-stone-200 space-y-1.5 text-xs">
        <label className="text-[11px] font-bold text-stone-700 flex items-center gap-1">
          <Search className="w-3 h-3 text-stone-500" />
          <span>หรือ วางลิงก์ Google Maps / พิกัด (Lat, Lng):</span>
        </label>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={pasteInput}
            onChange={(e) => {
              setPasteInput(e.target.value);
              setPasteError(null);
            }}
            placeholder="เช่น 16.5447, 102.1005 หรือ ลิงก์ Google Maps"
            className="flex-1 px-2.5 py-1.5 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleApplyPastedLocation}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 active:scale-95 text-white font-bold text-xs rounded-lg transition shrink-0"
          >
            ปักหมุด
          </button>
        </div>
        {pasteError && <p className="text-[10px] text-rose-600 font-medium">{pasteError}</p>}
      </div>

      {/* GPS Error notice (if any) with comforting fallback guidance */}
      {gpsError && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
          <div className="flex items-start gap-1.5 font-bold">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{gpsError}</span>
          </div>
          <p className="text-[11px] text-amber-800">
            💡 คุณสามารถแตะเลือกตำแหน่งบ้านของคุณบนแผนที่ด้านบนได้โดยตรง หรือกดปุ่ม <strong>"ขยายเต็มจอ"</strong> เพื่อซูมปักหมุดได้แม่นยำยิ่งขึ้นครับ
          </p>
        </div>
      )}

      {/* Pin Status & Delivery Fee Calculation Summary Card */}
      {currentLocation ? (
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-emerald-800 font-extrabold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>ปักหมุดสำเร็จ</span>
            </div>
            {distanceKm !== null && (
              <div className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                ระยะทาง {distanceKm} กม.
              </div>
            )}
          </div>

          {/* Delivery Fee Highlight */}
          <div className="bg-white/95 p-2.5 rounded-lg border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-stone-800">
              <span>ค่าจัดส่งตามระยะทาง:</span>
            </div>
            <span
              className={`font-extrabold text-sm ${
                deliveryFee === 0 ? 'text-emerald-600' : 'text-stone-900'
              }`}
            >
              {deliveryFee === 0 ? 'ฟรี 0 บาท (0 - 2 กม.)' : `${deliveryFee} บาท`}
            </span>
          </div>

          {/* Coordinates display */}
          <div className="grid grid-cols-2 gap-2 bg-white/70 p-2 rounded-lg text-[10px] font-mono text-stone-600">
            <div>
              <span className="text-stone-400 block font-sans">Lat:</span>
              <span className="font-bold text-stone-900">{currentLocation.lat}</span>
            </div>
            <div>
              <span className="text-stone-400 block font-sans">Lng:</span>
              <span className="font-bold text-stone-900">{currentLocation.lng}</span>
            </div>
          </div>

          {/* Out of zone warning (>12km) */}
          {isOutOfDeliveryZone && (
            <div className="p-3 bg-amber-100/90 rounded-xl border border-amber-300 text-xs text-amber-950 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>แจ้งเตือน: นอกเขตบริการ ({distanceKm} กม.)</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900 font-medium">
                ระยะทางเกิน 12 กม. นอกเขตบริการไม่สามารถนำส่งได้ตามปกติ แต่<strong>รายการออเดอร์จะเข้าสู่ระบบตามปกติ</strong> โดยทางร้านจะพิจารณาว่าจะรับหรือยกเลิกออเดอร์
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-0.5">
            <a
              href={`https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-[11px] font-bold transition shadow-xs"
            >
              <ExternalLink className="w-3 h-3" />
              <span>เปิดดูใน Google Maps</span>
            </a>
            {rateDescription && (
              <span className="text-[11px] text-emerald-700 font-medium">{rateDescription}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>ยังไม่ได้ปักหมุดตำแหน่งจัดส่ง</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            กรุณา <strong>แตะบนแผนที่เพื่อปักหมุด</strong> หรือกดปุ่ม <strong>"ใช้พิกัดปัจจุบัน (GPS)"</strong> เพื่อให้ระบบคำนวณระยะทางและค่าจัดส่งอัตโนมัติ
          </p>
        </div>
      )}

      {/* FULL-SCREEN MAP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl overflow-hidden flex flex-col h-full max-h-full max-w-4xl mx-auto w-full shadow-2xl">
            {/* Modal Header */}
            <div className="p-3.5 border-b border-stone-200 flex items-center justify-between bg-stone-50 shrink-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm">
                    ปักหมุดตำแหน่งจัดส่ง (แตะบนแผนที่เพื่อระบุตำแหน่ง)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    ซูมเข้าเพื่อหาซอยหรือบ้านของคุณ แล้วแตะเพื่อวางหมุด
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-500 hover:bg-stone-200 rounded-xl transition"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls Bar */}
            <div className="px-3.5 py-2 bg-stone-100 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGetGps}
                  disabled={isGettingGps}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition text-xs shadow-xs"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isGettingGps ? 'animate-spin' : ''}`} />
                  <span>ใช้พิกัดปัจจุบัน (GPS)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (modalMapInstanceRef.current) {
                      modalMapInstanceRef.current.flyTo([shopLocation.lat, shopLocation.lng], 16);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-white border border-stone-200 hover:bg-stone-50 font-bold rounded-xl text-stone-700 flex items-center gap-1 text-xs"
                >
                  <Store className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ที่ตั้งร้าน</span>
                </button>
              </div>

              {currentLocation && (
                <div className="font-bold text-emerald-800 text-xs flex items-center gap-1.5 bg-emerald-100 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    ระยะทาง: {distanceKm !== null ? `${distanceKm} กม.` : '-'} | ค่าส่ง:{' '}
                    {deliveryFee === 0 ? 'ฟรี 0 บาท' : `${deliveryFee} บาท`}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Map Viewport */}
            <div className="flex-1 relative w-full h-full min-h-[300px]">
              <div
                ref={modalMapContainerRef}
                className="absolute inset-0 w-full h-full"
                style={{ zIndex: 10 }}
              />
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-stone-200 bg-white shrink-0 flex items-center justify-between gap-3">
              <div className="text-xs text-stone-600">
                {currentLocation ? (
                  <span>
                    พิกัดที่เลือก: <strong className="text-stone-900">{currentLocation.lat}, {currentLocation.lng}</strong>
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium">
                    ยังไม่ได้ปักหมุด กรุณาแตะบนแผนที่เพื่อเลือกตำแหน่ง
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-sm rounded-xl transition shadow-md"
              >
                ยืนยันตำแหน่งนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
