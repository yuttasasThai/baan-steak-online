export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.28.3',
  revisionCode: 'rev-2.28.3',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.28.3: ล็อกสถานะแต่ละรายการอาหารให้อัปเดตไปข้างหน้าอย่างเดียว (ไม่ย้อนกลับ) และขยับสถานะออเดอร์หลักให้อัตโนมัติเมื่อทุกรายการคืบหน้าหรือเสิร์ฟครบ (rev-2.28.3)',
  features: [
    '🔒 สถานะแต่ละรายการอาหาร (รอทำ → กำลังทำ → พร้อมเสิร์ฟ → เสิร์ฟแล้ว) อัปเดตเดินหน้าได้อย่างเดียว ป้องกันการกดย้อนกลับโดยไม่ตั้งใจ',
    '⚡ เมื่ออัปเดตสถานะทุกรายการอาหารครบตามขั้นตอน (กำลังทำ / พร้อมเสิร์ฟ / เสิร์ฟแล้ว) สถานะออเดอร์หลักจะขยับตามให้อัตโนมัติทันที',
    '🔊 ครบทุกความสามารถจาก v2.28.2 (เสียงพูดแจ้งสถานะแยกรายเมนู + เช็คบิลคีย์เพิ่ม/แก้ยอดได้ + แผงโต๊ะเรียลไทม์ + หน้า Admin พอดีจอมือถือ)',
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
