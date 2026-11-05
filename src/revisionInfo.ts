export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.9.0',
  revisionCode: 'rev-2.9.0',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.9.0: หน้าต่างออเดอร์เข้าใหม่เด้งขึ้นกลางจอ + เสียงพูดเตือนซ้ำ "มีออเดอร์เข้า โต๊ะ..." วนต่อเนื่องจนกว่าจะกดรับออเดอร์',
  features: [
    'หน้าต่างใหม่เด้งขึ้นมากลางจอทันทีเมื่อมีออเดอร์เข้า (Incoming Order Modal) ชัดเจน โดดเด่น มองเห็นทันที',
    'เสียงพูดจริงภาษาไทย "มีออเดอร์เข้า โต๊ะ..." เตือนซ้ำวนเรื่อยๆ ทุก 6 วินาที จนกว่าจะกดรับออเดอร์',
    'กรณีมีออเดอร์เข้าค้างรับ (Pending Orders) ระบบจะแสดงหน้าต่างและเตือนซ้ำต่อเนื่องจนกว่าจะกดรับทุกรายการ',
    'ปุ่มขนาดใหญ่ "✅ กดรับออเดอร์ทันที (เริ่มทำอาหาร)" พร้อมเปลี่ยนสถานะเป็น "กำลังทำ" และหยุดเสียงเตือนทันที',
    'ปุ่ม "รับทั้งหมด" เมื่อมีออเดอร์เข้าหลายรายการพร้อมกัน และแถบแจ้งเตือนค้างรับด้านบนหากมีการย่อหน้าต่าง',
    'แสดงสถานะโต๊ะอาหารว่าง/เต็มแบบเรียลไทม์ใต้ปุ่มร้านเปิด/ร้านปิด',
    'สแกน QR Code ประจำโต๊ะอาหาร ไม่ต้องกรอกเบอร์โทร ส่งเข้าห้องครัวได้ทันที',
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
