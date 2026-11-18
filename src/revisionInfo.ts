export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.28.4',
  revisionCode: 'rev-2.28.4',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.28.4: ล็อกสถานะแต่ละรายการอาหารด้วย Firestore Transaction ห้ามย้อนกลับแม้กดรัวหรือหลายเครื่อง และอัปเดตสถานะออเดอร์หลักตามแต่ละรายการแบบเรียลไทม์ (rev-2.28.4)',
  features: [
    '🔒 สถานะแต่ละรายการอาหารเดินหน้าอย่างเดียว (รอทำ → กำลังทำ → พร้อมเสิร์ฟ → เสิร์ฟแล้ว) พร้อม Firestore Transaction ป้องกันการเขียนทับย้อนกลับ',
    '⚡ อัปเดตสถานะออเดอร์หลักตามแต่ละรายการทันที: เริ่มทำเพียง 1 เมนู → "กำลังทำ", พร้อมเสิร์ฟครบ → "ส่งออเดอร์", เสิร์ฟครบทุกรายการ → "ส่งแล้ว"',
    '🔊 ครบทุกความสามารถจาก v2.28.3 (เสียงพูดแจ้งสถานะแยกรายเมนู + เช็คบิลคีย์เพิ่ม/แก้ยอดได้ + แผงโต๊ะเรียลไทม์ + หน้า Admin พอดีจอมือถือ)',
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
