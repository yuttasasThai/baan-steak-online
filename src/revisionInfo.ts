export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.28.2',
  revisionCode: 'rev-2.28.2',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.28.2: เพิ่มเสียงพูดแจ้งสถานะแยกทีละรายการอาหารเมื่อกดอัปเดตสถานะในออเดอร์ที่มีหลายเมนู พร้อมแจ้งความคืบหน้าคงเหลือ/ครบทุกรายการ (rev-2.28.2)',
  features: [
    '🔊 เมื่อกดอัปเดตสถานะของแต่ละเมนูในออเดอร์ (รอทำ/กำลังทำ/พร้อมเสิร์ฟ/เสิร์ฟแล้ว) ระบบจะส่งเสียงติ๊งพร้อมเสียงพูดบอกชื่อโต๊ะ ชื่อเมนู และสถานะทันที',
    '✅ หากเป็นออเดอร์หลายเมนูและกดเสิร์ฟแล้ว ระบบจะบอกจำนวนที่เหลือหรือแจ้งว่า "ครบทั้ง X รายการแล้ว" รวมถึงเสียงแจ้งเมื่อกดปุ่ม "ติ๊กครบทุกรายการ"',
    '📱 ครบทุกการปรับปรุงจาก v2.28.1 (แก้ช่องรวมยอดเช็คบิลล้นจอ + หน้า Admin พอดีจอมือถือ + แผงโต๊ะเรียลไทม์ + ซ่อนรายการ/ยอดหน้าติดตามลูกค้า)',
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
