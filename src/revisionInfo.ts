export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.27.1',
  revisionCode: 'rev-2.27.1',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.27.1: แก้ไข Vercel Build Error โดยเพิ่ม react-is (^19.3.1) คู่กับ recharts ใน package.json + ระบบเพิ่ม/ลบเมนูแนะนำประจำสัปดาห์ด้วยตนเอง + อัปเดตตัวช่วยส่งออกโค้ด GitHub (rev-2.27.1)',
  features: [
    '🔧 เพิ่ม "react-is": "^19.3.1" ใน package.json แก้ปัญหา Vercel Build ล้มเหลวตอนสร้างกราฟ Recharts เมื่อใช้ legacy-peer-deps=true',
    '⭐ ร้านค้าสามารถ เพิ่ม/ลบ/เลื่อนลำดับ "เมนูแนะนำประจำสัปดาห์" ได้เองในหน้าจัดการรายการอาหาร ซิงก์เรียลไทม์ไปหน้าลูกค้าทันที',
    '📦 แก้ไขรายการไฟล์อัปเดต GitHub & Patch ZIP ให้ครบทั้ง AdminSalesDashboard, AdminSalesAnalytics, CustomerAppendOrderModal และ package.json',
    '⚠️ เพิ่มคำแนะนำวิธีลดจำนวน Commit และลบโปรเจกต์ Vercel ซ้ำเพื่อไม่ให้ติด Limit 100 Deploy/วัน',
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
