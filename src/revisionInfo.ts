export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.27.0',
  revisionCode: 'rev-2.27.0',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.27.0: เพิ่มระบบให้ร้านค้าเลือก เพิ่ม/ลบ/จัดลำดับ "เมนูแนะนำประจำสัปดาห์" ได้เอง + แก้ไขรายการไฟล์อัปเดต GitHub & Patch ZIP ให้ครบทุกไฟล์ (รวม AdminSalesDashboard, AdminSalesAnalytics, CustomerAppendOrderModal และ package.json)',
  features: [
    '⭐ ร้านค้าสามารถ เพิ่ม/ลบ/เลื่อนลำดับ "เมนูแนะนำประจำสัปดาห์" ได้เองในหน้าจัดการรายการอาหาร ซิงก์เรียลไทม์ไปหน้าลูกค้าทันที',
    '📦 แก้ไขรายการไฟล์อัปเดต GitHub & Patch ZIP ให้รวม AdminSalesDashboard.tsx, AdminSalesAnalytics.tsx, CustomerAppendOrderModal.tsx และ package.json (recharts) ครบถ้วน ไม่มีไฟล์ซ้ำ',
    '📊 หน้าวิเคราะห์ยอดขายแสดงการ์ดสรุป รายวัน/สัปดาห์/เดือน พร้อมกราฟเส้น Recharts และตาราง Excel Popup ครบสมบูรณ์',
    '🔎 คงระบบ Forensic Log ใน subscribeMenus และระบบป้องกันเมนูตัวอย่างเดิมแทรกซ้ำถาวร',
  ],
};

export function getRevisionFileName(revCode = CURRENT_REVISION.revisionCode): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeStamp = `${year}${month}${day}-${hours}${minutes}`;

  const cleanRev = revCode.replace(/[^a-zA-Z0-9.-]/g, '');
  return `baan-steak-source-${cleanRev}-${timeStamp}.zip`;
}
