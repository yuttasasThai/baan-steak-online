import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Save, Search, Utensils } from 'lucide-react';
import { MenuItem } from '../types';
import { sortMenus, updateMenuItem } from '../services/menuService';

interface AdminMenuCostManagerProps {
  menus: MenuItem[];
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminMenuCostManager: React.FC<AdminMenuCostManagerProps> = ({ menus, onNotify }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [draftCosts, setDraftCosts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);

  const sortedMenus = useMemo(() => sortMenus(menus), [menus]);

  useEffect(() => {
    setDraftCosts((prev) => {
      const next: Record<string, string> = {};
      menus.forEach((m) => {
        if (prev[m.id] !== undefined) {
          next[m.id] = prev[m.id];
        } else {
          next[m.id] = m.cost !== undefined && m.cost !== null ? String(m.cost) : '0';
        }
      });
      return next;
    });
  }, [menus]);

  const categories = useMemo(() => {
    const set = new Set<string>(['ทั้งหมด']);
    sortedMenus.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [sortedMenus]);

  const filteredMenus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortedMenus.filter((m) => {
      const matchCat = selectedCategory === 'ทั้งหมด' || m.category === selectedCategory;
      const matchSearch =
        !q || m.name.toLowerCase().includes(q) || (m.category || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [sortedMenus, selectedCategory, searchQuery]);

  const dirtyMenus = useMemo(() => {
    return menus.filter((m) => {
      const draftVal = Math.max(0, Number(draftCosts[m.id]) || 0);
      const savedVal = Math.max(0, Number(m.cost) || 0);
      return draftVal !== savedVal;
    });
  }, [menus, draftCosts]);

  const summaryStats = useMemo(() => {
    const totalCount = menus.length;
    const configuredCount = menus.filter((m) => (Number(draftCosts[m.id]) || 0) > 0).length;
    const margins = menus
      .filter((m) => m.price > 0 && (Number(draftCosts[m.id]) || 0) > 0)
      .map((m) => {
        const c = Math.max(0, Number(draftCosts[m.id]) || 0);
        return ((m.price - c) / m.price) * 100;
      });
    const avgMargin =
      margins.length > 0 ? Math.round(margins.reduce((s, v) => s + v, 0) / margins.length) : 0;

    return { totalCount, configuredCount, avgMargin };
  }, [menus, draftCosts]);

  const handleSaveSingle = async (menu: MenuItem) => {
    const numericCost = Math.max(0, Number(draftCosts[menu.id]) || 0);
    setSavingId(menu.id);
    try {
      await updateMenuItem(menu.id, { cost: numericCost });
      setDraftCosts((prev) => ({ ...prev, [menu.id]: String(numericCost) }));
      onNotify(`บันทึกต้นทุนเมนู "${menu.name}" (฿${numericCost.toLocaleString()}) เรียบร้อย`, 'success');
    } catch (err) {
      console.error('Save menu cost error:', err);
      onNotify(`ไม่สามารถบันทึกต้นทุน "${menu.name}" ได้`, 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAllDirty = async () => {
    if (dirtyMenus.length === 0) return;
    setIsSavingAll(true);
    try {
      await Promise.all(
        dirtyMenus.map((m) => {
          const numericCost = Math.max(0, Number(draftCosts[m.id]) || 0);
          return updateMenuItem(m.id, { cost: numericCost });
        })
      );
      onNotify(`บันทึกต้นทุนที่แก้ไขทั้งหมด ${dirtyMenus.length} เมนูเรียบร้อยแล้ว`, 'success');
    } catch (err) {
      console.error('Batch save menu costs error:', err);
      onNotify('เกิดข้อผิดพลาดในการบันทึกต้นทุนทั้งหมด', 'error');
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <div className="space-y-4 text-stone-900 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-red-600" />
            <span>บันทึกต้นทุนของแต่ละเมนู</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            ระบุต้นทุนวัตถุดิบต่อจาน เพื่อใช้คำนวณกำไรสุทธิในหน้าวิเคราะห์ยอดขายและตาราง Excel รายวัน
          </p>
        </div>

        <button
          type="button"
          disabled={dirtyMenus.length === 0 || isSavingAll}
          onClick={handleSaveAllDirty}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition whitespace-nowrap shrink-0 cursor-pointer ${
            dirtyMenus.length > 0
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              : 'bg-stone-100 text-stone-400 cursor-not-allowed'
          }`}
        >
          {isSavingAll ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>
            {dirtyMenus.length > 0
              ? `บันทึกทั้งหมด (${dirtyMenus.length} รายการที่แก้ไข)`
              : 'บันทึกข้อมูลล่าสุดแล้ว'}
          </span>
        </button>
      </div>

      {/* Summary & Search Controls */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
            <div className="text-stone-500 font-semibold">จำนวนเมนูทั้งหมด</div>
            <div className="text-lg font-black text-stone-900 font-mono tabular-nums mt-0.5">
              {summaryStats.totalCount} เมนู
            </div>
          </div>
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
            <div className="text-stone-500 font-semibold">บันทึกต้นทุนแล้ว</div>
            <div className="text-lg font-black text-emerald-700 font-mono tabular-nums mt-0.5">
              {summaryStats.configuredCount} / {summaryStats.totalCount}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
            <div className="text-stone-500 font-semibold">อัตรากำไรขั้นต้นเฉลี่ย</div>
            <div className="text-lg font-black text-blue-700 font-mono tabular-nums mt-0.5">
              {summaryStats.avgMargin}%
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อเมนู หรือหมวดหมู่..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                  selectedCategory === cat
                    ? 'bg-red-600 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cost Spreadsheet Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-stone-900 text-white text-left">
                <th className="py-3 px-3 font-bold border-r border-stone-700 w-10 text-center">#</th>
                <th className="py-3 px-3 font-bold border-r border-stone-700">ชื่อเมนูอาหาร</th>
                <th className="py-3 px-3 font-bold border-r border-stone-700">หมวดหมู่</th>
                <th className="py-3 px-3 font-bold border-r border-stone-700 text-right">
                  ราคาขาย (บ.)
                </th>
                <th className="py-3 px-3 font-bold border-r border-stone-700 text-right w-36">
                  ต้นทุน/จาน (บ.)
                </th>
                <th className="py-3 px-3 font-bold border-r border-stone-700 text-right">
                  กำไร/จาน
                </th>
                <th className="py-3 px-3 font-bold border-r border-stone-700 text-right">
                  % กำไร
                </th>
                <th className="py-3 px-3 font-bold text-center w-28">บันทึก</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredMenus.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-stone-400">
                    ไม่พบรายการเมนูที่ค้นหา
                  </td>
                </tr>
              ) : (
                filteredMenus.map((menu, index) => {
                  const rawDraft = draftCosts[menu.id] ?? '0';
                  const numericCost = Math.max(0, Number(rawDraft) || 0);
                  const savedCost = Math.max(0, Number(menu.cost) || 0);
                  const isDirty = numericCost !== savedCost;
                  const profitPerUnit = menu.price - numericCost;
                  const marginPct =
                    menu.price > 0 ? Math.round((profitPerUnit / menu.price) * 100) : 0;

                  return (
                    <tr
                      key={menu.id}
                      className={`transition ${
                        isDirty ? 'bg-amber-50/70' : 'hover:bg-stone-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-mono text-stone-400 border-r border-stone-200">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-stone-900 border-r border-stone-200">
                        {menu.name}
                      </td>
                      <td className="py-2.5 px-3 text-stone-600 border-r border-stone-200 whitespace-nowrap">
                        {menu.category}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-stone-900 border-r border-stone-200">
                        ฿{menu.price.toLocaleString()}
                      </td>
                      <td className="py-2 px-2.5 border-r border-stone-200">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={rawDraft}
                          onChange={(e) =>
                            setDraftCosts((prev) => ({ ...prev, [menu.id]: e.target.value }))
                          }
                          className={`w-full px-2.5 py-1.5 text-right font-mono tabular-nums font-bold rounded-lg border focus:outline-none focus:ring-2 focus:ring-red-500 ${
                            isDirty
                              ? 'bg-white border-amber-400 text-amber-900'
                              : 'bg-stone-50 border-stone-300 text-stone-900'
                          }`}
                        />
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono tabular-nums font-black border-r border-stone-200 ${
                          profitPerUnit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        ฿{profitPerUnit.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-blue-700 border-r border-stone-200">
                        {marginPct}%
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        <button
                          type="button"
                          disabled={!isDirty || savingId === menu.id}
                          onClick={() => handleSaveSingle(menu)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer ${
                            isDirty
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-stone-100 text-stone-400 cursor-default'
                          }`}
                        >
                          {savingId === menu.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isDirty ? (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              <span>บันทึก</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">บันทึกแล้ว</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
