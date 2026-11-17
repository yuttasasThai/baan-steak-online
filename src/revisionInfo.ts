export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.28.0',
  revisionCode: 'rev-2.28.0',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.28.0: ปรับปรุงหน้าติดตามสถานะลูกค้าไม่แสดงเมนู/ยอดเงินและล้างอัตโนมัติทุกวันใหม่ + แก้หน้า Admin ล้นจอมือถือ + ปุ่มสถานะวงกลมอัปเดตรายเมนู + หน้าต่าง Popup เช็คบิลคีย์เพิ่ม/แก้ยอดได้ + แผงสถานะโต๊ะเรียลไทม์หน้า Admin (rev-2.28.0)',
  features: [
    '🔒 หน้าติดตามสถานะลูกค้าแบบเรียลไทม์ซ่อนรายการเมนูและยอดเงิน พร้อมเคลียร์รายการค้างอัตโนมัติเมื่อขึ้นวันใหม่ (00:00 น.)',
    '📱 แก้ปัญหาหน้า Admin ล้นขอบจอมือถือ (Overflow) ให้พอดีทุกหน้าจอทั้งแนวตั้งและแนวนอน',
    '💰 หน้าต่าง Popup เช็คบิลแยกเฉพาะ สรุปรายการอาหาร คีย์เพิ่มเมนู ปรับจำนวน และแก้ไขยอดเงินรวมสุทธิล่าสุดได้ก่อนปิดบิล',
    '🍽️ แผงสถานะโต๊ะเรียลไทม์บนหน้าหลัก Admin แตะโต๊ะเพื่อดู/เพิ่มเมนู/อัปเดตสถานะออเดอร์รายรายการ หรือเปิดบิลโต๊ะได้ทันที',
    '🎯 ไอคอนสถานะออเดอร์วงกลมทรงทันสมัย พร้อม Popup อัปเดตสถานะแต่ละรายการอาหารและแถบภาพรวมว่าได้รับครบทุกรายการหรือยัง',
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
