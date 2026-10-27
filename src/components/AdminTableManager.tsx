import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Layers,
  Minus,
  Plus,
  Printer,
  QrCode,
  Share2,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import QRCode from 'qrcode';
import { RestaurantTable } from '../types';
import {
  addCustomTable,
  deleteTable,
  setAllTablesStatus,
  setTotalTableCount,
  updateTableStatus,
} from '../services/menuService';

interface AdminTableManagerProps {
  tables: RestaurantTable[];
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminTableManager: React.FC<AdminTableManagerProps> = ({
  tables,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'table_qrs' | 'pickup_qr'>('tables');
  const [isUpdating, setIsUpdating] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);

  // QR Code Cache State
  const [tableQrMap, setTableQrMap] = useState<Record<string, string>>({});
  const [pickupQrDataUrl, setPickupQrDataUrl] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Print modal state: table object, 'all' for batch print, or 'pickup'
  const [printTarget, setPrintTarget] = useState<RestaurantTable | 'all' | 'pickup' | null>(null);

  // Compute Base Origin
  const currentOrigin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://ais-pre-jhw4ercvam7jfd7tgqjxkr-954826957106.asia-east1.run.app';

  const baseOrigin = currentOrigin.includes('ais-dev-')
    ? currentOrigin.replace('ais-dev-', 'ais-pre-')
    : currentOrigin;

  const getTableUrl = (tbl: RestaurantTable) => `${baseOrigin}/?type=dinein&table=${tbl.number}`;
  const pickupUrl = `${baseOrigin}/?type=pickup`;

  // Pre-generate QR Codes for all tables
  useEffect(() => {
    tables.forEach((tbl) => {
      const url = getTableUrl(tbl);
      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: '#991b1b', // Red-800 brand
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })
        .then((qrUrl) => {
          setTableQrMap((prev) => ({ ...prev, [tbl.id]: qrUrl }));
        })
        .catch((err) => console.error('Table QR Error:', err));
    });
  }, [tables, baseOrigin]);

  // Pre-generate Pickup QR Code
  useEffect(() => {
    QRCode.toDataURL(pickupUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: '#b45309', // Amber-700 for pickup
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((qrUrl) => {
        setPickupQrDataUrl(qrUrl);
      })
      .catch((err) => console.error('Pickup QR Error:', err));
  }, [pickupUrl]);

  // Statistics
  const totalTables = tables.length;
  const occupiedCount = tables.filter((t) => t.isOccupied).length;
  const availableCount = totalTables - occupiedCount;

  // Toggle table occupancy status (ว่าง <-> เต็ม)
  const handleToggleTable = async (table: RestaurantTable) => {
    try {
      const nextStatus = !table.isOccupied;
      await updateTableStatus(table.id, nextStatus);
      if (nextStatus) {
        onNotify(`🔴 เปลี่ยน "${table.name}" เป็น: โต๊ะเต็ม (มีลูกค้านั่ง)`, 'info');
      } else {
        onNotify(`🟢 เปลี่ยน "${table.name}" เป็น: โต๊ะว่าง (พร้อมรับลูกค้าใหม่)`, 'success');
      }
    } catch (err) {
      onNotify('ไม่สามารถเปลี่ยนสถานะโต๊ะได้ กรุณาลองใหม่อีกครั้ง', 'error');
    }
  };

  // Change total tables count
  const handleAdjustCount = async (delta: number) => {
    const nextCount = Math.max(1, totalTables + delta);
    if (nextCount === totalTables) return;
    try {
      setIsUpdating(true);
      await setTotalTableCount(nextCount);
      onNotify(`ปรับจำนวนโต๊ะในร้านเป็น ${nextCount} โต๊ะเรียบร้อย`, 'success');
    } catch (err) {
      onNotify('เกิดข้อผิดพลาดในการปรับจำนวนโต๊ะ', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetPresetCount = async (count: number) => {
    try {
      setIsUpdating(true);
      await setTotalTableCount(count);
      onNotify(`กำหนดจำนวนโต๊ะเป็น ${count} โต๊ะเรียบร้อย`, 'success');
    } catch (err) {
      onNotify('เกิดข้อผิดพลาดในการกำหนดจำนวนโต๊ะ', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Mark all tables available
  const handleSetAllAvailable = async () => {
    if (window.confirm('ต้องการเปลี่ยนให้ทุกโต๊ะเป็นสถานะ "โต๊ะว่าง" ทั้งหมดใช่หรือไม่?')) {
      try {
        await setAllTablesStatus(false);
        onNotify('🟢 ตั้งค่าทุกโต๊ะเป็น "โต๊ะว่าง" เรียบร้อยแล้ว', 'success');
      } catch (err) {
        onNotify('ไม่สามารถเปลี่ยนสถานะได้', 'error');
      }
    }
  };

  // Mark all tables occupied
  const handleSetAllOccupied = async () => {
    if (window.confirm('ต้องการแจ้งว่า "โต๊ะเต็มทุกโต๊ะ" (งดรับลูกค้าทานที่ร้านชั่วคราว) ใช่หรือไม่?')) {
      try {
        await setAllTablesStatus(true);
        onNotify('🔴 แจ้ง "โต๊ะเต็มทุกโต๊ะ" เรียบร้อยแล้ว (หน้าเว็บลูกค้าจะขึ้นแจ้งเตือนโต๊ะเต็ม)', 'info');
      } catch (err) {
        onNotify('ไม่สามารถเปลี่ยนสถานะได้', 'error');
      }
    }
  };

  // Add custom table name
  const handleAddCustomTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    try {
      await addCustomTable(newTableName.trim());
      onNotify(`เพิ่ม "${newTableName.trim()}" เรียบร้อยแล้ว`, 'success');
      setNewTableName('');
      setShowAddCustomModal(false);
    } catch (err) {
      onNotify('ไม่สามารถเพิ่มโต๊ะได้', 'error');
    }
  };

  // Delete table
  const handleDeleteTable = async (table: RestaurantTable) => {
    if (window.confirm(`ต้องการลบ "${table.name}" ออกจากระบบหรือไม่?`)) {
      try {
        await deleteTable(table.id);
        onNotify(`ลบ "${table.name}" เรียบร้อย`, 'success');
      } catch (err) {
        onNotify('ไม่สามารถลบโต๊ะได้', 'error');
      }
    }
  };

  // Copy link helper
  const handleCopyLink = (url: string, key: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      onNotify(`📋 คัดลอกลิงก์ ${label} แล้ว`, 'success');
    }
  };

  // Download QR code image helper
  const handleDownloadQrImage = (dataUrl: string, filename: string) => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onNotify(`📥 บันทึกรูปภาพ ${filename} เรียบร้อยแล้ว`, 'success');
  };

  return (
    <div className="space-y-4 text-stone-900 font-['Prompt',sans-serif]">
      {/* 1. Header Card with Feature Overview */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white flex items-center justify-center text-lg font-black shadow-sm">
              🍽️
            </div>
            <h2 className="text-xl font-black text-stone-900">
              ระบบโต๊ะอาหาร &amp; QR Code สแกนสั่ง
            </h2>
            <span className="text-xs px-2.5 py-0.5 bg-red-100 text-red-700 font-extrabold rounded-lg">
              ซิงก์สด 100%
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            สแกน QR ประจำโต๊ะเพื่อส่งออเดอร์ตามเลขโต๊ะอัตโนมัติ + ปรับสถานะว่าง/เต็มอัตโนมัติหลังสั่ง + QR รับกลับบ้าน
          </p>
        </div>

        {/* Global Tab Switcher */}
        <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-200 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tables'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>🍽️ สถานะโต๊ะ ({availableCount} ว่าง)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('table_qrs')}
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'table_qrs'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR โต๊ะอาหาร</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pickup_qr')}
            className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pickup_qr'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>QR รับกลับบ้าน</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: สถานะโต๊ะอาหาร (ว่าง / เต็ม) & ควบคุมจำนวนโต๊ะ */}
      {/* ========================================================================= */}
      {activeTab === 'tables' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Quick Stats & Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Available Count */}
            <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>โต๊ะว่าง (พร้อมรับลูกค้า)</span>
                </div>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {availableCount} <span className="text-sm font-medium">โต๊ะ</span>
                </div>
              </div>
              <div className="text-3xl">🟢</div>
            </div>

            {/* Occupied Count */}
            <div className="bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>โต๊ะเต็ม (มีลูกค้านั่ง)</span>
                </div>
                <div className="text-2xl font-black text-rose-700 mt-1">
                  {occupiedCount} <span className="text-sm font-medium">โต๊ะ</span>
                </div>
              </div>
              <div className="text-3xl">🔴</div>
            </div>

            {/* Total Tables Stepper Control */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
              <div>
                <div className="text-xs font-bold text-stone-600">จำนวนโต๊ะทั้งหมดในร้าน:</div>
                <div className="text-2xl font-black text-stone-900 mt-1">
                  {totalTables} <span className="text-sm font-medium text-stone-500">โต๊ะ</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isUpdating || totalTables <= 1}
                  onClick={() => handleAdjustCount(-1)}
                  className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 flex items-center justify-center font-bold text-stone-800 disabled:opacity-40 transition cursor-pointer"
                  title="ลด 1 โต๊ะ"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={isUpdating || totalTables >= 50}
                  onClick={() => handleAdjustCount(1)}
                  className="w-9 h-9 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-95 flex items-center justify-center font-bold text-white disabled:opacity-40 transition cursor-pointer"
                  title="เพิ่ม 1 โต๊ะ"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Preset Buttons & Bulk Actions */}
          <div className="bg-white rounded-2xl p-3.5 border border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-stone-600 mr-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-stone-500" />
                <span>ตั้งจำนวนโต๊ะด่วน:</span>
              </span>
              {[4, 6, 8, 10, 12, 15, 20].map((count) => (
                <button
                  key={count}
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleSetPresetCount(count)}
                  className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                    totalTables === count
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-stone-100 border border-stone-200 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {count} โต๊ะ
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetAllAvailable}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
                title="เปลี่ยนให้ทุกโต๊ะว่างทั้งหมด"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>เคลียร์ว่างทุกโต๊ะ</span>
              </button>

              <button
                type="button"
                onClick={handleSetAllOccupied}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
                title="แจ้งลูกค้าว่าโต๊ะเต็มทุกโต๊ะ"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>แจ้งโต๊ะเต็มทั้งหมด</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddCustomModal(true)}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มโต๊ะพิเศษ</span>
              </button>
            </div>
          </div>

          {/* Table Interactive Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-red-600" />
                <span>แตะที่ปุ่มสถานะของแต่ละโต๊ะเพื่อสลับ "ว่าง" / "เต็ม" ได้ทันที:</span>
              </div>
              <span className="text-[11px] text-stone-400">
                เมื่อลูกค้ากดส่งออเดอร์จากโต๊ะ สถานะจะเปลี่ยนเป็น "เต็ม" อัตโนมัติ
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {tables.map((table) => {
                const isFull = table.isOccupied;
                const qrUrl = tableQrMap[table.id];

                return (
                  <div
                    key={table.id}
                    className={`rounded-2xl p-3.5 border-2 transition-all shadow-xs flex flex-col justify-between gap-3 ${
                      isFull
                        ? 'bg-rose-50/50 border-rose-300'
                        : 'bg-white border-emerald-300 hover:border-emerald-400'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <span className="text-base font-black text-stone-900 block leading-tight">
                          {table.name}
                        </span>
                        <span className="text-[10px] text-stone-500 font-medium">
                          สำหรับทานที่ร้าน
                        </span>
                      </div>

                      {table.number > 8 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTable(table)}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="ลบโต๊ะนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Status Toggle Big Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleTable(table)}
                      className={`w-full py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
                        isFull
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                      title="คลิกเพื่อสลับสถานะ"
                    >
                      <span className="text-sm">{isFull ? '🔴' : '🟢'}</span>
                      <span>{isFull ? 'โต๊ะเต็ม (มีลูกค้า)' : 'โต๊ะว่าง (พร้อมรับ)'}</span>
                    </button>

                    {/* QR Code Quick Actions */}
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => setPrintTarget(table)}
                        className="inline-flex items-center gap-1 font-bold text-stone-700 hover:text-stone-900 cursor-pointer"
                        title="ดูการ์ดและสั่งพิมพ์"
                      >
                        <Printer className="w-3 h-3 text-stone-500" />
                        <span>พิมพ์ป้าย</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const url = getTableUrl(table);
                          handleCopyLink(url, table.id, table.name);
                        }}
                        className="inline-flex items-center gap-1 font-bold text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        {copiedKey === table.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">คัดลอกแล้ว</span>
                          </>
                        ) : (
                          <>
                            <QrCode className="w-3 h-3" />
                            <span>ดู QR Code</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QR Code ประจำโต๊ะอาหาร (สำหรับติดที่โต๊ะในร้าน) */}
      {/* ========================================================================= */}
      {activeTab === 'table_qrs' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Top Banner & Batch Print Button */}
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-300" />
                <h3 className="text-base sm:text-lg font-black">
                  QR Code ประจำโต๊ะอาหาร (สแกนสั่งจากโต๊ะอัตโนมัติ)
                </h3>
              </div>
              <p className="text-xs text-rose-100 mt-1 max-w-xl leading-relaxed">
                ลูกค้านั่งที่โต๊ะแล้วเปิดกล้องหรือ LINE สแกน QR ประจำโต๊ะ ระบบจะเลือก "มาทานที่ร้าน" พร้อมล็อคเลขโต๊ะให้อัตโนมัติ เมื่อส่งออเดอร์ ระบบจะเปลี่ยนสถานะโต๊ะเป็น "ไม่ว่าง" ทันที!
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPrintTarget('all')}
              className="px-4 py-2.5 bg-white text-stone-900 hover:bg-stone-100 active:scale-95 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition shrink-0 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-red-600" />
              <span>🖨️ พิมพ์ป้ายทุกโต๊ะพร้อมกัน (Print All)</span>
            </button>
          </div>

          {/* Grid of Table QR Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => {
              const url = getTableUrl(table);
              const qrDataUrl = tableQrMap[table.id];

              return (
                <div
                  key={table.id}
                  className="bg-white rounded-3xl p-4 border-2 border-stone-200 hover:border-red-400 transition shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2 text-center">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[11px] font-black">
                        สำหรับทานที่ร้าน
                      </span>
                      <span className="text-[11px] font-bold text-stone-500">
                        {table.isOccupied ? '🔴 ไม่ว่าง' : '🟢 ว่าง'}
                      </span>
                    </div>

                    <h4 className="text-lg font-black text-stone-900 tracking-tight">
                      {table.name}
                    </h4>

                    {/* QR Code Display */}
                    <div className="flex justify-center py-1">
                      {qrDataUrl ? (
                        <div className="p-2 bg-white rounded-2xl border border-stone-200 shadow-xs">
                          <img
                            src={qrDataUrl}
                            alt={`QR Code ${table.name}`}
                            className="w-44 h-44 object-contain rounded-xl"
                          />
                        </div>
                      ) : (
                        <div className="w-44 h-44 rounded-2xl bg-stone-100 animate-pulse flex items-center justify-center text-xs text-stone-400">
                          กำลังสร้าง QR...
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-stone-500 leading-tight">
                      สแกนเพื่อสั่งอาหารสำหรับ <strong className="text-red-700">{table.name}</strong>
                    </p>

                    {/* Direct URL input snippet */}
                    <div className="bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[11px] text-stone-600 font-mono">
                      <span className="truncate mr-1 max-w-[190px]">{url}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(url, table.id, table.name)}
                        className="text-red-600 font-bold hover:underline shrink-0"
                      >
                        {copiedKey === table.id ? '✓ ก๊อปแล้ว' : 'คัดลอก'}
                      </button>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-stone-100 text-xs">
                    <button
                      type="button"
                      disabled={!qrDataUrl}
                      onClick={() => handleDownloadQrImage(qrDataUrl, `BaanSteak-${table.name}-QR.png`)}
                      className="py-2 px-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                      title="ดาวน์โหลดรูป QR Code PNG ลงเครื่อง"
                    >
                      <Download className="w-3.5 h-3.5 text-stone-600" />
                      <span>บันทึกรูป</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrintTarget(table)}
                      className="py-2 px-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                      title="ดูป้ายสำหรับพิมพ์ติดโต๊ะ"
                    >
                      <Printer className="w-3.5 h-3.5 text-red-600" />
                      <span>พิมพ์ป้าย</span>
                    </button>

                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold flex items-center justify-center gap-1 transition text-center"
                      title="เปิดหน้าเว็บทดสอบสแกน"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>ทดสอบ</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: QR Code รับกลับบ้าน / นัดรับที่ร้าน (Pickup Takeaway) */}
      {/* ========================================================================= */}
      {activeTab === 'pickup_qr' && (
        <div className="space-y-4 animate-fadeIn max-w-xl mx-auto">
          <div className="bg-white rounded-3xl p-6 border-2 border-amber-300 shadow-md space-y-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black">
              <ShoppingBag className="w-4 h-4 text-amber-700" />
              <span>สั่งอาหารล่วงหน้า / รับกลับบ้านที่ร้าน (Pickup)</span>
            </div>

            <div>
              <h3 className="text-xl font-black text-stone-900">
                QR Code สำหรับลูกค้าสั่งกลับบ้าน
              </h3>
              <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto leading-relaxed">
                เหมาะสำหรับติดป้ายที่เคาน์เตอร์หน้าร้าน หรือส่งให้ลูกค้าทาง LINE / Facebook เพื่อสั่งอาหารล่วงหน้า ไม่ต้องรอทำหน้าร้าน และไม่มีค่าจัดส่ง
              </p>
            </div>

            {/* QR Code Image */}
            <div className="flex justify-center py-2">
              {pickupQrDataUrl ? (
                <div className="p-3 bg-white rounded-3xl border-2 border-amber-200 shadow-md inline-block">
                  <img
                    src={pickupQrDataUrl}
                    alt="Pickup QR Code"
                    className="w-56 h-56 object-contain rounded-2xl"
                  />
                </div>
              ) : (
                <div className="w-56 h-56 rounded-3xl bg-stone-100 animate-pulse flex items-center justify-center text-xs text-stone-400">
                  กำลังสร้าง QR...
                </div>
              )}
            </div>

            {/* URL Display */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 flex items-center justify-between text-xs text-stone-700 font-mono">
              <span className="truncate mr-2">{pickupUrl}</span>
              <button
                type="button"
                onClick={() => handleCopyLink(pickupUrl, 'pickup_key', 'สั่งกลับบ้าน')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-sans font-bold text-xs shrink-0 cursor-pointer"
              >
                {copiedKey === 'pickup_key' ? '✓ คัดลอกแล้ว' : 'คัดลอกลิงก์'}
              </button>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                disabled={!pickupQrDataUrl}
                onClick={() => handleDownloadQrImage(pickupQrDataUrl, 'BaanSteak-Pickup-Takeaway-QR.png')}
                className="py-3 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-stone-600" />
                <span>บันทึกรูป QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintTarget('pickup')}
                className="py-3 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ พิมพ์ป้ายหน้าร้าน</span>
              </button>

              <a
                href={pickupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition text-center"
              >
                <ExternalLink className="w-4 h-4" />
                <span>เปิดทดสอบ</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Printable Modal (สั่งพิมพ์ป้ายตั้งโต๊ะ / ป้ายหน้าร้าน) */}
      {/* ========================================================================= */}
      {printTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-red-600" />
                <h3 className="font-black text-base text-stone-900">
                  {printTarget === 'all'
                    ? `พิมพ์ป้ายตั้งโต๊ะทั้งหมด (${tables.length} โต๊ะ)`
                    : printTarget === 'pickup'
                    ? 'พิมพ์ป้ายสั่งกลับบ้าน (Pickup)'
                    : `พิมพ์ป้ายตั้งโต๊ะ: ${(printTarget as RestaurantTable).name}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPrintTarget(null)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Preview Area */}
            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-6">
              {/* Case 1: Print All Tables */}
              {printTarget === 'all' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tables.map((tbl) => (
                    <div
                      key={tbl.id}
                      className="border-2 border-stone-900 rounded-2xl p-4 text-center bg-white space-y-2 shadow-xs"
                    >
                      <div className="text-xs font-black tracking-wider text-red-600 uppercase">
                        บ้าน สเต็กออนไลน์
                      </div>
                      <div className="text-xl font-black text-stone-900">{tbl.name}</div>
                      <div className="flex justify-center">
                        {tableQrMap[tbl.id] ? (
                          <img
                            src={tableQrMap[tbl.id]}
                            alt={tbl.name}
                            className="w-36 h-36 object-contain"
                          />
                        ) : null}
                      </div>
                      <p className="text-[10px] text-stone-600 font-bold">
                        สแกนเพื่อสั่งอาหารจากโต๊ะนี้<br />
                        <span className="text-stone-400 font-normal">ไม่ต้องรอเรียกพนักงาน</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : printTarget === 'pickup' ? (
                /* Case 2: Print Pickup */
                <div className="border-4 border-amber-600 rounded-3xl p-6 text-center bg-white space-y-3 shadow-md max-w-sm mx-auto">
                  <div className="text-sm font-black tracking-wider text-amber-700">
                    บ้าน สเต็กออนไลน์
                  </div>
                  <div className="text-2xl font-black text-stone-900">
                    🛍️ สั่งกลับบ้าน / นัดรับอาหาร
                  </div>
                  <div className="flex justify-center py-2">
                    {pickupQrDataUrl ? (
                      <img
                        src={pickupQrDataUrl}
                        alt="Pickup QR"
                        className="w-48 h-48 object-contain"
                      />
                    ) : null}
                  </div>
                  <p className="text-xs text-stone-700 font-bold leading-relaxed">
                    สแกนสั่งล่วงหน้า มารับที่ร้านได้ทันที<br />
                    <span className="text-amber-800 font-extrabold">ฟรีค่าจัดส่ง 0 บาท</span>
                  </p>
                </div>
              ) : (
                /* Case 3: Print Single Table */
                <div className="border-4 border-red-600 rounded-3xl p-6 text-center bg-white space-y-3 shadow-md max-w-sm mx-auto">
                  <div className="text-sm font-black tracking-wider text-red-600">
                    บ้าน สเต็กออนไลน์ • อ.ชุมแพ
                  </div>
                  <div className="text-3xl font-black text-stone-900">
                    🍽️ {(printTarget as RestaurantTable).name}
                  </div>
                  <div className="flex justify-center py-2">
                    {tableQrMap[(printTarget as RestaurantTable).id] ? (
                      <img
                        src={tableQrMap[(printTarget as RestaurantTable).id]}
                        alt={(printTarget as RestaurantTable).name}
                        className="w-48 h-48 object-contain"
                      />
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-stone-800 font-bold">
                      สแกนสั่งอาหารจากโต๊ะนี้ได้ทันที
                    </p>
                    <p className="text-[11px] text-stone-500">
                      ระบบจะส่งออเดอร์ถึงครัวตามเลขโต๊ะอัตโนมัติ
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Print Action Buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setPrintTarget(null)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Printer className="w-4 h-4" />
                <span>สั่งพิมพ์ทางเครื่องพิมพ์ (Print)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Table Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="font-black text-base text-stone-900">เพิ่มโต๊ะพิเศษ</h3>
              <button
                onClick={() => setShowAddCustomModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomTable} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  ชื่อโต๊ะอาหาร:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="เช่น โต๊ะ VIP 1, ซุ้มริมสวน 2..."
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  บันทึกโต๊ะใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
