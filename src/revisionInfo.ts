export interface RevisionRecord {
  version: string;
  revisionCode: string;
  buildTimestamp: string;
  formattedDateTh: string;
  description: string;
  features: string[];
}

export const CURRENT_REVISION: RevisionRecord = {
  version: '2.28.5',
  revisionCode: 'rev-2.28.5',
  buildTimestamp: new Date().toISOString(),
  formattedDateTh: new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date()),
  description: 'เวอร์ชัน 2.28.5: กดดูรูปเมนูอาหารเพื่อขยายภาพขนาดใหญ่ได้เต็มตาทั้งในเมนูหลัก แถบเมนูแนะนำ และหน้าต่างสั่งเพิ่ม พร้อมรายละเอียดราคาและปุ่มเพิ่มลงตะกร้าทันที (rev-2.28.5)',
  features: [
    '🔍 แตะรูปอาหารที่เมนูหลัก เมนูแนะนำประจำสัปดาห์ หรือหน้าต่างสั่งเพิ่ม เพื่อขยายดูภาพขนาดใหญ่แบบ Lightbox คมชัดไม่โดนครอป',
    '🛒 ในหน้าต่างขยายภาพ แสดงชื่อเมนู หมวดหมู่ ราคา และปุ่มเพิ่ม/ลดจำนวนลงตะกร้าได้ทันที พร้อมกดปิดด้วยปุ่ม X แตะพื้นหลัง หรือปุ่ม Esc',
    '🔒 ครบทุกความสามารถจาก v2.28.4 (สถานะรายเมนูเดินหน้าอย่างเดียวด้วย Transaction + อัปเดตสถานะออเดอร์หลักตามรายเมนูอัตโนมัติ + เสียงพูดแจ้งสถานะ)',
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
