import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { DailyExpenseItem, DailyExpenseRecord, MenuItem, Order } from '../types';
import {
  formatDateKeyToThai,
  normalizeOrderStatus,
  saveDailyExpenseRecord,
} from '../services/menuService';
import {
  computeOrderMenuCost,
  DailyOrdersPopupModal,
  getLocalDateKey,
  isDateKeyInRange,
} from './AdminSalesAnalytics';

interface AdminDailyExpensesManagerProps {
  orders: Order[];
  menus: MenuItem[];
  dailyExpenses: DailyExpenseRecord[];
  onNotify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const EXPENSE_PRESETS: Array<{ category: string; title: string }> = [
  { category: 'วัตถุดิบเนื้อสัตว์', title: 'ซื้อหมู / ไก่ / เนื้อโคขุน' },
  { category: 'ผักและเครื่องเคียง', title: 'ผักสลัด / มันฝรั่ง / ขนมปัง' },
  { category: 'ซอสและเครื่องปรุง', title: 'ซอสพริกไทยดำ / น้ำสลัด / เครื่องปรุง' },
  { category: 'บรรจุภัณฑ์', title: 'กล่องอาหาร / ถุงหิ้ว / ช้อนส้อม' },
  { category: 'พลังงานและสาธารณูปโภค', title: 'แก๊สหุงต้ม / ถ่าน / ค่าน้ำ-ค่าไฟ' },
  { category: 'เครื่องดื่มและน้ำแข็ง', title: 'น้ำดื่ม / น้ำอัดลม / น้ำแข็ง' },
  { category: 'ค่าแรงและอื่นๆ', title: 'ค่าแรงพนักงาน / จิปาถะ' },
];

export const AdminDailyExpensesManager: React.FC<AdminDailyExpensesManagerProps> = ({
  orders,
  menus,
  dailyExpenses,
  onNotify,
}) => {
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | '7days'>('all');
  const [pickDateKey, setPickDateKey] = useState<string>(() => getLocalDateKey(new Date().toISOString()));

  // Modal states
  const [editingDateKey, setEditingDateKey] = useState<string | null>(null);
  const [draftItems, setDraftItems] = useState<DailyExpenseItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [viewOrdersDateKey, setViewOrdersDateKey] = useState<string | null>(null);

  const { costById, costByName } = useMemo(() => {
    const idMap = new Map<string, number>();
    const nameMap = new Map<string, number>();
    menus.forEach((m) => {
      const c = Math.max(0, Number(m.cost) || 0);
      if (m.id) idMap.set(m.id, c);
      if (m.name) nameMap.set(m.name.trim(), c);
    });
    return { costById: idMap, costByName: nameMap };
  }, [menus]);

  // Unified Daily Ledger Rows (orders + expenses + today)
  const ledgerRows = useMemo(() => {
    const todayKey = getLocalDateKey(new Date().toISOString());
    const map: Record<
      string,
      {
        dateKey: string;
        thaiDate: string;
        orderCount: number;
        totalSales: number;
        menuCost: number;
        dailyExpense: number;
        expenseItems: DailyExpenseItem[];
        totalOutflow: number;
        netProfit: number;
      }
    > = {};

    const ensureRow = (dateKey: string) => {
      if (!map[dateKey]) {
        map[dateKey] = {
          dateKey,
          thaiDate: formatDateKeyToThai(dateKey),
          orderCount: 0,
          totalSales: 0,
          menuCost: 0,
          dailyExpense: 0,
          expenseItems: [],
          totalOutflow: 0,
          netProfit: 0,
        };
      }
    };

    ensureRow(todayKey);

    orders.forEach((o) => {
      const st = normalizeOrderStatus(o.status);
      if (o.isCancelled || (st !== 'ส่งแล้ว' && st !== 'เช็คบิล')) return;
      const dateKey = getLocalDateKey(o.createdAt);
      if (dateKey === 'ไม่ระบุวันที่') return;
      ensureRow(dateKey);
      map[dateKey].orderCount += 1;
      map[dateKey].totalSales += o.totalAmount || 0;
      map[dateKey].menuCost += computeOrderMenuCost(o, costById, costByName);
    });

    dailyExpenses.forEach((rec) => {
      if (!rec.dateKey) return;
      ensureRow(rec.dateKey);
      map[rec.dateKey].dailyExpense = rec.totalExpense || 0;
      map[rec.dateKey].expenseItems = rec.items || [];
    });

    return Object.values(map)
      .filter((row) => isDateKeyInRange(row.dateKey, timeFilter))
      .map((row) => {
        const totalOutflow = row.menuCost + row.dailyExpense;
        return {
          ...row,
          totalOutflow,
          netProfit: row.totalSales - totalOutflow,
        };
      })
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [orders, dailyExpenses, costById, costByName, timeFilter]);

  const totals = useMemo(() => {
    return ledgerRows.reduce(
      (acc, r) => ({
        orderCount: acc.orderCount + r.orderCount,
        totalSales: acc.totalSales + r.totalSales,
        menuCost: acc.menuCost + r.menuCost,
        dailyExpense: acc.dailyExpense + r.dailyExpense,
        totalOutflow: acc.totalOutflow + r.totalOutflow,
        netProfit: acc.netProfit + r.netProfit,
      }),
      {
        orderCount: 0,
        totalSales: 0,
        menuCost: 0,
        dailyExpense: 0,
        totalOutflow: 0,
        netProfit: 0,
      }
    );
  }, [ledgerRows]);

  const openExpenseModal = (dateKey: string) => {
    const existing = dailyExpenses.find((e) => e.dateKey === dateKey);
    if (existing && existing.items.length > 0) {
      setDraftItems(existing.items.map((it) => ({ ...it })));
    } else {
      setDraftItems([
        {
          id: `exp_${Date.now()}`,
          category: 'วัตถุดิบเนื้อสัตว์',
          title: '',
          amount: 0,
          note: '',
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    setEditingDateKey(dateKey);
  };

  const handleAddDraftRow = (preset?: { category: string; title: string }) => {
    setDraftItems((prev) => [
      ...prev,
      {
        id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        category: preset?.category || 'วัตถุดิบและอื่นๆ',
        title: preset?.title || '',
        amount: 0,
        note: '',
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleUpdateDraftItem = (
    idx: number,
    field: keyof DailyExpenseItem,
    value: string | number
  ) => {
    setDraftItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveDraftRow = (idx: number) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveExpenses = async () => {
    if (!editingDateKey) return;
    setIsSaving(true);
    try {
      await saveDailyExpenseRecord(editingDateKey, draftItems);
      onNotify(
        `บันทึกรายจ่ายประจำวันที่ ${formatDateKeyToThai(editingDateKey)} ลงฐานข้อมูลเรียบร้อย`,
        'success'
      );
      setEditingDateKey(null);
    } catch (err) {
      console.error('Save daily expenses error:', err);
      onNotify('ไม่สามารถบันทึกรายจ่ายประจำวันได้', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Export CSV (UTF-8 BOM so Thai reads cleanly in Microsoft Excel)
  const handleExportCsv = () => {
    const header = [
      'รหัสวันที่',
      'วันที่ (พ.ศ.)',
      'จำนวนบิล',
      'ยอดขายรวม (บาท)',
      'ต้นทุนเมนูรวม (บาท)',
      'รายจ่ายประจำวัน (บาท)',
      'รวมต้นทุน+รายจ่าย (บาท)',
      'กำไรสุทธิ (บาท)',
      'รายการรายจ่าย',
    ];

    const lines = ledgerRows.map((r) => {
      const itemsSummary = r.expenseItems
        .map((it) => `${it.title}(${it.amount})`)
        .join('; ')
        .replace(/"/g, '""');
      return [
        r.dateKey,
        `"${r.thaiDate}"`,
        r.orderCount,
        r.totalSales,
        r.menuCost,
        r.dailyExpense,
        r.totalOutflow,
        r.netProfit,
        `"${itemsSummary}"`,
      ].join(',');
    });

    const summaryLine = [
      'รวมทั้งหมด',
      '-',
      totals.orderCount,
      totals.totalSales,
      totals.menuCost,
      totals.dailyExpense,
      totals.totalOutflow,
      totals.netProfit,
      '',
    ].join(',');

    const csvContent = '\uFEFF' + [header.join(','), ...lines, summaryLine].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `baan-steak-profit-expenses-${getLocalDateKey(new Date().toISOString())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    onNotify('ส่งออกตารางรายรับ-รายจ่าย Excel (.csv) เรียบร้อย', 'success');
  };

  // Live metrics inside editing modal
  const editingRowSummary = useMemo(() => {
    if (!editingDateKey) return { sales: 0, menuCost: 0 };
    const existingRow = ledgerRows.find((r) => r.dateKey === editingDateKey);
    return {
      sales: existingRow?.totalSales || 0,
      menuCost: existingRow?.menuCost || 0,
    };
  }, [editingDateKey, ledgerRows]);

  const draftExpenseSum = useMemo(
    () => draftItems.reduce((sum, it) => sum + Math.max(0, Number(it.amount) || 0), 0),
    [draftItems]
  );

  const draftModalProfit =
    editingRowSummary.sales - (editingRowSummary.menuCost + draftExpenseSum);

  return (
    <div className="space-y-4 text-stone-900 max-w-4xl mx-auto">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
              <span>สรุปรายจ่ายประจำวัน & กำไร (ตาราง Excel)</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              สูตรคำนวณ: <strong className="text-stone-800">กำไร = ยอดขายรวม - (ต้นทุนเมนูรวม + รายจ่ายประจำวัน)</strong> • คลิกวันที่เพื่อบันทึกรายจ่าย
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-[#107C41] hover:bg-[#0c6132] text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>ส่งออกไฟล์ Excel (.csv)</span>
          </button>
        </div>

        {/* Date Picker + Time Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-stone-100">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={pickDateKey}
              onChange={(e) => setPickDateKey(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono border border-stone-300 rounded-xl bg-stone-50 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <button
              type="button"
              onClick={() => pickDateKey && openExpenseModal(pickDateKey)}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ลงรายจ่ายวันที่เลือก</span>
            </button>
          </div>

          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl self-start sm:self-auto">
            {(
              [
                { id: '7days', label: '7 วันล่าสุด' },
                { id: 'month', label: 'เดือนนี้' },
                { id: 'all', label: 'ทั้งหมด' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeFilter(t.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  timeFilter === t.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Excel-Style Spreadsheet Ledger Table */}
      <div className="bg-white rounded-2xl border border-stone-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              {/* Excel Column Letters Row */}
              <tr className="bg-stone-200 text-stone-600 font-mono text-[10px] text-center border-b border-stone-300">
                <th className="py-1 px-2 border-r border-stone-300 w-9"></th>
                <th className="py-1 px-2 border-r border-stone-300">A</th>
                <th className="py-1 px-2 border-r border-stone-300">B</th>
                <th className="py-1 px-2 border-r border-stone-300">C</th>
                <th className="py-1 px-2 border-r border-stone-300">D</th>
                <th className="py-1 px-2 border-r border-stone-300">E</th>
                <th className="py-1 px-2 border-r border-stone-300">F = D + E</th>
                <th className="py-1 px-2 border-r border-stone-300">G = C - F</th>
                <th className="py-1 px-2">H</th>
              </tr>
              {/* Excel Field Titles Row */}
              <tr className="bg-[#107C41] text-white text-left whitespace-nowrap">
                <th className="py-2.5 px-2 text-center font-mono border-r border-emerald-800">#</th>
                <th className="py-2.5 px-3 font-bold border-r border-emerald-800">
                  วันที่ (คลิกเพื่อเพิ่มรายจ่าย)
                </th>
                <th className="py-2.5 px-2.5 font-bold text-center border-r border-emerald-800">
                  บิล
                </th>
                <th className="py-2.5 px-3 font-bold text-right border-r border-emerald-800">
                  ยอดขายรวม
                </th>
                <th className="py-2.5 px-3 font-bold text-right border-r border-emerald-800">
                  ต้นทุนเมนู
                </th>
                <th className="py-2.5 px-3 font-bold text-right border-r border-emerald-800">
                  รายจ่ายประจำวัน
                </th>
                <th className="py-2.5 px-3 font-bold text-right border-r border-emerald-800">
                  ต้นทุน+รายจ่าย
                </th>
                <th className="py-2.5 px-3 font-bold text-right border-r border-emerald-800">
                  กำไรสุทธิ
                </th>
                <th className="py-2.5 px-2.5 font-bold text-center">คำสั่ง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-300">
              {ledgerRows.map((row, index) => (
                <tr
                  key={row.dateKey}
                  className="hover:bg-emerald-50/50 transition"
                >
                  <td className="py-2 px-2 text-center font-mono text-[11px] text-stone-500 bg-stone-100 border-r border-stone-300">
                    {index + 1}
                  </td>
                  {/* A: Clickable Date -> Open Expense Popup Modal */}
                  <td className="py-2 px-3 border-r border-stone-300 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openExpenseModal(row.dateKey)}
                      className="font-mono tabular-nums font-bold text-emerald-800 hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{row.thaiDate}</span>
                    </button>
                  </td>
                  {/* B: Bill Count -> Clickable to view orders */}
                  <td className="py-2 px-2.5 text-center border-r border-stone-300 font-mono tabular-nums">
                    <button
                      type="button"
                      onClick={() => setViewOrdersDateKey(row.dateKey)}
                      className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 font-bold text-stone-800 cursor-pointer"
                      title="คลิกดูออเดอร์ของวันนี้"
                    >
                      {row.orderCount}
                    </button>
                  </td>
                  {/* C: Total Sales */}
                  <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-emerald-700 border-r border-stone-300">
                    {row.totalSales.toLocaleString()}
                  </td>
                  {/* D: Menu Cost */}
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-stone-700 border-r border-stone-300">
                    {row.menuCost.toLocaleString()}
                  </td>
                  {/* E: Daily Expense */}
                  <td className="py-2 px-3 text-right font-mono tabular-nums border-r border-stone-300">
                    <button
                      type="button"
                      onClick={() => openExpenseModal(row.dateKey)}
                      className="font-bold text-amber-700 hover:underline cursor-pointer"
                    >
                      {row.dailyExpense.toLocaleString()}
                      {row.expenseItems.length > 0 && (
                        <span className="text-[10px] font-normal text-stone-400 ml-1">
                          ({row.expenseItems.length})
                        </span>
                      )}
                    </button>
                  </td>
                  {/* F: Total Outflow */}
                  <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-stone-800 border-r border-stone-300 bg-stone-50/70">
                    {row.totalOutflow.toLocaleString()}
                  </td>
                  {/* G: Net Profit */}
                  <td
                    className={`py-2 px-3 text-right font-mono tabular-nums font-black border-r border-stone-300 ${
                      row.netProfit >= 0
                        ? 'text-blue-700 bg-blue-50/40'
                        : 'text-rose-600 bg-rose-50/60'
                    }`}
                  >
                    {row.netProfit >= 0 ? '+' : ''}
                    {row.netProfit.toLocaleString()}
                  </td>
                  {/* H: Actions */}
                  <td className="py-1.5 px-2 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openExpenseModal(row.dateKey)}
                        className="px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold cursor-pointer"
                      >
                        ลงรายจ่าย
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewOrdersDateKey(row.dateKey)}
                        className="p-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                        title="ดูรายการบิลของวันนี้"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-stone-100 border-t-2 border-stone-400 font-black text-xs">
                <td className="py-2.5 px-2 text-center font-mono text-stone-500 border-r border-stone-300">
                  Σ
                </td>
                <td className="py-2.5 px-3 text-stone-900 border-r border-stone-300">
                  SUM รวม ({ledgerRows.length} วัน)
                </td>
                <td className="py-2.5 px-2.5 text-center font-mono tabular-nums text-stone-900 border-r border-stone-300">
                  {totals.orderCount}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 border-r border-stone-300">
                  ฿{totals.totalSales.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-stone-700 border-r border-stone-300">
                  ฿{totals.menuCost.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-700 border-r border-stone-300">
                  ฿{totals.dailyExpense.toLocaleString()}
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-stone-900 border-r border-stone-300">
                  ฿{totals.totalOutflow.toLocaleString()}
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-mono tabular-nums ${
                    totals.netProfit >= 0 ? 'text-blue-700' : 'text-rose-600'
                  } border-r border-stone-300`}
                >
                  {totals.netProfit >= 0 ? '+' : ''}฿{totals.netProfit.toLocaleString()}
                </td>
                <td className="py-2.5 px-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* EXCEL-STYLE EXPENSE POPUP MODAL FOR SELECTED DATE */}
      {editingDateKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-[#107C41] text-white flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-200 shrink-0" />
                  <span>บันทึกรายจ่ายประจำวันที่ {formatDateKeyToThai(editingDateKey)}</span>
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5 font-mono">
                  รหัสวันที่ {editingDateKey} • กรอกรายการแบบตาราง Excel แล้วกดบันทึก
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDateKey(null)}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Formula Preview Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-3 bg-stone-50 border-b border-stone-200 text-xs">
              <div className="bg-white px-3 py-2 rounded-xl border border-stone-200">
                <div className="text-stone-500 font-semibold">ยอดขายวันนี้</div>
                <div className="text-sm font-black text-emerald-700 font-mono tabular-nums mt-0.5">
                  ฿{editingRowSummary.sales.toLocaleString()}
                </div>
              </div>
              <div className="bg-white px-3 py-2 rounded-xl border border-stone-200">
                <div className="text-stone-500 font-semibold">ต้นทุนเมนูวันนี้</div>
                <div className="text-sm font-black text-stone-800 font-mono tabular-nums mt-0.5">
                  ฿{editingRowSummary.menuCost.toLocaleString()}
                </div>
              </div>
              <div className="bg-white px-3 py-2 rounded-xl border border-stone-200">
                <div className="text-stone-500 font-semibold">รายจ่ายประจำวัน</div>
                <div className="text-sm font-black text-amber-700 font-mono tabular-nums mt-0.5">
                  ฿{draftExpenseSum.toLocaleString()}
                </div>
              </div>
              <div className="bg-white px-3 py-2 rounded-xl border border-stone-200">
                <div className="text-stone-500 font-semibold">กำไรสุทธิวันนี้</div>
                <div
                  className={`text-sm font-black font-mono tabular-nums mt-0.5 ${
                    draftModalProfit >= 0 ? 'text-blue-700' : 'text-rose-600'
                  }`}
                >
                  {draftModalProfit >= 0 ? '+' : ''}฿{draftModalProfit.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="px-5 py-2.5 bg-white border-b border-stone-200 flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] font-bold text-stone-500 shrink-0 mr-1">
                เพิ่มรายการด่วน:
              </span>
              {EXPENSE_PRESETS.map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => handleAddDraftRow(preset)}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 text-[11px] font-semibold whitespace-nowrap cursor-pointer transition"
                >
                  + {preset.title}
                </button>
              ))}
            </div>

            {/* Editable Excel Grid */}
            <div className="flex-1 overflow-auto p-4 sm:p-5">
              <div className="border border-stone-300 rounded-xl overflow-hidden">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-100 border-b border-stone-300 text-stone-700 font-bold text-left">
                      <th className="py-2 px-2 text-center border-r border-stone-300 w-9">#</th>
                      <th className="py-2 px-2.5 border-r border-stone-300 w-36">หมวดหมู่</th>
                      <th className="py-2 px-2.5 border-r border-stone-300">รายการรายจ่าย</th>
                      <th className="py-2 px-2.5 border-r border-stone-300 text-right w-32">
                        จำนวนเงิน (บ.)
                      </th>
                      <th className="py-2 px-2.5 border-r border-stone-300 w-36">หมายเหตุ</th>
                      <th className="py-2 px-2 text-center w-12">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {draftItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-stone-400">
                          ยังไม่มีรายการ กดปุ่ม "+ เพิ่มแถวรายการ" ด้านล่างเพื่อเริ่มกรอก
                        </td>
                      </tr>
                    ) : (
                      draftItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-stone-50">
                          <td className="py-1.5 px-2 text-center font-mono text-stone-400 border-r border-stone-200 bg-stone-50">
                            {idx + 1}
                          </td>
                          <td className="p-1 border-r border-stone-200">
                            <input
                              type="text"
                              value={item.category}
                              onChange={(e) =>
                                handleUpdateDraftItem(idx, 'category', e.target.value)
                              }
                              placeholder="หมวดหมู่"
                              className="w-full px-2 py-1.5 text-xs bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 rounded"
                            />
                          </td>
                          <td className="p-1 border-r border-stone-200">
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => handleUpdateDraftItem(idx, 'title', e.target.value)}
                              placeholder="เช่น ซื้อเนื้อหมู / ค่าน้ำมัน / แก๊ส..."
                              className="w-full px-2 py-1.5 text-xs font-semibold bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 rounded"
                            />
                          </td>
                          <td className="p-1 border-r border-stone-200">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.amount || ''}
                              onChange={(e) =>
                                handleUpdateDraftItem(
                                  idx,
                                  'amount',
                                  Math.max(0, Number(e.target.value) || 0)
                                )
                              }
                              placeholder="0"
                              className="w-full px-2 py-1.5 text-xs text-right font-mono tabular-nums font-bold bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 rounded"
                            />
                          </td>
                          <td className="p-1 border-r border-stone-200">
                            <input
                              type="text"
                              value={item.note || ''}
                              onChange={(e) => handleUpdateDraftItem(idx, 'note', e.target.value)}
                              placeholder="หมายเหตุ"
                              className="w-full px-2 py-1.5 text-xs text-stone-600 bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 rounded"
                            />
                          </td>
                          <td className="p-1 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveDraftRow(idx)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="ลบแถว"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50 border-t-2 border-stone-300 font-black">
                      <td colSpan={3} className="py-2.5 px-3 text-right text-stone-800 border-r border-stone-300">
                        รวมรายจ่ายประจำวันทั้งหมด:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-800 border-r border-stone-300">
                        ฿{draftExpenseSum.toLocaleString()}
                      </td>
                      <td colSpan={2} className="py-2.5 px-3 text-stone-500 font-normal text-[11px]">
                        {draftItems.length} แถว
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <button
                type="button"
                onClick={() => handleAddDraftRow()}
                className="mt-3 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>เพิ่มแถวรายการ</span>
              </button>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
              <span className="text-xs text-stone-500 hidden sm:inline">
                กำไร = ยอดขาย ({editingRowSummary.sales.toLocaleString()}) - (ต้นทุน{' '}
                {editingRowSummary.menuCost.toLocaleString()} + รายจ่าย{' '}
                {draftExpenseSum.toLocaleString()}) ={' '}
                <strong className={draftModalProfit >= 0 ? 'text-blue-700' : 'text-rose-600'}>
                  ฿{draftModalProfit.toLocaleString()}
                </strong>
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setEditingDateKey(null)}
                  className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs rounded-xl cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveExpenses}
                  className="px-5 py-2 bg-[#107C41] hover:bg-[#0c6132] disabled:bg-stone-400 text-white font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>บันทึกลงฐานข้อมูล</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders Popup Modal for selected date */}
      <DailyOrdersPopupModal
        dateKey={viewOrdersDateKey}
        orders={orders}
        menus={menus}
        dailyExpenses={dailyExpenses}
        onClose={() => setViewOrdersDateKey(null)}
      />
    </div>
  );
};
