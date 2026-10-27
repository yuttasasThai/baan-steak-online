import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Layers,
  Link2,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  Sparkles,
  Table,
  Trash2,
  Users,
  Utensils,
  Zap,
} from 'lucide-react';
import { RestaurantTable } from '../types';
import {
  addCustomTable,
  deleteTable,
  setAllTablesStatus,
  setTotalTableCount,
  updateTableStatus,
} from '../services/menuService';
import { AdminLinkManagerModal } from './AdminLinkManagerModal';

interface AdminTableManagerProps {
  tables: RestaurantTable[];
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminTableManager: React.FC<AdminTableManagerProps> = ({
  tables,
  onNotify,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [selectedTableForQr, setSelectedTableForQr] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

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

  return (
    <div className="space-y-4 text-stone-900 font-['Prompt',sans-serif]">
      {/* 1. Header Card */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-black">
              🍽️
            </div>
            <h2 className="text-xl font-black text-stone-900">จัดการโต๊ะอาหารในร้าน (ทานที่ร้าน)</h2>
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded-md">
              Real-Time
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            กำหนดจำนวนโต๊ะในร้าน ควบคุมสถานะ "โต๊ะว่าง" / "โต๊ะเต็ม" ซิงก์สดสู่หน้าจอลูกค้าทันที
          </p>
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSetAllAvailable}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            title="เปลี่ยนให้ทุกโต๊ะว่างทั้งหมด"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>เคลียร์ว่างทุกโต๊ะ</span>
          </button>

          <button
            type="button"
            onClick={handleSetAllOccupied}
            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            title="แจ้งลูกค้าว่าโต๊ะเต็มทุกโต๊ะ"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>แจ้งโต๊ะเต็มทั้งหมด</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddCustomModal(true)}
            className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มโต๊ะพิเศษ</span>
          </button>
        </div>
      </div>

      {/* 2. Real-Time Status & Table Count Adjuster */}
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

      {/* Quick Count Presets */}
      <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200 flex flex-wrap items-center gap-1.5 text-xs">
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
                : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
            }`}
          >
            {count} โต๊ะ
          </button>
        ))}
      </div>

      {/* 3. Tables Interactive Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
            <Utensils className="w-3.5 h-3.5 text-red-600" />
            <span>แตะที่ปุ่มสถานะของแต่ละโต๊ะเพื่อสลับ "ว่าง" / "เต็ม" ได้ทันที:</span>
          </div>
          <span className="text-[11px] text-stone-400">คลิกปุ่มสถานะเปลี่ยนแบบ Real-Time</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {tables.map((table) => {
            const isFull = table.isOccupied;

            return (
              <div
                key={table.id}
                className={`rounded-2xl p-3.5 border-2 transition-all shadow-xs flex flex-col justify-between gap-3 ${
                  isFull
                    ? 'bg-rose-50/40 border-rose-300'
                    : 'bg-white border-emerald-300 hover:border-emerald-400'
                }`}
              >
                {/* Table Name & Delete for custom */}
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

                {/* Table QR & Link Button */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                  <span className="text-stone-400 font-medium">
                    {isFull ? 'งดเลือกนั่ง' : 'พร้อมสั่ง'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTableForQr(table.name.replace(/[^0-9]/g, '') || table.name);
                      setIsQrModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 font-bold text-red-600 hover:text-red-700 cursor-pointer"
                    title="สร้างลิงก์และ QR Code สำหรับโต๊ะนี้"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>ลิงก์/QR โต๊ะนี้</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Custom Table Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="font-black text-base text-stone-900">เพิ่มโต๊ะพิเศษ</h3>
              <button
                onClick={() => setShowAddCustomModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
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
                  className="flex-1 py-2.5 bg-stone-100 text-stone-700 font-bold text-xs rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  บันทึกโต๊ะใหม่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link & QR Generator Modal for Table */}
      <AdminLinkManagerModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onNotify={onNotify}
        initialTab="user"
      />
    </div>
  );
};
