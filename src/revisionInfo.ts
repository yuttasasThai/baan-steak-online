export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.28.9',
  revisionCode: 'rev-2.28.9',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.28.9: แก้ไขบั๊กเมนูเก่าปิดสถานะของหมดไม่ได้ (Auto-repair orderIndex/schema + ป้องกันการแตะซ้ำ) และแยกหมวดหมู่อาหาร "สปาเก็ตตี้" อัตโนมัติทั้งฝั่งร้านและลูกค้า (rev-2.28.9)',
  features: [
    '🛠️ ซ่อมแซมข้อมูลเมนูอัตโนมัติ (orderIndex < 0 / ฟิลด์เก่าที่ไม่ครบ / ล็อกกันแตะซ้ำ) เพื่อให้ทุกเมนูเปิด-ปิดสถานะของหมดได้ทันที',
    '🍝 แยกหมวดหมู่ "สปาเก็ตตี้" อัตโนมัติ (สเต็ก -> สปาเก็ตตี้ -> สลัด -> ของทานเล่น -> เครื่องดื่ม) พร้อมปุ่มย้ายเมนูสปาเก็ตตี้เข้าหมวดในคลิกเดียว',
    '🚫⏱️ ครบทุกฟีเจอร์ยกเลิกเฉพาะจานและระบบเวลาความเร็วครัว SLA จาก v2.28.8',
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
